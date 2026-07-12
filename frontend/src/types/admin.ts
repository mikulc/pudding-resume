/** Admin panel type definitions */

// --- Dashboard ---
export interface DashboardData {
  total_users: number;
  today_new_users: number;
  total_resumes: number;
  today_ai_requests: number;
  today_tokens: number;
  month_tokens: number;
  total_tokens: number;
  active_users_30d: number;
  model_usage: ModelUsageItem[];
  daily_new_users: DailyCountItem[];
  daily_tokens: DailyTokenItem[];
}

export interface ModelUsageItem {
  name: string;
  count: number;
  tokens: number;
}

export interface DailyCountItem {
  date: string;
  count: number;
}

export interface DailyTokenItem {
  date: string;
  tokens: number;
}

// --- User Management ---
export interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string;
  resume_count: number;
  max_resumes: number;
  export_count: number;
  daily_limit_tokens: number;
  monthly_limit_tokens: number;
  deleted_at: string;
}

export interface AdminUserDetail extends AdminUserItem {
  total_resumes_created: number;
  total_exports: number;
  total_editing_seconds: number;
  last_active_at: string;
}

export interface AdminUserListResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  size: number;
}

export interface UpdateUserQuotaRequest {
  max_resumes?: number;
  export_count?: number;
  daily_limit_tokens?: number;
  monthly_limit_tokens?: number;
}

// --- Model Pool ---
export interface AdminModelPoolItem {
  id: string;
  name: string;
  api_url: string;
  model: string;
  balance: number;
  balance_updated_at: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  user_count: number;
}

export interface AdminModelPoolListResponse {
  models: AdminModelPoolItem[];
}

export interface CreateModelPoolRequest {
  name: string;
  api_url: string;
  api_key: string;
  model: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateModelPoolRequest {
  name?: string;
  api_url?: string;
  api_key?: string;
  model?: string;
  sort_order?: number;
  is_active?: boolean;
}

// --- Changelog ---
export interface ChangelogEntryItem {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  tone: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChangelogListResponse {
  entries: ChangelogEntryItem[];
}

export interface CreateChangelogRequest {
  version: string;
  date: string;
  title: string;
  summary?: string;
  items: string[];
  tone?: string;
  is_published?: boolean;
  sort_order?: number;
}

export interface UpdateChangelogRequest {
  version?: string;
  date?: string;
  title?: string;
  summary?: string;
  items?: string[];
  tone?: string;
  is_published?: boolean;
  sort_order?: number;
}

// --- AI Usage ---
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
export interface AuditLogItem {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  target_name: string;
  detail: string;
  ip: string;
  created_at: string;
}

export interface AuditLogListResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  size: number;
}

// Public changelog
export interface PublicChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  tone: string;
}

export interface PublicChangelogResponse {
  entries: PublicChangelogEntry[];
}
