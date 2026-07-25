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
