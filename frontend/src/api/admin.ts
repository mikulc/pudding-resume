import { api } from '../utils/api';
import type {
  DashboardData,
  AdminUserListResponse,
  UpdateUserQuotaRequest,
} from '../types/admin';

// --- Dashboard ---
type DashboardPayload = Omit<DashboardData, 'model_usage' | 'daily_new_users' | 'daily_tokens'> & {
  model_usage?: DashboardData['model_usage'] | null;
  daily_new_users?: DashboardData['daily_new_users'] | null;
  daily_tokens?: DashboardData['daily_tokens'] | null;
};

export function normalizeDashboardData(data: DashboardPayload): DashboardData {
  return {
    ...data,
    model_usage: data.model_usage ?? [],
    daily_new_users: data.daily_new_users ?? [],
    daily_tokens: data.daily_tokens ?? [],
  };
}

export function fetchDashboard(): Promise<DashboardData> {
  return api.get<DashboardPayload>('/api/admin/dashboard').then(normalizeDashboardData);
}

// --- Users ---
export function fetchUsers(params: {
  page?: number; size?: number; search?: string;
}): Promise<AdminUserListResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.search) sp.set('search', params.search);
  const qs = sp.toString();
  return api.get(`/api/admin/users${qs ? '?' + qs : ''}`);
}

export function updateUserQuota(id: string, data: UpdateUserQuotaRequest): Promise<{ message: string }> {
  return api.put(`/api/admin/users/${id}/quota`, data);
}

export function resetUserPassword(id: string, newPassword: string): Promise<{ message: string }> {
  return api.put(`/api/admin/users/${id}/reset-password`, { new_password: newPassword });
}

export function deleteUser(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/users/${id}`);
}

export function restoreUser(id: string): Promise<{ message: string }> {
  return api.post(`/api/admin/users/${id}/restore`, {});
}

export function permanentlyDeleteUser(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/users/${id}/permanent`);
}
