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
  onPreview: (id: string) => void;
  onMenuToggle: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
}

export function formatResumeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return format(date, 'yyyy-MM-dd HH:mm');
}

export function ResumeCard({
  resume, isMenuOpen, isRenaming, scrollContainerRef, menuBtnRefs,
  onPreview, onMenuToggle,
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
                                <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[rgba(66,90,239,0.10)] px-2 py-0.5 text-[11px] font-medium text-[rgb(66,90,239)] dark:bg-[rgba(255,200,72,0.12)] dark:text-[rgb(255,200,72)]">
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
                                      ? 'text-[var(--theme-accent-foreground)]'
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



                      </div>
  );
}
