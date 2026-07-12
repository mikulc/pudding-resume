/**
 * Resume export API client.
 * Sends pre-rendered HTML to the backend which renders PDF/PNG.
 */
import { getAuthToken, handleUnauthorized } from '../utils/api';
import i18n from '../utils/i18n';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface ExportResult {
  blob: Blob;
  /** Whether font loading timed out on the server side. */
  fontTimedOut: boolean;
}

export type ExportFormat = 'pdf' | 'png';

export interface ExportJobStartResponse {
  job_id: string;
  events_url: string;
}

export interface ExportJobEvent {
  type: 'progress' | 'complete' | 'error';
  stage?: string;
  message?: string;
  progress?: number;
  download_url?: string;
  font_timed_out?: boolean;
}

async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  let message = fallback;
  try {
    const err = await response.json();
    message = err.message || message;
  } catch {
    /* ignore */
  }
  return message;
}

async function exportHtml(
  endpoint: string,
  html: string,
  filename?: string,
  resumeId?: string,
): Promise<ExportResult> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ html, filename, resume_id: resumeId }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, i18n.t('exportFailed', { ns: 'common' })));
  }

  const fontTimedOut = response.headers.get('X-Font-Status') === 'timeout';
  const blob = await response.blob();
  return { blob, fontTimedOut };
}

async function startExportJob(
  format: ExportFormat,
  html: string,
  filename?: string,
  resumeId?: string,
): Promise<ExportJobStartResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/resumes/export/${format}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ html, filename, resume_id: resumeId }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, i18n.t('exportFailed', { ns: 'common' })));
  }

  return response.json();
}

function parseSSEBlock(block: string): ExportJobEvent | null {
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
    const event = JSON.parse(dataLines.join('\n')) as ExportJobEvent;
    return {
      ...event,
      type: (event.type || eventType) as ExportJobEvent['type'],
    };
  } catch {
    return null;
  }
}

async function readExportJobEvents(
  eventsUrl: string,
  onEvent: (event: ExportJobEvent) => void,
  signal?: AbortSignal,
): Promise<ExportJobEvent> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${eventsUrl}`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
  }

  if (!response.ok || !response.body) {
    throw new Error(await parseErrorResponse(response, i18n.t('exportFailed', { ns: 'common' })));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastEvent: ExportJobEvent | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const event = parseSSEBlock(block);
      if (!event) continue;

      lastEvent = event;
      onEvent(event);
      if (event.type === 'complete') return event;
      if (event.type === 'error') {
        throw new Error(event.message || i18n.t('exportFailed', { ns: 'common' }));
      }
    }

    if (done) break;
  }

  if (lastEvent?.type === 'complete') return lastEvent;
  throw new Error(i18n.t('exportFailed', { ns: 'common' }));
}

async function downloadExportJob(jobId: string): Promise<ExportResult> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/resumes/export/jobs/${jobId}/download`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, i18n.t('exportFailed', { ns: 'common' })));
  }

  const fontTimedOut = response.headers.get('X-Font-Status') === 'timeout';
  const blob = await response.blob();
  return { blob, fontTimedOut };
}

export async function exportResumeWithProgress(
  format: ExportFormat,
  html: string,
  filename: string | undefined,
  resumeId: string | undefined,
  onEvent: (event: ExportJobEvent) => void,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const job = await startExportJob(format, html, filename, resumeId);
  onEvent({
    type: 'progress',
    stage: 'connected',
    message: i18n.t('exporting', { ns: 'editor' }),
    progress: 18,
  });
  await readExportJobEvents(job.events_url, onEvent, signal);
  onEvent({
    type: 'progress',
    stage: 'download',
    message: i18n.t('exporting', { ns: 'editor' }),
    progress: 98,
  });
  return downloadExportJob(job.job_id);
}

export function exportResumeV2(
  html: string,
  filename?: string,
  resumeId?: string,
): Promise<ExportResult> {
  return exportHtml('/api/resumes/export/pdf', html, filename, resumeId);
}

export function exportResumePNG(
  html: string,
  filename?: string,
  resumeId?: string,
): Promise<ExportResult> {
  return exportHtml('/api/resumes/export/png', html, filename, resumeId);
}
