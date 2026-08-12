import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Pencil, Trash2, Upload } from 'lucide-react';
import type { DisplayResume } from './useResumeLibrary';

interface ResumeActionsMenuProps {
  menuOpenId: string | null;
  menuPos: { top: number; left: number };
  menuRef: RefObject<HTMLDivElement>;
  resumes: DisplayResume[];
  onClose: () => void;
  onCopy: (id: string) => void | Promise<void>;
  onRename: (id: string) => void;
  onUpload: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function ResumeActionsMenu({
  menuOpenId, menuPos, menuRef, resumes, onClose, onCopy, onRename, onUpload, onDelete,
}: ResumeActionsMenuProps) {
  const { t } = useTranslation(['resume', 'common']);
  if (!menuOpenId) return null;

  return (
createPortal(
          <>
            {/* Invisible backdrop to catch clicks outside */}
            <div
              className="fixed inset-0 z-[100]"
              onClick={onClose}
              onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />
            {/* Dropdown */}
            <div
              ref={menuRef}
              className="resume-popover-enter fixed z-[101] w-[148px] overflow-hidden rounded-[14px] border border-slate-200/70 bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                onClick={() => onCopy(menuOpenId)}
                className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-[rgb(236,238,253)] dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <Copy className="h-4 w-4 text-slate-400 transition-colors group-hover/menu:text-slate-600 dark:text-slate-500 dark:group-hover/menu:text-slate-300" />
                {t('list.copyResumeText')}
              </button>
              <button
                type="button"
                onClick={() => onRename(menuOpenId)}
                className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-[rgb(236,238,253)] dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
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
                        onUpload(menuOpenId);
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
                  onClose();
                  onDelete(menuOpenId);
                }}
                className="group/menu flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4 text-red-400 transition-colors group-hover/menu:text-red-500 dark:text-red-500 dark:group-hover/menu:text-red-300" />
                {t('list.deleteResumeText')}
              </button>
            </div>
          </>,
          document.body,
        )
  );
}
