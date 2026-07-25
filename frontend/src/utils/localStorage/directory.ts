/**
 * 本地存储工具模块 — 封装 File System Access API
 * 支持：目录选择、句柄 IndexedDB 持久化、JSON 简历文件读写、文件列表读取
 */
import i18n from '../i18n';


// IndexedDB 配置
const DB_NAME = 'resume-local-storage';
const DB_VERSION = 1;
const STORE_NAME = 'directory-handles';

export type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  values: () => AsyncIterableIterator<FileSystemHandle>;
};

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
export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
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
