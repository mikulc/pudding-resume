import { api } from '../utils/api';
import type {
  DashboardData,
  AdminUserListResponse,
  UpdateUserQuotaRequest,
  AdminTemplateInput,
  AdminTemplateImportInput,
  AdminTemplateItem,
  AdminTemplateListResponse,
  AdminCategory,
  AdminCategoryInput,
  AdminLogResponse,
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

// --- Backend logs ---
export function fetchAdminLogs(params: {
  limit?: number; after?: number; level?: string; source?: string; query?: string;
}): Promise<AdminLogResponse> {
  const sp = new URLSearchParams();
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.after) sp.set('after', String(params.after));
  if (params.level) sp.set('level', params.level);
  if (params.source) sp.set('source', params.source);
  if (params.query) sp.set('query', params.query);
  const qs = sp.toString();
  return api.get(`/api/admin/logs${qs ? `?${qs}` : ''}`);
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

// --- Resume templates ---
export function fetchAdminTemplates(params: {
  page?: number; size?: number; search?: string; status?: string;
}): Promise<AdminTemplateListResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  const qs = sp.toString();
  return api.get(`/api/admin/templates${qs ? `?${qs}` : ''}`);
}

export function createAdminTemplate(data: AdminTemplateInput): Promise<{ template: AdminTemplateItem }> {
  return api.post('/api/admin/templates', data);
}

export function importAdminTemplates(templates: AdminTemplateImportInput[]): Promise<{ message: string; count: number }> {
  return api.post('/api/admin/templates/import', { templates });
}

export function updateAdminTemplate(id: string, data: AdminTemplateInput): Promise<{ template: AdminTemplateItem }> {
  return api.put(`/api/admin/templates/${id}`, data);
}

export function deleteAdminTemplate(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/templates/${id}`);
}

export function fetchAdminTemplateCategories(): Promise<AdminCategory[]> {
  return api.get<{ categories: AdminCategory[] }>('/api/admin/template-categories')
    .then((result) => result.categories ?? []);
}

export function createAdminTemplateCategory(data: AdminCategoryInput): Promise<{ category: AdminCategory }> {
  return api.post('/api/admin/template-categories', data);
}

export function updateAdminTemplateCategory(id: string, data: AdminCategoryInput): Promise<{ category: AdminCategory }> {
  return api.put(`/api/admin/template-categories/${id}`, data);
}

export function deleteAdminTemplateCategory(id: string): Promise<{ message: string }> {
  return api.del(`/api/admin/template-categories/${id}`);
}

export function fetchAdminThemeCategories(): Promise<AdminCategory[]> {
  return api.get<{ categories: AdminCategory[] }>('/api/admin/theme-categories')
    .then((result) => result.categories ?? []);
}
