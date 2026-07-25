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
