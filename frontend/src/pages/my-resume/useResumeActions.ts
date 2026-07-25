import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deleteResume, copyResume, updateResumeName, createResume } from '../../api/resumes';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmModal';
import { deleteLocalResume, saveResumeToLocal, generateLocalId } from '../../utils/localStorage';
import { clearResumeLaunchSession, stageExistingResumeLaunch, stageLocalResumeLaunch } from '../../utils/resumeLaunch';
import type { DisplayResume } from './useResumeLibrary';
import type { ResumeMenuModel } from './useResumeMenu';

interface ResumeActionsOptions {
  resumes: DisplayResume[];
  refreshList: () => Promise<void>;
  menu: ResumeMenuModel;
}

export function useResumeActions({ resumes, refreshList, menu }: ResumeActionsOptions) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation(['resume', 'common', 'homepage']);
  const { setMenuOpenId, setRenamingId, setRenameValue, renamingId, renameValue } = menu;
  // Create resume modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCardPreviewClick = useCallback((id: string) => {
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;

    // 娓呯悊鍏朵粬鍒涘缓娴佺▼鐨?session 鏁版嵁
    clearResumeLaunchSession();

    if (resume.source === 'local') {
      stageLocalResumeLaunch({
        id: resume.id,
        name: resume.name,
        data: resume.content,
        settings: resume.settings,
      });
    } else {
      stageExistingResumeLaunch(String(resume.id), resume.name);
    }
    navigate(`/resume/${resume.id}`);
  }, [resumes, navigate]);

  const handleDeleteClick = useCallback(async (id: string) => {
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;

    const isLocal = resume.source === 'local';
    const isMerged = resume._hasCloud && resume._hasLocal;

    const confirmed = await confirm.confirm({
      title: t('list.confirmDeleteTitle'),
      message: isMerged
        ? t('list.confirmDeleteMerged', { name: resume.name })
        : isLocal
          ? t('list.confirmDeleteLocal', { name: resume.name })
          : t('list.confirmDeleteCloud', { name: resume.name }),
      confirmText: t('common:button.delete'),
      cancelText: t('common:button.cancel'),
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      if (isLocal || isMerged) {
        if (resume.local_file_name) {
          await deleteLocalResume(resume.local_file_name);
        }
      }
      if (!isLocal) {
        await deleteResume(id);
      }
      showToast(t('list.deleted'), 'success');
      await refreshList();
    } catch {
      showToast(t('list.deleteFailed'), 'error');
    }
  }, [resumes, confirm, showToast, refreshList, t]);

  // Copy handler
  const handleCopy = useCallback(async (id: string) => {
    setMenuOpenId(null);
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;

    if (resume.source === 'local') {
      // Local copy: create new file with same content
      const newId = generateLocalId();
      const newName = t('list.copyName', { name: resume.name });
      const ok = await saveResumeToLocal({
        id: newId,
        name: newName,
        content: resume.content,
        settings: resume.settings,
        updated_at: new Date().toISOString(),
      });
      if (ok) {
        showToast(t('list.localCopied'), 'success');
        await refreshList();
      } else {
        showToast(t('list.copyLocalFailed'), 'error');
      }
    } else {
      // Cloud copy: call API
      try {
        await copyResume(id);
        showToast(t('list.copied'), 'success');
        await refreshList();
      } catch {
        showToast(t('list.copyFailed'), 'error');
      }
    }
  }, [resumes, setMenuOpenId, showToast, refreshList, t]);

  // Upload local resume to cloud
  const handleUploadToCloud = useCallback(async (id: string) => {
    setMenuOpenId(null);
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;

    try {
      const response = await createResume(resume.content, resume.name, resume.settings) as { id: string };
      // 鏇存柊鏈湴鏂囦欢锛屽叧鑱?cloud_uuid
      await saveResumeToLocal({
        id: resume.id,
        name: resume.name,
        content: resume.content,
        settings: resume.settings,
        updated_at: resume.updated_at,
        cloud_uuid: response.id,
      });
      showToast(t('list.uploadedToCloud', { name: resume.name }), 'success');
      await refreshList();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('list.uploadFailed');
      showToast(message, 'error');
    }
  }, [resumes, setMenuOpenId, showToast, refreshList, t]);

  // Rename handler 鈥?open rename mode
  const handleRenameStart = useCallback((id: string) => {
    setMenuOpenId(null);
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;
    setRenamingId(id);
    setRenameValue(resume.name);
  }, [resumes, setMenuOpenId, setRenameValue, setRenamingId]);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, [setRenamingId]);

  // Submit rename
  const handleRenameSubmit = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const resume = resumes.find((r) => r.id === renamingId);
    if (!resume) return;

    const newName = renameValue.trim();

    if (resume.source === 'local') {
      const ok = await saveResumeToLocal({
        id: resume.id,
        name: newName,
        content: resume.content,
        settings: resume.settings,
        updated_at: new Date().toISOString(),
      });
      if (ok) {
        showToast(t('list.renamed'), 'success');
        await refreshList();
      } else {
        showToast(t('list.renameLocalFailed'), 'error');
      }
    } else {
      try {
        await updateResumeName(renamingId, newName);
        showToast(t('list.renamed'), 'success');
        await refreshList();
      } catch {
        showToast(t('list.renameFailed'), 'error');
      }
    }
    setRenamingId(null);
  }, [renamingId, renameValue, resumes, setRenamingId, showToast, refreshList, t]);

  const handleNewResume = useCallback(() => {
    setMenuOpenId(null);
    setRenamingId(null);
    setShowCreateModal(true);
  }, [setMenuOpenId, setRenamingId]);

  const openSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);


  return {
    showCreateModal, setShowCreateModal, handleCardPreviewClick, handleDeleteClick,
    handleCopy, handleUploadToCloud, handleRenameStart, handleRenameCancel,
    handleRenameSubmit, handleNewResume, openSettings,
  };
}
