/**
 * 本地存储工具模块 — 封装 File System Access API
 * 支持：目录选择、句柄 IndexedDB 持久化、JSON 简历文件读写、文件列表读取
 */

import type { ResumeListItem, ResumeData, ThemeSettings } from '../types/resume';
import i18n from './i18n';

// IndexedDB 配置
const DB_NAME = 'resume-local-storage';
const DB_VERSION = 1;
const STORE_NAME = 'directory-handles';

// ==================== File System Access API 检测 ====================

/** 检测浏览器是否支持 File System Access API */
export function checkFileSystemAccess(): boolean {
  return 'showDirectoryPicker' in window;
}

// ==================== IndexedDB 句柄持久化 ====================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 将目录句柄存储到 IndexedDB */
export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, 'current-directory');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 从 IndexedDB 恢复目录句柄，失败返回 null */
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('current-directory');
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/** 清除 IndexedDB 中存储的目录句柄 */
export async function revokeDirectory(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('current-directory');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 忽略清除失败
  }
}

// ==================== 目录选择 ====================

export interface DirectorySelectionResult {
  /** 目录句柄 */
  handle: FileSystemDirectoryHandle;
  /** 目录名称（用于 UI 展示） */
  name: string;
}

/** 打开系统目录选择器，返回目录句柄和名称 */
export async function selectDirectory(): Promise<DirectorySelectionResult | null> {
  if (!checkFileSystemAccess()) {
    throw new Error(i18n.t('localStorage.unsupported', { ns: 'settings' }));
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await storeDirectoryHandle(handle);
    return { handle, name: handle.name };
  } catch (err: unknown) {
    // 用户取消选择
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

// ==================== 权限验证 ====================

/** 验证目录读写权限，失败时清理 IndexedDB 缓存 */
async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // 检查当前权限状态
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') {
    return true;
  }
  // 尝试重新请求权限
  if ((await handle.requestPermission(opts)) === 'granted') {
    return true;
  }
  // 权限失败，清理缓存
  await revokeDirectory();
  return false;
}

// ==================== 本地 ID 生成 ====================

/** 生成简短本地简历 ID（不含连字符，便于文件名使用） */
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
    for await (const [name] of (handle as any).entries?.() ?? []) {
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
    for await (const entry of (handle as any).values?.() ?? []) {
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
