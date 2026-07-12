import { api } from '../utils/api';
import type {
  DashboardData,
  AdminUserListResponse,
  AdminUserDetail,
  UpdateUserQuotaRequest,
  AdminModelPoolListResponse,
  CreateModelPoolRequest,
  UpdateModelPoolRequest,
  ChangelogListResponse,
  CreateChangelogRequest,
  UpdateChangelogRequest,
  AdminAIUsageResponse,
  UserAIUsageDetail,
  AuditLogListResponse,
  PublicChangelogResponse,
} from '../types/admin';

// --- Dashboard ---
export function fetchDashboard(): Promise<DashboardData> {
  return api.get('/api/admin/dashboard');
}

// --- Users ---
export function fetchUsers(params: {
  page?: number; size?: number; search?: string;
  role?: string; deleted?: boolean;
}): Promise<AdminUserListResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.search) sp.set('search', params.search);
  if (params.role) sp.set('role', params.role);
  if (params.deleted) sp.set('deleted', 'true');
  const qs = sp.toString();
  return api.get(`/api/admin/users${qs ? '?' + qs : ''}`);
}

export function fetchUserDetail(id: string): Promise<AdminUserDetail> {
  return api.get(`/api/admin/users/${id}`);
}

export function updateUserQuota(id: string, data: UpdateUserQuotaRequest): Promise<{ message: string }> {
  return api.put(`/api/admin/users/${id}/quota`, data);
}

export function updateUserRole(id: string, role: string): Promise<{ message: string }> {
  return api.put(`/api/admin/users/${id}/role`, { role });
}

export function forceLogoutUser(id: string): Promise<{ message: string }> {
  return api.post(`/api/admin/users/${id}/force-logout`, {});
}

export function resetUserPassword(id: string, newPassword: string): Promise<{ message: string }> {
  return api.put(`/api/admin/users/${id}/reset-password`, { new_password: newPassword });
}

export function deleteUser(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/users/${id}`);
}

// --- Model Pools ---
export function fetchModelPools(): Promise<AdminModelPoolListResponse> {
  return api.get('/api/admin/model-pools');
}

export function createModelPool(data: CreateModelPoolRequest): Promise<{ message: string; id: string }> {
  return api.post('/api/admin/model-pools', data);
}

export function updateModelPool(id: string, data: UpdateModelPoolRequest): Promise<{ message: string }> {
  return api.put(`/api/admin/model-pools/${id}`, data);
}

export function deleteModelPool(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/model-pools/${id}`);
}

export function refreshModelBalance(id: string): Promise<unknown> {
  return api.post(`/api/admin/model-pools/${id}/refresh-balance`, {});
}

// --- Changelogs ---
export function fetchChangelogs(): Promise<ChangelogListResponse> {
  return api.get('/api/admin/changelogs');
}

export function createChangelog(data: CreateChangelogRequest): Promise<{ message: string; id: string }> {
  return api.post('/api/admin/changelogs', data);
}

export function updateChangelog(id: string, data: UpdateChangelogRequest): Promise<{ message: string }> {
  return api.put(`/api/admin/changelogs/${id}`, data);
}

export function deleteChangelog(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/changelogs/${id}`);
}

// --- AI Usage ---
export function fetchGlobalAIUsage(month?: string): Promise<AdminAIUsageResponse> {
  const qs = month ? `?month=${month}` : '';
  return api.get(`/api/admin/ai-usage${qs}`);
}

export function fetchUserAIUsage(userId: string, month?: string): Promise<UserAIUsageDetail> {
  const qs = month ? `?month=${month}` : '';
  return api.get(`/api/admin/ai-usage/users/${userId}${qs}`);
}

// --- Audit Logs ---
export function fetchAuditLogs(params: {
  page?: number; size?: number; action?: string;
}): Promise<AuditLogListResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.action) sp.set('action', params.action);
  const qs = sp.toString();
  return api.get(`/api/admin/audit-logs${qs ? '?' + qs : ''}`);
}

// --- Public ---
export function fetchPublicChangelogs(): Promise<PublicChangelogResponse> {
  return api.get('/api/changelog');
}
