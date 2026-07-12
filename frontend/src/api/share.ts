import { api, publicRequest } from '../utils/api';
import type { ResumeData, ThemeSettings } from '../types/resume';

export interface ShareSettings {
  id: string;
  resume_id: string;
  share_token: string;
  permission: 'self_only' | 'link_anyone';
  access_level: 'view' | 'edit';
  can_export: boolean;
  desensitized: boolean;
}

export interface SharedResumeResponse {
  resume: {
    id: string;
    name: string;
    content: ResumeData;
    settings?: ThemeSettings;
  };
  permission: 'self_only' | 'link_anyone';
  access_level: 'view' | 'edit';
  can_edit: boolean;
  can_copy_edit?: boolean;
  can_export: boolean;
  desensitized: boolean;
  owner_id: string;
  is_owner: boolean;
}

/** Get share settings for a resume (auth required) */
export async function getShareSettings(
  resumeId: string,
): Promise<{ share: ShareSettings | null }> {
  return api.get(`/api/resumes/${resumeId}/share`);
}

/** Create or update share settings for a resume (auth required) */
export async function updateShareSettings(
  resumeId: string,
  body: { permission?: string; access_level?: string; can_export?: boolean; desensitized?: boolean },
): Promise<{ share: ShareSettings }> {
  return api.put(`/api/resumes/${resumeId}/share`, body);
}

/** Access a shared resume by resume ID (public, no auth required for view).
 *  Used to serve the unified /resume/:id URL — same endpoint for both
 *  the owner (editor) and shared viewers (read-only preview). */
export async function accessSharedResumeByResumeId(
  resumeId: string,
): Promise<SharedResumeResponse> {
  return publicRequest<SharedResumeResponse>(`/api/resumes/${resumeId}/public`);
}
