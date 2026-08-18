import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getResumeList, type ResumeListResponse } from '../../api/resumes';
import { isLocalStorageEnabled } from '../../context/AuthContext';
import { loadLocalResumes } from '../../utils/localStorage';
import type { ResumeListItem } from '../../types/resume';

export type DisplayResume = ResumeListItem & {
  _hasCloud: boolean;
  _hasLocal: boolean;
};

interface LocalResumePartition {
  linkedByCloudId: Map<string, ResumeListItem>;
  standalone: ResumeListItem[];
}

function emptyResumePage(limit: number, offset: number): ResumeListResponse {
  return {
    resumes: [], total: 0, limit, offset, has_more: false,
  };
}

export function partitionLocalResumes(
  localResumes: ResumeListItem[],
  isLoggedIn: boolean,
): LocalResumePartition {
  const linkedByCloudId = new Map<string, ResumeListItem>();
  const standalone: ResumeListItem[] = [];

  for (const local of localResumes) {
    if (!isLoggedIn || !local.cloud_uuid || linkedByCloudId.has(local.cloud_uuid)) {
      standalone.push(local);
      continue;
    }
    linkedByCloudId.set(local.cloud_uuid, local);
  }

  return { linkedByCloudId, standalone };
}

export function mergeCloudResumePage(
  cloudResumes: ResumeListItem[],
  linkedByCloudId: Map<string, ResumeListItem>,
): DisplayResume[] {
  return cloudResumes.map((cloud) => {
    const matchingLocal = linkedByCloudId.get(cloud.id);
    return {
      ...cloud,
      source: 'cloud' as const,
      local_file_name: matchingLocal?.local_file_name,
      cloud_uuid: matchingLocal ? cloud.id : cloud.cloud_uuid,
      _hasCloud: true,
      _hasLocal: Boolean(matchingLocal),
    };
  });
}

export function useResumeLibrary(
  isLoggedIn: boolean,
  sessionLoading: boolean,
  page: number,
  pageSize: number,
) {
  const { t } = useTranslation(['resume', 'common', 'homepage']);
  const [resumes, setResumes] = useState<DisplayResume[]>([]);
  const [totalResumeCount, setTotalResumeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const requestSeqRef = useRef(0);

  const fetchResumes = useCallback(async () => {
    const requestId = requestSeqRef.current + 1;
    const offset = (page - 1) * pageSize;
    requestSeqRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const [cloudPage, localList] = await Promise.all([
        isLoggedIn
          ? getResumeList({ limit: pageSize, offset })
            .catch(() => emptyResumePage(pageSize, offset))
          : Promise.resolve(emptyResumePage(pageSize, offset)),
        isLocalStorageEnabled() ? loadLocalResumes() : Promise.resolve([] as ResumeListItem[]),
      ]);

      if (requestSeqRef.current !== requestId) return;

      const { linkedByCloudId, standalone } = partitionLocalResumes(localList, isLoggedIn);
      const mergedCloudPage = mergeCloudResumePage(cloudPage.resumes, linkedByCloudId);
      const localOffset = Math.max(0, offset - cloudPage.total);
      const remainingSlots = Math.max(0, pageSize - mergedCloudPage.length);
      const localPage = standalone
        .slice(localOffset, localOffset + remainingSlots)
        .map((local) => ({
          ...local,
          source: 'local' as const,
          _hasCloud: false,
          _hasLocal: true,
        }));

      setResumes([...mergedCloudPage, ...localPage]);
      setTotalResumeCount(cloudPage.total + standalone.length);
    } catch {
      if (requestSeqRef.current === requestId) {
        setError(t('list.loadFailedDesc'));
      }
    } finally {
      if (requestSeqRef.current === requestId) setLoading(false);
    }
  }, [isLoggedIn, page, pageSize, t]);

  useEffect(() => {
    if (sessionLoading) return;
    void fetchResumes();
  }, [fetchResumes, sessionLoading]);

  const refreshList = useCallback(async () => {
    await fetchResumes();
  }, [fetchResumes]);

  const removeResumeFromList = useCallback((resume: DisplayResume) => {
    setResumes((current) => current.filter((item) => item.id !== resume.id));
    setTotalResumeCount((current) => Math.max(0, current - 1));
    void fetchResumes();
  }, [fetchResumes]);

  const addResumeToList = useCallback((_resume: DisplayResume) => {
    setTotalResumeCount((current) => current + 1);
    void fetchResumes();
  }, [fetchResumes]);

  return {
    resumes,
    loading,
    totalResumeCount,
    error,
    scrollContainerRef,
    refreshList,
    removeResumeFromList,
    addResumeToList,
  };
}
