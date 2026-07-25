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
