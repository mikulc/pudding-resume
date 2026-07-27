import type { MouseEvent, MutableRefObject, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Clock, Cloud, HardDrive, MoreHorizontal } from 'lucide-react';
import { getLayoutName } from '../../registry/layouts';
import { Tooltip } from '../../components/common/Tooltip';
import { LazyResumeCardPreview } from '../../components/preview/ResumeCardPreview';
import type { DisplayResume } from './useResumeLibrary';

interface ResumeCardProps {
  resume: DisplayResume;
  isMenuOpen: boolean;
  isRenaming: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  menuBtnRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  renamePopoverRef: RefObject<HTMLDivElement | null>;
  renameValue: string;
  setRenameValue: (value: string) => void;
  onPreview: (id: string) => void;
  onMenuToggle: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

export function formatResumeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return format(date, 'yyyy-MM-dd HH:mm');
}

export function ResumeCard({
  resume, isMenuOpen, isRenaming, scrollContainerRef, menuBtnRefs,
  renamePopoverRef, renameValue, setRenameValue, onPreview, onMenuToggle,
  onRenameSubmit, onRenameCancel,
}: ResumeCardProps) {
  const { t } = useTranslation(['resume', 'common']);

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
                            onClick={(e) => { e.stopPropagation(); onPreview(resume.id); }}
                            className="resume-grid-card-preview absolute inset-0 z-0 h-full w-full cursor-pointer block border-0 bg-white p-0 overflow-hidden"
                          >
                            <div className="resume-grid-card-preview-surface absolute inset-0 bg-gray-100">
                              <LazyResumeCardPreview
                                content={resume.content}
                                theme={resume.settings}
                                scrollRootRef={scrollContainerRef as RefObject<Element>}
                              />
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
                                onClick={(e) => onMenuToggle(e, resume.id)}
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
                            ref={renamePopoverRef as RefObject<HTMLDivElement>}
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
                                if (e.key === 'Enter') onRenameSubmit();
                                if (e.key === 'Escape') onRenameCancel();
                              }}
                              className="rename-input mb-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 transition-colors placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500/70 dark:focus:bg-slate-900 dark:focus:ring-blue-500/15"
                              maxLength={100}
                            />
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={onRenameCancel}
                                className="h-8 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                              >
                                {t('common:button.cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={onRenameSubmit}
                                className="h-8 rounded-[10px] bg-slate-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                              >
                                {t('common:button.ok')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
  );
}
