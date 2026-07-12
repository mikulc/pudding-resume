import { api } from '../utils/api';

export interface AIUsageTotals {
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
}

export interface AIUsageBreakdown extends AIUsageTotals {
  key: string;
  label: string;
}

export interface AIUsageModelBreakdown extends AIUsageTotals {
  model: string;
  provider: string;
}

export interface AIUsageRecord {
  id: string;
  feature: string;
  model_source: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
  usage_status: string;
  success: boolean;
  latency_ms: number;
  created_at: string;
}

export interface AIUsageDailyTrend extends AIUsageTotals {
  date: string;
  provider: string;
  model: string;
}

export interface AIUsageLimits {
  daily_limit_tokens: number;
  monthly_limit_tokens: number;
  daily_remaining_tokens: number | null;
  monthly_remaining_tokens: number | null;
}

export interface AIUsageResponse {
  today: AIUsageTotals;
  month: AIUsageTotals;
  total: AIUsageTotals;
  limits: AIUsageLimits;
  providers: AIUsageBreakdown[];
  models: AIUsageModelBreakdown[];
  recent: AIUsageRecord[];
  recent_total: number;
  daily_trend: AIUsageDailyTrend[];
  month_label: string;
}

export interface AIUsageQuery {
  month?: string;
  provider?: string;
  model?: string;
  recentPage?: number;
  recentPageSize?: number;
}

export function fetchAIUsage(query: AIUsageQuery = {}): Promise<AIUsageResponse> {
  const params = new URLSearchParams();
  if (query.month) params.set('month', query.month);
  if (query.provider && query.provider !== 'all') params.set('provider', query.provider);
  if (query.model && query.model !== 'all') params.set('model', query.model);
  if (query.recentPage) params.set('recent_page', String(query.recentPage));
  if (query.recentPageSize) params.set('recent_page_size', String(query.recentPageSize));
  const qs = params.toString();
  return api.get<AIUsageResponse>(`/api/user/ai-usage${qs ? `?${qs}` : ''}`);
}
