export interface AIUsageTotals {
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
}

export interface AIUsageBreakdown {
  key: string;
  label: string;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
}

export interface AIUsageModelBreakdown {
  model: string;
  provider: string;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
}

export interface AIUsageDailyTrend {
  date: string;
  provider: string;
  model: string;
  request_count: number;
  total_tokens: number;
}

export interface UserUsageItem {
  user_id: string;
  username: string;
  email: string;
  tokens: number;
  requests: number;
}

export interface AdminAIUsageResponse {
  today: AIUsageTotals;
  month: AIUsageTotals;
  total: AIUsageTotals;
  providers: AIUsageBreakdown[];
  models: AIUsageModelBreakdown[];
  daily_trend: AIUsageDailyTrend[];
  top_users: UserUsageItem[];
  month_label: string;
}

// User-specific AI usage detail
export interface UserAIUsageDetail {
  today: AIUsageTotals;
  month: AIUsageTotals;
  total: AIUsageTotals;
  providers: AIUsageBreakdown[];
  models: AIUsageModelBreakdown[];
  recent: AIUsageRecord[];
  recent_total: number;
  daily_trend: AIUsageDailyTrend[];
  month_label: string;
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

// --- Audit Log ---
