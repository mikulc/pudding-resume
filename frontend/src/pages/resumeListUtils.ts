import type { ResumeListItem } from '../types/resume';

type LocalResumeLink = Pick<ResumeListItem, 'cloud_uuid'>;

/**
 * Counts the combined cloud/local list without counting a linked local copy twice.
 * Additional local files pointing at the same cloud resume remain standalone cards.
 */
export function calculateResumeListTotal(
  cloudTotal: number,
  localResumes: LocalResumeLink[],
  isLoggedIn: boolean,
): number {
  if (!isLoggedIn) return localResumes.length;

  const linkedCloudIds = new Set<string>();
  let standaloneLocalCount = 0;

  for (const local of localResumes) {
    if (!local.cloud_uuid) {
      standaloneLocalCount += 1;
      continue;
    }

    if (linkedCloudIds.has(local.cloud_uuid)) {
      standaloneLocalCount += 1;
      continue;
    }

    linkedCloudIds.add(local.cloud_uuid);
  }

  return cloudTotal + standaloneLocalCount;
}
