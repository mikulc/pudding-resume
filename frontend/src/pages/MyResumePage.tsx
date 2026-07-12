import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertCircle, Clock, Trash2, Cloud, HardDrive, Plus, MoreHorizontal, Copy, Pencil, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { getResumeList, deleteResume, copyResume, updateResumeName } from '../api/resumes';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmModal';
import { getLayoutName } from '../registry/layouts';
import { Tooltip } from '../components/common/Tooltip';
import { useAuth, isLocalStorageEnabled } from '../context/AuthContext';
import { loadLocalResumes, deleteLocalResume, saveResumeToLocal, generateLocalId } from '../utils/localStorage';
import { ImportButton } from '../components/import/ImportButton';
import { CreateResumeModal } from '../components/resume/CreateResumeModal';
import { ResumeCardPreview } from '../components/preview/ResumeCardPreview';
import { ResumePreviewSkeleton } from '../components/preview/ResumePreviewSkeleton';
import {
  clearResumeLaunchSession,
  stageExistingResumeLaunch,
  stageLocalResumeLaunch,
} from '../utils/resumeLaunch';
import { createResume } from '../api/resumes';
import type { ResumeListResponse } from '../api/resumes';
import type { ResumeListItem } from '../types/resume';

/** 灞曠ず鐢ㄧ殑绠€鍘嗛」锛堝悎骞朵簯绔?鏈湴鍚庯級 */
type DisplayResume = ResumeListItem & {
  _hasCloud: boolean;
  _hasLocal: boolean;
};

const MENU_WIDTH = 148;
const MENU_ESTIMATED_HEIGHT = 196;
const MENU_GAP = 8;
const MENU_VIEWPORT_PADDING = 8;
const RESUME_PAGE_SIZE = 8;
const LOAD_MORE_ROOT_MARGIN_PX = 480;

function emptyResumePage(offset = 0): ResumeListResponse {
  return {
    resumes: [],
    total: 0,
    limit: RESUME_PAGE_SIZE,
    offset,
    has_more: false,
  };
}

/** 简历卡片底部时间：今天显示 "HH:mm 更新"，其它显示 "M月d日 HH:mm"。 */
function formatResumeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return `${format(date, 'HH:mm')} 更新`;
  }
  return format(date, 'M月d日 HH:mm');
}

export default function MyResumePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation(['resume', 'common', 'homepage']);
  const showHintCard = !isLoggedIn && !isLocalStorageEnabled();
  const [resumes, setResumes] = useState<DisplayResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const localResumesRef = useRef<ResumeListItem[]>([]);
  const usedLocalIdsRef = useRef<Set<string>>(new Set());
  const nextCloudOffsetRef = useRef(0);
  const hasMoreCloudRef = useRef(false);
  const nextLocalIndexRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingPageRef = useRef(false);
  const hasScrolledAfterLoadRef = useRef(false);
  const requestSeqRef = useRef(0);

  // Dropdown menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const renamePopoverRef = useRef<HTMLDivElement | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Create resume modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch resumes on mount
  const mergeCloudResumes = useCallback((cloudList: ResumeListItem[]): DisplayResume[] => {
    return cloudList.map((cloud) => {
      const item: DisplayResume = { ...cloud, source: 'cloud' as const, _hasCloud: true, _hasLocal: false };
      const matchingLocal = localResumesRef.current.find((local) => local.cloud_uuid === cloud.id);
      if (matchingLocal) {
        usedLocalIdsRef.current.add(matchingLocal.id);
        item._hasLocal = true;
        item.local_file_name = matchingLocal.local_file_name;
        item.cloud_uuid = cloud.id;
      }
      return item;
    });
  }, []);

  const hasRemainingLocalResumes = useCallback(() => {
    const usedLocalIds = usedLocalIdsRef.current;
    const localList = localResumesRef.current;
    for (let index = nextLocalIndexRef.current; index < localList.length; index += 1) {
      if (!usedLocalIds.has(localList[index].id)) return true;
    }
    return false;
  }, []);

  const syncHasMore = useCallback(() => {
    const nextHasMore = hasMoreCloudRef.current || hasRemainingLocalResumes();
    hasMoreRef.current = nextHasMore;
    setHasMore(nextHasMore);
  }, [hasRemainingLocalResumes]);

  const takeLocalResumePage = useCallback((limit: number): DisplayResume[] => {
    const page: DisplayResume[] = [];
    const usedLocalIds = usedLocalIdsRef.current;
    const localList = localResumesRef.current;
    let index = nextLocalIndexRef.current;

    while (index < localList.length && page.length < limit) {
      const local = localList[index];
      index += 1;
      if (usedLocalIds.has(local.id)) continue;
      page.push({ ...local, source: 'local' as const, _hasCloud: false, _hasLocal: true });
    }

    nextLocalIndexRef.current = index;
    return page;
  }, []);

  const fetchResumes = useCallback(async () => {
    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    loadingPageRef.current = true;
    hasScrolledAfterLoadRef.current = false;
    hasMoreRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setHasMore(false);
    setError(null);

    try {
      const [cloudPage, localList] = await Promise.all([
        isLoggedIn
          ? getResumeList({ limit: RESUME_PAGE_SIZE, offset: 0 }).catch(() => emptyResumePage(0))
          : Promise.resolve(emptyResumePage(0)),
        isLocalStorageEnabled() ? loadLocalResumes() : Promise.resolve([] as ResumeListItem[]),
      ]);

      if (requestSeqRef.current !== requestId) return;

      localResumesRef.current = localList;
      usedLocalIdsRef.current = new Set<string>();
      nextLocalIndexRef.current = 0;

      const nextCloudOffset = cloudPage.offset + cloudPage.resumes.length;
      nextCloudOffsetRef.current = nextCloudOffset;
      hasMoreCloudRef.current = isLoggedIn && (cloudPage.has_more || nextCloudOffset < cloudPage.total);

      const firstPage = mergeCloudResumes(cloudPage.resumes);
      if (!hasMoreCloudRef.current && firstPage.length < RESUME_PAGE_SIZE) {
        firstPage.push(...takeLocalResumePage(RESUME_PAGE_SIZE - firstPage.length));
      }

      setResumes(firstPage);
      syncHasMore();
    } catch {
      if (requestSeqRef.current === requestId) {
        setError(t('list.loadFailedDesc'));
      }
    } finally {
      if (requestSeqRef.current === requestId) {
        loadingPageRef.current = false;
        setLoading(false);
      }
    }
  }, [isLoggedIn, mergeCloudResumes, syncHasMore, t, takeLocalResumePage]);

  const loadMoreResumes = useCallback(async () => {
    if (loadingPageRef.current || !hasMoreRef.current) return;

    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    loadingPageRef.current = true;
    setLoadingMore(true);

    try {
      let nextPage: DisplayResume[] = [];

      if (isLoggedIn && hasMoreCloudRef.current) {
        const cloudPage = await getResumeList({
          limit: RESUME_PAGE_SIZE,
          offset: nextCloudOffsetRef.current,
        });

        if (requestSeqRef.current !== requestId) return;

        const nextCloudOffset = cloudPage.offset + cloudPage.resumes.length;
        nextCloudOffsetRef.current = nextCloudOffset;
        hasMoreCloudRef.current = cloudPage.has_more || nextCloudOffset < cloudPage.total;
        nextPage = mergeCloudResumes(cloudPage.resumes);
      }

      if (!hasMoreCloudRef.current && nextPage.length < RESUME_PAGE_SIZE) {
        nextPage.push(...takeLocalResumePage(RESUME_PAGE_SIZE - nextPage.length));
      }

      if (nextPage.length > 0) {
        setResumes((current) => [...current, ...nextPage]);
      }
      syncHasMore();
    } catch {
      showToast(t('list.loadFailedDesc'), 'error');
    } finally {
      if (requestSeqRef.current === requestId) {
        loadingPageRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [isLoggedIn, mergeCloudResumes, showToast, syncHasMore, t, takeLocalResumePage]);

  const isLoadMoreTriggerNearViewport = useCallback((container: HTMLDivElement) => {
    const remainingScrollDistance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return remainingScrollDistance <= LOAD_MORE_ROOT_MARGIN_PX;
  }, []);

  const handleResumeListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop <= 0) return;
    hasScrolledAfterLoadRef.current = true;

    if (isLoadMoreTriggerNearViewport(event.currentTarget)) {
      void loadMoreResumes();
    }
  }, [isLoadMoreTriggerNearViewport, loadMoreResumes]);

  const handleResumeListWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY <= 0) return;
    hasScrolledAfterLoadRef.current = true;

    if (isLoadMoreTriggerNearViewport(event.currentTarget)) {
      void loadMoreResumes();
    }
  }, [isLoadMoreTriggerNearViewport, loadMoreResumes]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  useEffect(() => {
    if (loading || !hasMore) return;

    const root = scrollContainerRef.current;
    const target = loadMoreTriggerRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver((entries) => {
      if (hasScrolledAfterLoadRef.current && entries.some((entry) => entry.isIntersecting)) {
        void loadMoreResumes();
      }
    }, {
      root,
      rootMargin: `${LOAD_MORE_ROOT_MARGIN_PX}px 0px`,
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMoreResumes, loading, resumes.length]);

  // Shared refresh helper
  const refreshList = useCallback(async () => {
    await fetchResumes();
  }, [fetchResumes]);

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
  }, [resumes, showToast, refreshList, t]);

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
  }, [resumes, showToast, refreshList, t]);

  // Rename handler 鈥?open rename mode
  const handleRenameStart = useCallback((id: string) => {
    setMenuOpenId(null);
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;
    setRenamingId(id);
    setRenameValue(resume.name);
  }, [resumes]);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

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
  }, [renamingId, renameValue, resumes, showToast, refreshList, t]);

  const getMenuPosition = useCallback((id: string) => {
    const btn = menuBtnRefs.current[id];
    if (!btn || !document.body.contains(btn)) return null;

    const rect = btn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    if (rect.bottom < 0 || rect.top > viewportH) return null;

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow =
      spaceBelow >= MENU_ESTIMATED_HEIGHT + MENU_GAP || spaceBelow >= spaceAbove;

    const rawTop = showBelow
      ? rect.bottom + MENU_GAP
      : rect.top - MENU_ESTIMATED_HEIGHT - MENU_GAP;
    const maxTop = Math.max(
      MENU_VIEWPORT_PADDING,
      viewportH - MENU_ESTIMATED_HEIGHT - MENU_VIEWPORT_PADDING,
    );
    const top = Math.min(Math.max(MENU_VIEWPORT_PADDING, rawTop), maxTop);

    let left = rect.right - MENU_WIDTH;
    if (left < MENU_VIEWPORT_PADDING) left = MENU_VIEWPORT_PADDING;
    if (left + MENU_WIDTH > viewportW - MENU_VIEWPORT_PADDING) {
      left = viewportW - MENU_WIDTH - MENU_VIEWPORT_PADDING;
    }

    return { top, left };
  }, []);

  const updateMenuPosition = useCallback((id: string) => {
    const nextPosition = getMenuPosition(id);
    if (!nextPosition) {
      setMenuOpenId((currentId) => (currentId === id ? null : currentId));
      return;
    }
    setMenuPos(nextPosition);
  }, [getMenuPosition]);

  // Open menu on button click and position it above or below based on available space.
  const handleMenuToggle = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRenamingId(null);
    if (menuOpenId === id) {
      setMenuOpenId(null);
      return;
    }
    const nextPosition = getMenuPosition(id);
    if (!nextPosition) return;
    setMenuPos(nextPosition);
    setMenuOpenId(id);
  }, [getMenuPosition, menuOpenId]);

  useEffect(() => {
    if (!menuOpenId) return;

    let frameId: number | null = null;
    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateMenuPosition(menuOpenId);
      });
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [menuOpenId, updateMenuPosition]);

  // Close menu on click outside
  const handleMenuClose = useCallback(() => {
    setMenuOpenId(null);
  }, []);

  useEffect(() => {
    if (!menuOpenId && !renamingId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpenId(null);
      setRenamingId(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpenId, renamingId]);

  useEffect(() => {
    if (!renamingId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (renamePopoverRef.current?.contains(target)) return;
      setRenamingId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [renamingId]);

  const handleNewResume = useCallback(() => {
    setMenuOpenId(null);
    setRenamingId(null);
    setShowCreateModal(true);
  }, []);

  const openSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 flex flex-col theme-color-transition">
      {/* ========== Header ========== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg-header)] backdrop-blur-xl border-b border-gray-100 theme-color-transition">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth settingsShortcut={{ label: t('list.settings'), onClick: openSettings }} />
            <TopNavLinks />
          </div>
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="flex-1 flex flex-col pt-14 sm:pt-[60px] min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1e2836] rounded-full animate-spin" />
              <p className="text-sm">{t('list.loadingResumes')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-gray-500 max-w-md text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700 mb-1">{t('list.loadFailed')}</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
              <button
                onClick={fetchResumes}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors active:scale-[0.97]"
              >
                <RefreshCw className="w-4 h-4" />
                {t('list.reload')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Toolbar: Title + Actions */}
            <div className="flex-shrink-0">
              {/* Local Storage Hint Card 鈥?only for non-logged-in users without local storage */}
              {showHintCard && (
                <div className="max-w-[1360px] mx-auto px-6 pt-5">
                  <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50/60 px-4 py-2.5 flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-600 truncate">{t('list.localStorageHint')}</span>
                    <button
                      onClick={openSettings}
                      className="flex-shrink-0 px-3 py-1 rounded-lg border border-orange-300 text-orange-500 text-xs font-medium hover:bg-orange-50 transition-colors active:scale-[0.97] whitespace-nowrap"
                    >
                      {t('list.goConfig')}
                    </button>
                  </div>
                </div>
              )}
              <div
                className={`mx-auto flex max-w-[1360px] flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${showHintCard ? 'pt-4' : 'pt-8'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-gray-900">
                      {t('list.myResumes')}
                    </h1>
                    <span className="inline-flex h-6 flex-shrink-0 items-center rounded-full bg-slate-100 px-[9px] text-xs font-semibold text-[#3f5f8a]">
                      {t('list.resumeCount', { count: resumes.length })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[#667085]">
                    {t('list.pageDescription')}
                  </p>
                </div>
                <div className="w-full flex-shrink-0 sm:w-auto">
                  <ImportButton onImportComplete={refreshList} />
                </div>
              </div>
            </div>

            {/* Resume Grid */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto"
              onScroll={handleResumeListScroll}
              onWheel={handleResumeListWheel}
            >
              <div className="max-w-[1360px] mx-auto px-6 pb-6 pt-6" data-global-toolbar-content>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                  {/* New Resume Card 鈥?always shown */}
                  <button
                    type="button"
                    onClick={handleNewResume}
                    className="theme-color-transition new-resume-card resume-blank-card relative w-full text-left rounded-[22px] border border-dashed border-slate-200/80 cursor-pointer flex flex-col overflow-hidden group"
                  >
                    <div className="w-full aspect-[4/5] flex-none" aria-hidden="true" />
                    <div className="invisible flex-none p-4 border-t" aria-hidden="true">
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <span className="h-5 w-32" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="h-4 w-40" />
                      </div>
                    </div>
                    <div className="theme-color-transition new-resume-card-surface absolute inset-0">
                      <div className="absolute inset-x-4 top-4 bottom-4">
                        <ResumePreviewSkeleton variant="create" />
                      </div>

                      <div className="new-resume-card-cta absolute inset-0 flex items-center justify-center">
                        <div className="new-resume-card-cta-content theme-color-transition flex flex-col items-center gap-4 text-gray-400">
                          <div className="theme-color-transition new-resume-plus-box w-16 h-16 rounded-[20px] flex items-center justify-center">
                            <Plus className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="resume-card-title theme-color-transition text-base font-semibold text-gray-500">
                              {t('list.newResume')}
                            </p>
                            <p className="theme-color-transition text-xs text-gray-400 mt-1">
                              {t('list.newResumeDesc')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {resumes.map((resume) => {
                    const isMenuOpen = menuOpenId === resume.id;
                    const isRenaming = renamingId === resume.id;

                    return (
                      <div
                        key={resume.id}
                        className="relative group w-full"
                      >
                        {/* 缁熶竴鍗＄墖瀹瑰櫒 */}
                        <div className="resume-grid-card theme-color-transition w-full rounded-[22px] border border-slate-200/60 overflow-hidden relative">
                          <div className="pointer-events-none invisible" aria-hidden="true">
                            <div className="aspect-[4/5] w-full" />
                            <div className="resume-grid-card-footer-spacer" />
                          </div>
                          {/* 涓婃柟锛氱畝鍘嗛瑙堝尯鍩?鈥?鍙偣鍑昏繘鍏ョ紪杈戦〉 */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCardPreviewClick(resume.id); }}
                            className="resume-grid-card-preview absolute inset-0 z-0 h-full w-full cursor-pointer block border-0 bg-white p-0 overflow-hidden"
                          >
                            <div className="resume-grid-card-preview-surface absolute inset-0 bg-gray-100">
                              <ResumeCardPreview content={resume.content} theme={resume.settings} />
                            </div>
                          </button>

                          {/* 涓嬫柟锛氱畝鍘嗕俊鎭尯鍩?鈥?涓嶈繘鍏ョ紪杈戦〉锛屾瘺鐜荤拑瑕嗙洊鍦ㄩ瑙堝尯搴曢儴 */}
                          <div
                            className="resume-grid-card-footer absolute inset-x-0 bottom-0 z-10 px-4 py-3.5 border-t border-slate-200/70"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="resume-card-title font-semibold text-slate-900 truncate text-[15px] leading-tight">
                                {resume.name}
                              </h3>
                              {resume.settings?.layoutId && (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-500 border border-slate-200/60">
                                  {getLayoutName(resume.settings.layoutId)}
                                </span>
                              )}
                              {/* ... Menu Button 鈥?pushed to right, hidden during rename */}
                              <span className="ml-auto flex-shrink-0">
                              <Tooltip content={t('list.moreActions')}>
                              <button
                                ref={(el) => { menuBtnRefs.current[resume.id] = el; }}
                                type="button"
                                onClick={(e) => handleMenuToggle(e, resume.id)}
                                data-open={isMenuOpen ? 'true' : undefined}
                                className={`resume-card-more-button theme-color-transition flex items-center justify-center h-7 w-7 rounded-[10px] ${
                                  isRenaming
                                    ? 'invisible'
                                    : isMenuOpen
                                      ? 'text-white dark:text-[#17191d]'
                                      : 'text-slate-400'
                                }`}
                                aria-label={t('list.moreActionsAria')}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              </Tooltip>
                              </span>
                            </div>
                            <div className="flex min-w-0 items-center gap-1.5 mt-1 text-xs text-slate-400">
                              <div className="flex min-w-0 items-center gap-1">
                                <Clock className="w-3 h-3 flex-shrink-0 text-slate-300" />
                                <span className="truncate">{formatResumeTime(resume.updated_at)}</span>
                              </div>
                              {resume._hasCloud && (
                                <>
                                  <span className="flex-shrink-0 text-slate-300">&middot;</span>
                                  <span className="inline-flex flex-shrink-0 items-center gap-1 text-slate-400">
                                    <Cloud className="w-3 h-3 text-slate-300" />
                                    {t('list.alreadyInCloud')}
                                  </span>
                                </>
                              )}
                              {!resume._hasCloud && resume._hasLocal && (
                                <>
                                  <span className="flex-shrink-0 text-slate-300">&middot;</span>
                                  <span className="inline-flex flex-shrink-0 items-center gap-1 text-slate-400">
                                    <HardDrive className="w-3 h-3 text-slate-300" />
                                    {t('list.localOnly')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>



                        {/* Rename popup 鈥?on card, near bottom-right */}
                        {isRenaming && (
                          <div
                            ref={renamePopoverRef}
                            className="resume-popover-enter absolute right-3 bottom-4 z-30 w-[240px] rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="mb-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t('list.rename')}</p>
                            <input
                              id="resume-rename-input"
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') handleRenameCancel();
                              }}
                              className="rename-input mb-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 transition-colors placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500/70 dark:focus:bg-slate-900 dark:focus:ring-blue-500/15"
                              maxLength={100}
                            />
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={handleRenameCancel}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                              >
                                {t('common:button.cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={handleRenameSubmit}
                                className="h-8 rounded-[10px] bg-slate-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                              >
                                {t('common:button.ok')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(hasMore || loadingMore) && (
                    <div
                      ref={loadMoreTriggerRef}
                      className="col-span-full flex h-10 items-center justify-center"
                      aria-live="polite"
                    >
                      {loadingMore && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
                          <span>{t('list.loadingResumes')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========== Portal Dropdown Menu ========== */}
      {menuOpenId &&
        createPortal(
          <>
            {/* Invisible backdrop to catch clicks outside */}
            <div
              className="fixed inset-0 z-[100]"
              onClick={handleMenuClose}
              onContextMenu={(e) => { e.preventDefault(); handleMenuClose(); }}
            />
            {/* Dropdown */}
            <div
              className="resume-popover-enter fixed z-[101] w-[148px] overflow-hidden rounded-[14px] border border-slate-200/70 bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                onClick={() => handleCopy(menuOpenId)}
                className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-[rgba(34,72,255,0.06)] dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <Copy className="h-4 w-4 text-slate-400 transition-colors group-hover/menu:text-slate-600 dark:text-slate-500 dark:group-hover/menu:text-slate-300" />
                {t('list.copyResumeText')}
              </button>
              <button
                type="button"
                onClick={() => handleRenameStart(menuOpenId)}
                className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-[rgba(34,72,255,0.06)] dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <Pencil className="h-4 w-4 text-slate-400 transition-colors group-hover/menu:text-slate-600 dark:text-slate-500 dark:group-hover/menu:text-slate-300" />
                {t('list.renameResumeText')}
              </button>
              {/* 涓婁紶鍒颁簯绔?鈥?濮嬬粓鏄剧ず锛屽凡鍦ㄤ簯绔垯缃伆 */}
              {(() => {
                const menuResume = resumes.find(r => r.id === menuOpenId);
                const hasCloud = menuResume?._hasCloud ?? false;
                if (hasCloud) return null;

                return (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        handleUploadToCloud(menuOpenId);
                      }}
                      className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-blue-500 transition-colors hover:bg-blue-50/70 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      <Upload className="h-4 w-4 text-blue-400 transition-colors group-hover/menu:text-blue-500 dark:text-blue-500 dark:group-hover/menu:text-blue-300" />
                      {t('list.uploadToCloud')}
                    </button>
                  </>
                );
              })()}
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpenId(null);
                  handleDeleteClick(menuOpenId);
                }}
                className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4 text-red-400 transition-colors group-hover/menu:text-red-500 dark:text-red-500 dark:group-hover/menu:text-red-300" />
                {t('list.deleteResumeText')}
              </button>
            </div>
          </>,
          document.body,
        )}

      {/* ========== Create Resume Modal ========== */}
      <CreateResumeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

    </div>
  );
}
