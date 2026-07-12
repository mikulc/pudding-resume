import { api, upload } from '../utils/api';
import type { ResumeData, ThemeSettings, ResumeListItem, ResumeCopyResponse } from '../types/resume';
import i18n from '../utils/i18n';

export type ResumePayload = {
  id: string;
  name: string;
  content: ResumeData;
  settings?: ThemeSettings;
  updated_at?: string;
};

export type ResumeListParams = {
  limit?: number;
  offset?: number;
};

export type ResumeListResponse = {
  resumes: ResumeListItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

/** In-memory cache for getResumeById — deduplicates ResumePage.checkOwnership + ResumeProvider requests. */
const _resumeCache = new Map<string, ResumePayload>();

/** Pre-populate the resume cache (used when the public endpoint already returned resume data). */
export function setResumeCache(id: string, data: ResumePayload): void {
  _resumeCache.set(id, data);
}

/** List resumes for the current user with optional pagination metadata. */
export async function getResumeList(params: ResumeListParams = {}): Promise<ResumeListResponse> {
  const query = new URLSearchParams();
  if (typeof params.limit === 'number') query.set('limit', String(params.limit));
  if (typeof params.offset === 'number') query.set('offset', String(params.offset));

  const endpoint = `/api/resumes${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await api.get<Partial<ResumeListResponse> & { resumes?: ResumeListItem[]; total?: number }>(endpoint);
  const resumes = res.resumes || [];

  return {
    resumes,
    total: res.total ?? resumes.length,
    limit: res.limit ?? params.limit ?? 0,
    offset: res.offset ?? params.offset ?? 0,
    has_more: res.has_more ?? false,
  };
}

/** List all resumes for the current user */
export async function getResumes(params?: ResumeListParams): Promise<ResumeListItem[]> {
  const res = await getResumeList(params);
  return res.resumes;
}

/** Copy an existing resume by ID, returns the newly created copy */
export async function copyResume(id: string): Promise<ResumeCopyResponse> {
  return api.post<ResumeCopyResponse>(`/api/resumes/${id}/copies`, {});
}

/** Update resume name by ID */
export async function updateResumeName(id: string, name: string): Promise<void> {
  await api.put(`/api/resumes/${id}`, { name });
}

/** Delete a resume by ID */
export async function deleteResume(id: string): Promise<void> {
  await api.del(`/api/resumes/${id}`);
}

/** Fetch a specific resume by ID, returns null if not found. Cached in-memory for the page lifecycle. */
export async function getResumeById(id: string): Promise<ResumePayload | null> {
  // Return cached result if available (avoids duplicate request from ResumePage + ResumeProvider)
  const cached = _resumeCache.get(id);
  if (cached) {
    _resumeCache.delete(id); // consume once to avoid stale data on subsequent manual refetches
    return cached;
  }
  try {
    const res = await api.get<ResumePayload>(`/api/resumes/${id}`);
    _resumeCache.set(id, res);
    return res;
  } catch {
    return null; // Resume not found or network error
  }
}

/** Create a brand new resume (POST /api/resumes) — ensures a fresh ID every time */
export function createResume(data: ResumeData, name?: string, settings?: ThemeSettings): Promise<ResumePayload> {
  return api.post<ResumePayload>('/api/resumes', {
    name: name || i18n.t('list.unnamedResume', { ns: 'resume' }),
    content: data,
    settings,
  });
}

/** Save a specific resume by ID (for multi-resume support) */
export function saveResumeById(id: string, data: ResumeData, settings?: ThemeSettings) {
  return api.put(`/api/resumes/${id}`, { content: data, settings });
}

/** Upload avatar: POST /api/user/avatar with FormData */
export function uploadAvatar(formData: FormData) {
  return upload<{ avatar_url: string }>('/api/user/avatar', formData);
}
