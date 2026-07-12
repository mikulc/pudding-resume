import { loadSettings, saveSettings, type LocalSettingsPayload } from './localSettings';
import i18n from './i18n';

export type AIModelSource = 'custom' | 'public';

export interface AIConfig {
  modelSource: AIModelSource;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  publicModelId: string;
}

export interface AIConfigValidationOptions {
  requireModelName?: boolean;
}

export interface AIConfigValidationResult {
  ok: boolean;
  message?: string;
}

function readRawSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem('pudding_resume_settings');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return '';
}

function normalizeModelSource(value: unknown): AIModelSource {
  return value === 'custom' || value === 'public' ? value : 'custom';
}

function normalizeAIConfig(source: Record<string, unknown>): AIConfig {
  return {
    modelSource: normalizeModelSource(firstString(source.modelSource, source.model_source)),
    baseUrl: firstString(source.baseUrl, source.apiUrl, source.apiBaseUrl, source.ai_service_api_url),
    apiKey: firstString(source.apiKey, source.ai_service_api_key),
    modelName: firstString(source.modelName, source.model, source.ai_service_model),
    publicModelId: firstString(source.publicModelId, source.public_model_id),
  };
}

function hasAnyKey(source: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(source, key));
}

function normalizeAIConfigOverrides(source: Record<string, unknown>): Partial<AIConfig> {
  const result: Partial<AIConfig> = {};

  if (hasAnyKey(source, ['modelSource', 'model_source'])) {
    result.modelSource = normalizeModelSource(firstString(source.modelSource, source.model_source));
  }
  if (hasAnyKey(source, ['baseUrl', 'apiUrl', 'apiBaseUrl', 'ai_service_api_url'])) {
    result.baseUrl = firstString(source.baseUrl, source.apiUrl, source.apiBaseUrl, source.ai_service_api_url);
  }
  if (hasAnyKey(source, ['apiKey', 'ai_service_api_key'])) {
    result.apiKey = firstString(source.apiKey, source.ai_service_api_key);
  }
  if (hasAnyKey(source, ['modelName', 'model', 'ai_service_model'])) {
    result.modelName = firstString(source.modelName, source.model, source.ai_service_model);
  }
  if (hasAnyKey(source, ['publicModelId', 'public_model_id'])) {
    result.publicModelId = firstString(source.publicModelId, source.public_model_id);
  }

  return result;
}

export function getAIConfig(overrides: Partial<AIConfig> | Record<string, unknown> = {}): AIConfig {
  const saved = loadSettings() as (LocalSettingsPayload & Record<string, unknown>) | null;
  const raw = readRawSettings();
  return {
    ...normalizeAIConfig({ ...raw, ...(saved ?? {}) }),
    ...normalizeAIConfigOverrides(overrides),
  };
}

export function validateAIConfig(
  config: AIConfig,
  options: AIConfigValidationOptions = {},
): AIConfigValidationResult {
  if (config.modelSource !== 'custom') {
    return { ok: true };
  }

  if (!config.baseUrl.trim()) {
    return { ok: false, message: i18n.t('aiService.validation.baseUrlRequired', { ns: 'settings' }) };
  }
  if (!config.apiKey.trim()) {
    return { ok: false, message: i18n.t('aiService.validation.apiKeyRequired', { ns: 'settings' }) };
  }
  if (options.requireModelName !== false && !config.modelName.trim()) {
    return { ok: false, message: i18n.t('aiService.validation.modelNameRequired', { ns: 'settings' }) };
  }
  return { ok: true };
}

export function assertAIConfig(config: AIConfig, options?: AIConfigValidationOptions): void {
  const validation = validateAIConfig(config, options);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
}

export function saveAIConfig(config: Partial<AIConfig>): AIConfig {
  const next = getAIConfig(config);
  saveSettings({
    model_source: next.modelSource,
    public_model_id: next.publicModelId,
    ai_service_api_url: next.baseUrl,
    ai_service_api_key: next.apiKey,
    ai_service_model: next.modelName,
  });
  return next;
}
