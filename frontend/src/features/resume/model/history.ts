import type { ResumeData, ThemeSettings } from '../../../types/resume';

export const MAX_HISTORY = 50;

export interface DocumentHistorySnapshot {
  data: ResumeData;
  theme: ThemeSettings;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDocumentSnapshot(
  data: ResumeData,
  theme: ThemeSettings,
): DocumentHistorySnapshot {
  return deepClone({ data, theme });
}

export function getSnapshotKey(snapshot: DocumentHistorySnapshot): string {
  return JSON.stringify(snapshot);
}
