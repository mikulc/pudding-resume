import type { ResumeListItem, ResumeData, ThemeSettings } from '../../types/resume';
import i18n from '../i18n';
import { getDirectoryHandle, verifyPermission, type IterableDirectoryHandle } from './directory';

export function generateLocalId(): string {
  // 简单的 UUID v4 风格本地 ID
  return 'local-' + crypto.randomUUID();
}

// ==================== JSON 文件操作 ====================

/** 简历文件命名：{resume_name}_{resume_id}.json（清理文件名中的非法字符） */
function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100);
}

/** 生成本地简历文件名 */
function makeResumeFileName(resumeName: string, resumeId: string): string {
  const safeName = sanitizeFileName(resumeName || i18n.t('list.unnamedResume', { ns: 'resume' }));
  const shortId = resumeId.replace(/-/g, '').slice(0, 8);
  return `${safeName}_${shortId}.json`;
}

export interface ResumeFilePayload {
  content: ResumeData;
  settings?: ThemeSettings;
  name: string;
  id: string;
  updated_at: string;
  /** 关联的云端简历 UUID */
  cloud_uuid?: string;
}

/** 将简历数据写入本地目录的 JSON 文件 */
export async function saveResumeToLocal(payload: ResumeFilePayload): Promise<boolean> {
  const handle = await getDirectoryHandle();
  if (!handle) return false;

  if (!(await verifyPermission(handle))) return false;

  try {
    const fileName = makeResumeFileName(payload.name, payload.id);
    // 先删除旧文件（如果有同名文件，以 id 区分）
    // 查找并删除该简历 ID 的旧文件
    await removeOldResumeFiles(handle, payload.id);

    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const jsonContent = JSON.stringify(
      {
        id: payload.id,
        name: payload.name,
        content: payload.content,
        settings: payload.settings,
        updated_at: payload.updated_at,
        source: 'local',
        ...(payload.cloud_uuid ? { cloud_uuid: payload.cloud_uuid } : {}),
      },
      null,
      2,
    );
    await writable.write(jsonContent);
    await writable.close();
    return true;
  } catch (err) {
    console.error('[LocalStorage] Failed to write resume file:', err);
    return false;
  }
}

/** 删除目录下指定简历 ID 关联的旧文件 */
async function removeOldResumeFiles(handle: FileSystemDirectoryHandle, resumeId: string): Promise<void> {
  const shortId = resumeId.replace(/-/g, '').slice(0, 8);
  try {
    // 遍历目录，查找包含该 ID 的文件
    for await (const [name] of (handle as unknown as IterableDirectoryHandle).entries()) {
      if (name.endsWith('.json') && name.includes(shortId)) {
        try {
          await handle.removeEntry(name);
        } catch {
          // 忽略单个文件删除失败
        }
      }
    }
  } catch {
    // 忽略遍历失败
  }
}

/** 读取目录下所有 `.json` 简历文件，返回 ResumeListItem 数组 */
export async function loadLocalResumes(): Promise<ResumeListItem[]> {
  const handle = await getDirectoryHandle();
  if (!handle) return [];

  if (!(await verifyPermission(handle))) return [];

  const results: ResumeListItem[] = [];

  try {
    // 方案：使用 values() 迭代器遍历
    const entries: [string, FileSystemFileHandle][] = [];
    for await (const entry of (handle as unknown as IterableDirectoryHandle).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        entries.push([entry.name, entry as FileSystemFileHandle]);
      }
    }

    for (const [fileName, fileHandle] of entries) {
      try {
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        // 结构校验：必须包含 content 字段
        if (!data || typeof data.content !== 'object') {
          console.warn(`[LocalStorage] Skipping non-resume JSON file: ${fileName}`);
          continue;
        }

        results.push({
          id: data.id || `local-${fileName}`,
          name: data.name || fileName.replace('.json', ''),
          content: data.content,
          settings: data.settings,
          updated_at: data.updated_at || new Date(file.lastModified).toISOString(),
          source: 'local' as const,
          local_file_name: fileName,
          cloud_uuid: typeof data.cloud_uuid === 'string' ? data.cloud_uuid : undefined,
        });
      } catch (err) {
        console.warn(`[LocalStorage] Failed to read file: ${fileName}`, err);
      }
    }
  } catch (err) {
    console.error('[LocalStorage] Failed to iterate directory:', err);
  }

  // 按 updated_at 降序排序
  results.sort((a, b) => {
    const da = new Date(a.updated_at).getTime();
    const db = new Date(b.updated_at).getTime();
    return db - da;
  });

  return results;
}

/** 删除本地目录中的指定简历文件 */
export async function deleteLocalResume(fileName: string): Promise<boolean> {
  const handle = await getDirectoryHandle();
  if (!handle) return false;

  if (!(await verifyPermission(handle))) return false;

  try {
    await handle.removeEntry(fileName);
    return true;
  } catch (err) {
    console.error('[LocalStorage] Failed to delete local file:', err);
    return false;
  }
}
