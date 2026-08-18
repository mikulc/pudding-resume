import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResumeData, ResumeListItem } from '../../types/resume';

const apiMocks = vi.hoisted(() => ({
  getResumeList: vi.fn(),
}));

vi.mock('../../api/resumes', () => ({
  getResumeList: apiMocks.getResumeList,
}));

vi.mock('../../context/AuthContext', () => ({
  isLocalStorageEnabled: () => false,
}));

vi.mock('../../utils/localStorage', () => ({
  loadLocalResumes: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import {
  mergeCloudResumePage,
  partitionLocalResumes,
  useResumeLibrary,
} from './useResumeLibrary';

const emptyContent = {} as ResumeData;

function resume(id: string, extra: Partial<ResumeListItem> = {}): ResumeListItem {
  return {
    id,
    name: id,
    content: emptyContent,
    updated_at: '2026-08-18T00:00:00.000Z',
    ...extra,
  };
}

describe('resume source pagination helpers', () => {
  afterEach(() => {
    cleanup();
    apiMocks.getResumeList.mockReset();
  });

  it('requests only eight resumes at the offset for the selected page', async () => {
    apiMocks.getResumeList.mockResolvedValue({
      resumes: [], total: 24, limit: 8, offset: 16, has_more: false,
    });

    renderHook(() => useResumeLibrary(true, false, 3, 8));

    await waitFor(() => {
      expect(apiMocks.getResumeList).toHaveBeenCalledWith({ limit: 8, offset: 16 });
    });
  });

  it('merges a linked local file into its cloud resume', () => {
    const partition = partitionLocalResumes(
      [resume('local-1', { cloud_uuid: 'cloud-1', local_file_name: 'linked.json' })],
      true,
    );
    const result = mergeCloudResumePage([resume('cloud-1')], partition.linkedByCloudId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'cloud-1',
      source: 'cloud',
      local_file_name: 'linked.json',
      _hasCloud: true,
      _hasLocal: true,
    });
  });

  it('partitions standalone and duplicate-linked local files for later pages', () => {
    const partition = partitionLocalResumes(
      [
        resume('local-linked', { cloud_uuid: 'cloud-1' }),
        resume('local-duplicate', { cloud_uuid: 'cloud-1' }),
        resume('local-only'),
      ],
      true,
    );

    expect(partition.linkedByCloudId.get('cloud-1')?.id).toBe('local-linked');
    expect(partition.standalone.map((item) => item.id)).toEqual(['local-duplicate', 'local-only']);
  });

  it('treats every local resume as standalone while signed out', () => {
    const partition = partitionLocalResumes(
      [resume('local-linked', { cloud_uuid: 'cloud-1' }), resume('local-only')],
      false,
    );

    expect(partition.linkedByCloudId.size).toBe(0);
    expect(partition.standalone).toHaveLength(2);
  });
});
