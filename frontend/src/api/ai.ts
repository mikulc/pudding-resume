/**
 * AI service API client.
 * Covers AI generation, diagnosis, model listing and public model pools.
 */
import { api, apiAssetUrl, getAuthToken } from '../utils/api';
import { assertAIConfig, getAIConfig, type AIConfigValidationOptions } from '../utils/aiConfig';
import i18n from '../utils/i18n';
import type { ResumeData, DiagnosisItem, AtsAnalysisResult } from '../types/resume';
import type { PublicModelListResponse } from '../types/auth';

/** Read the current effective AI config and merge it into AI requests. */
function withAIConfig(
  body: Record<string, unknown>,
  options: AIConfigValidationOptions = {},
): Record<string, unknown> {
  const config = getAIConfig();
  assertAIConfig(config, options);

  if (config.modelSource === 'custom') {
    return {
      ...body,
      api_url: config.baseUrl,
      api_key: config.apiKey,
      model: config.modelName,
      model_source: 'custom',
    };
  }

  return {
    ...body,
    model_source: 'public',
    public_model_id: config.publicModelId,
  };
}

/** AI service: POST /api/ai/service with optional guest AI config */
export function aiService(prompt: string): Promise<{ resume_data: ResumeData }> {
  const body = withAIConfig({ prompt });
  return api.post('/api/ai/service', body);
}

/** Translate the full resume JSON into English without saving it server-side. */
export interface TranslationStreamEvent {
  type: 'progress' | 'result' | 'error';
  stage?: 'request' | 'streaming' | 'validate' | 'complete' | 'error';
  message?: string;
  progress?: number;
  received_chars?: number;
  resume_data?: ResumeData;
}

export interface TranslationStreamCallbacks {
  onProgress?: (event: TranslationStreamEvent) => void;
}

function parseSSEBlock(block: string): TranslationStreamEvent | null {
  let eventType = 'message';
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    const event = JSON.parse(dataLines.join('\n')) as TranslationStreamEvent;
    return {
      ...event,
      type: (event.type || eventType) as TranslationStreamEvent['type'],
    };
  } catch {
    return null;
  }
}

export async function translateResumeToEnglish(
  resumeData: ResumeData,
  callbacks: TranslationStreamCallbacks = {},
  signal?: AbortSignal,
): Promise<{ resume_data: ResumeData }> {
  const body = withAIConfig({ resume_data: resumeData });
  const url = apiAssetUrl('/api/ai/translate-resume');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    throw new Error(i18n.t('error.network', { ns: 'common' }));
  }

  if (!response.ok) {
    let message = i18n.t('translation.fallbackError', { ns: 'editor' });
    try {
      const errData = await response.json();
      if (errData?.message) message = errData.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error(i18n.t('diagnosisError.streamUnsupported', { ns: 'editor' }));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const event = parseSSEBlock(block);
        if (!event) continue;

        if (event.type === 'progress') {
          callbacks.onProgress?.(event);
        } else if (event.type === 'result' && event.resume_data) {
          callbacks.onProgress?.(event);
          return { resume_data: event.resume_data };
        } else if (event.type === 'error') {
          throw new Error(event.message || i18n.t('translation.fallbackError', { ns: 'editor' }));
        }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error(i18n.t('translation.fallbackError', { ns: 'editor' }));
}

/** Fetch available model list from the user's configured API (POST for guest-mode config) */
export function fetchAiModels(): Promise<{ models: string[] }> {
  const body = withAIConfig({}, { requireModelName: false });
  return api.post('/api/ai/models', body);
}

/** Fetch available public AI models from the admin-configured pool */
export function fetchPublicModels(): Promise<PublicModelListResponse> {
  return api.get<PublicModelListResponse>('/api/ai/model-pools');
}

/** Refresh balances for all DeepSeek public models and return updated list */
export function refreshPublicModelBalances(): Promise<PublicModelListResponse> {
  return api.post('/api/ai/model-pools/balances/refresh', {});
}

/** Callbacks for streaming AI diagnosis progress */
export interface DiagnosisStreamCallbacks {
  onProgress: (text: string) => void;
  onResult: (items: DiagnosisItem[]) => void;
  onError: (message: string) => void;
}

/** AI 简历诊断 (流式 SSE)：POST /api/ai/diagnose */
export async function aiDiagnoseStream(
  content: string,
  callbacks: DiagnosisStreamCallbacks,
  signal?: AbortSignal,
  language = i18n.language,
): Promise<void> {
  const normalizedLanguage = language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
  const body = withAIConfig({ content, language: normalizedLanguage });
  const url = apiAssetUrl('/api/ai/diagnose');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    callbacks.onError(i18n.t('diagnosisError.networkFailed', { ns: 'editor' }));
    return;
  }

  if (!response.ok) {
    let message = i18n.t('diagnosisError.requestFailed', { ns: 'editor', status: response.status });
    try {
      const errData = await response.json();
      if (errData?.message) message = errData.message;
    } catch { /* ignore */ }
    callbacks.onError(message);
    return;
  }

  if (!response.body) {
    callbacks.onError(i18n.t('diagnosisError.streamUnsupported', { ns: 'editor' }));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行解析 SSE
      const lines = buffer.split('\n');
      // 最后一行可能不完整，保留到下次
      buffer = lines.pop() || '';

      let currentEvent = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);
            switch (currentEvent) {
              case 'progress':
                callbacks.onProgress(data.text || '');
                break;
              case 'result':
                callbacks.onResult(data.items || []);
                break;
              case 'error':
                callbacks.onError(data.message || i18n.t('diagnosisError.unknown', { ns: 'editor' }));
                break;
            }
          } catch {
            // 跳过无法解析的数据行
          }
          currentEvent = '';
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    callbacks.onError(i18n.t('diagnosisError.streamReadFailed', { ns: 'editor' }));
  } finally {
    reader.releaseLock();
  }
}

/** AI 文本润色：POST /api/ai/polish with optional guest AI config */
export function aiPolish(text: string, sectionModule?: string): Promise<{ text: string }> {
  const body = withAIConfig({ text, section_module: sectionModule });
  return api.post('/api/ai/polish', body);
}

export function analyzeAts(
  resumeData: ResumeData,
  jobDescription: string,
  language = i18n.language,
  callbacks: AtsAnalysisStreamCallbacks = {},
  signal?: AbortSignal,
): Promise<AtsAnalysisResult> {
  const normalizedLanguage = language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
  const body = withAIConfig({
    resume_data: resumeData,
    job_description: jobDescription,
    language: normalizedLanguage,
  });
  return fetchAtsAnalysisStream(body, callbacks, signal);
}

export interface AtsAnalysisStreamEvent {
  type: 'progress' | 'result' | 'error';
  stage?: 'request' | 'streaming' | 'complete' | 'error';
  progress?: number;
  received_chars?: number;
  message?: string;
  result?: AtsAnalysisResult;
}

export interface AtsAnalysisStreamCallbacks {
  onProgress?: (event: AtsAnalysisStreamEvent) => void;
}

function parseAtsSSEBlock(block: string): AtsAnalysisStreamEvent | null {
  let eventType = 'message';
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    const event = JSON.parse(dataLines.join('\n')) as AtsAnalysisStreamEvent;
    return {
      ...event,
      type: (event.type || eventType) as AtsAnalysisStreamEvent['type'],
    };
  } catch {
    return null;
  }
}

async function fetchAtsAnalysisStream(
  body: Record<string, unknown>,
  callbacks: AtsAnalysisStreamCallbacks,
  signal?: AbortSignal,
): Promise<AtsAnalysisResult> {
  const url = apiAssetUrl('/api/ai/ats-analysis');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    throw new Error(i18n.t('atsPanel.error.network', { ns: 'editor' }));
  }

  if (!response.ok) {
    let message = i18n.t('atsPanel.error.failed', { ns: 'editor' });
    try {
      const errData = await response.json();
      if (errData?.message) message = errData.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error(i18n.t('diagnosisError.streamUnsupported', { ns: 'editor' }));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const event = parseAtsSSEBlock(block);
        if (!event) continue;

        if (event.type === 'progress') {
          callbacks.onProgress?.(event);
        } else if (event.type === 'result' && event.result) {
          callbacks.onProgress?.(event);
          return event.result;
        } else if (event.type === 'error') {
          throw new Error(event.message || i18n.t('atsPanel.error.failed', { ns: 'editor' }));
        }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error(i18n.t('atsPanel.error.failed', { ns: 'editor' }));
}
