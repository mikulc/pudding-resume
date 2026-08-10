import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplayResume } from './useResumeLibrary';
import type { ResumeMenuModel } from './useResumeMenu';

const { confirm, copyResume, deleteResume, showToast } = vi.hoisted(() => ({
  confirm: vi.fn(),
  copyResume: vi.fn(),
  deleteResume: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../components/common/Toast', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('../../components/common/ConfirmModal', () => ({
  useConfirm: () => ({ confirm }),
}));
vi.mock('../../api/resumes', () => ({
  deleteResume,
  copyResume,
  updateResumeName: vi.fn(),
  createResume: vi.fn(),
}));
vi.mock('../../utils/localStorage', () => ({
  deleteLocalResume: vi.fn(),
  saveResumeToLocal: vi.fn(),
  generateLocalId: vi.fn(),
}));

import { useResumeActions } from './useResumeActions';

describe('useResumeActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
    deleteResume.mockResolvedValue(undefined);
  });

  it('removes a deleted resume from the current list without reloading it', async () => {
    const resume = {
      id: 'resume-1',
      name: 'Resume 1',
      source: 'cloud',
      updated_at: '2026-08-10T00:00:00Z',
      content: {},
      _hasCloud: true,
      _hasLocal: false,
    } as DisplayResume;
    const removeResumeFromList = vi.fn();
    const addResumeToList = vi.fn();
    const refreshList = vi.fn();
    const menu = {
      setMenuOpenId: vi.fn(),
      setRenamingId: vi.fn(),
      setRenameValue: vi.fn(),
      renamingId: null,
      renameValue: '',
    } as unknown as ResumeMenuModel;

    const { result } = renderHook(() => useResumeActions({
      resumes: [resume],
      refreshList,
      removeResumeFromList,
      addResumeToList,
      menu,
    }));

    await act(async () => {
      await result.current.handleDeleteClick(resume.id);
    });

    expect(deleteResume).toHaveBeenCalledWith(resume.id);
    expect(removeResumeFromList).toHaveBeenCalledWith(resume);
    expect(refreshList).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('list.deleted', 'success');
  });

  it('inserts a cloud copy into the current list without reloading it', async () => {
    const resume = {
      id: 'resume-1',
      name: 'Resume 1',
      source: 'cloud',
      updated_at: '2026-08-10T00:00:00Z',
      content: {},
      _hasCloud: true,
      _hasLocal: false,
    } as DisplayResume;
    const copiedResume = {
      id: 'resume-2',
      name: 'Resume 1 copy',
      updated_at: '2026-08-10T00:01:00Z',
      content: {},
    };
    copyResume.mockResolvedValue(copiedResume);
    const addResumeToList = vi.fn();
    const refreshList = vi.fn();
    const menu = {
      setMenuOpenId: vi.fn(),
      setRenamingId: vi.fn(),
      setRenameValue: vi.fn(),
      renamingId: null,
      renameValue: '',
    } as unknown as ResumeMenuModel;

    const { result } = renderHook(() => useResumeActions({
      resumes: [resume],
      refreshList,
      removeResumeFromList: vi.fn(),
      addResumeToList,
      menu,
    }));

    await act(async () => {
      await result.current.handleCopy(resume.id);
    });

    expect(addResumeToList).toHaveBeenCalledWith({
      ...copiedResume,
      source: 'cloud',
      _hasCloud: true,
      _hasLocal: false,
    });
    expect(refreshList).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('list.copied', 'success');
  });

  it('shows the server quota message when the resume limit is reached', async () => {
    const resume = {
      id: 'resume-1',
      name: 'Resume 1',
      source: 'cloud',
      updated_at: '2026-08-10T00:00:00Z',
      content: {},
      _hasCloud: true,
      _hasLocal: false,
    } as DisplayResume;
    copyResume.mockRejectedValue(new Error('每个用户最多创建 10 份简历'));
    const menu = {
      setMenuOpenId: vi.fn(),
      setRenamingId: vi.fn(),
      setRenameValue: vi.fn(),
      renamingId: null,
      renameValue: '',
    } as unknown as ResumeMenuModel;

    const { result } = renderHook(() => useResumeActions({
      resumes: [resume],
      refreshList: vi.fn(),
      removeResumeFromList: vi.fn(),
      addResumeToList: vi.fn(),
      menu,
    }));

    await act(async () => {
      await result.current.handleCopy(resume.id);
    });

    expect(showToast).toHaveBeenCalledWith('每个用户最多创建 10 份简历', 'error');
  });
});
