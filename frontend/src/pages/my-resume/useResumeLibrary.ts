import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getResumeList, type ResumeListResponse } from '../../api/resumes';
import { useToast } from '../../components/common/Toast';
import { isLocalStorageEnabled } from '../../context/AuthContext';
import { loadLocalResumes } from '../../utils/localStorage';
import type { ResumeListItem } from '../../types/resume';
import { calculateResumeListTotal } from '../resumeListUtils';

export type DisplayResume = ResumeListItem & {
  _hasCloud: boolean;
  _hasLocal: boolean;
};

const RESUME_PAGE_SIZE = 8;
const LOAD_MORE_ROOT_MARGIN_PX = 480;

function emptyResumePage(offset = 0): ResumeListResponse {
  return {
    resumes: [], total: 0, limit: RESUME_PAGE_SIZE, offset, has_more: false,
  };
}

export function useResumeLibrary(isLoggedIn: boolean, sessionLoading: boolean) {
  const { showToast } = useToast();
  const { t } = useTranslation(['resume', 'common', 'homepage']);
  const [resumes, setResumes] = useState<DisplayResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalResumeCount, setTotalResumeCount] = useState(0);
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
      setTotalResumeCount(calculateResumeListTotal(cloudPage.total, localList, isLoggedIn));

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
    if (sessionLoading) return;
    fetchResumes();
  }, [fetchResumes, sessionLoading]);

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

  return {
    resumes,
    loading,
    loadingMore,
    hasMore,
    totalResumeCount,
    error,
    scrollContainerRef,
    loadMoreTriggerRef,
    handleResumeListScroll,
    handleResumeListWheel,
    refreshList,
  };
}
