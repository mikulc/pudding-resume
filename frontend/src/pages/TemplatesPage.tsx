import { useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { useToast } from '../components/common/Toast';
import { ResumeCardPreview } from '../components/preview/ResumeCardPreview';
import {
  ALL_THEME_CATEGORY,
  buildResumePreviewTheme,
  deriveCategories,
  filterResumeThemeEntries,
  useResumeThemeLibrary,
} from '../components/layout/ResumeThemePicker';
import { createResume, setResumeCache } from '../api/resumes';
import { getAuthToken } from '../utils/api';
import { isLocalStorageEnabled } from '../context/AuthContext';
import { generateLocalId, saveResumeToLocal } from '../utils/localStorage';
import { setPreviewCache } from '../utils/previewCache';
import {
  clearResumeLaunchSession,
  stageDraftResumeLaunch,
  stageLocalResumeLaunch,
} from '../utils/resumeLaunch';
import { createEmptyResumeData, createInitialThemeSettings } from '../utils/resumeDraft';
import { getLayoutDefaultColor, getLayoutName } from '../registry/layouts';
import type { StyleLibraryEntry } from '../types/resume';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [creatingLayoutId, setCreatingLayoutId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(ALL_THEME_CATEGORY);
  const { entries, demoContent, loading } = useResumeThemeLibrary(!creatingLayoutId);

  const categories = useMemo(() => deriveCategories(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterResumeThemeEntries(entries, activeCategory),
    [entries, activeCategory],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  const handleCreateFromTemplate = useCallback(async (entry: StyleLibraryEntry) => {
    if (creatingLayoutId) return;

    clearResumeLaunchSession();

    const layoutId = entry.layoutId;
    const themeColor = entry.previewColors?.accentBar || getLayoutDefaultColor(layoutId);
    const resumeData = demoContent ?? createEmptyResumeData();
    const settings = createInitialThemeSettings(layoutId, themeColor);
    const resumeName = '未命名简历';

    flushSync(() => setCreatingLayoutId(layoutId));

    try {
      if (getAuthToken()) {
        const created = await createResume(resumeData, resumeName, settings);
        setResumeCache(created.id, {
          id: created.id,
          name: created.name,
          content: created.content || resumeData,
          settings: created.settings || settings,
        });
        navigate(`/resume/${created.id}`);
        return;
      }

      if (isLocalStorageEnabled()) {
        const localId = generateLocalId();
        const saved = await saveResumeToLocal({
          id: localId,
          name: resumeName,
          content: resumeData,
          settings,
          updated_at: new Date().toISOString(),
        });

        if (!saved) {
          throw new Error('保存失败，请稍后重试');
        }

        stageLocalResumeLaunch({ id: localId, name: resumeName, data: resumeData, settings });
        setPreviewCache(localId, resumeData, settings);
        navigate(`/resume/${localId}`);
        return;
      }

      stageDraftResumeLaunch({ layoutId, themeColor, templateData: demoContent ?? undefined });
      navigate('/resume');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
      showToast(message, 'error');
      setCreatingLayoutId(null);
    }
  }, [creatingLayoutId, demoContent, navigate, showToast]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 flex flex-col theme-color-transition">
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg-header)] backdrop-blur-xl border-b border-gray-100 theme-color-transition">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-14 sm:pt-[60px] min-h-0">
        {creatingLayoutId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <span className="text-sm">正在进入编辑器...</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1e2836] rounded-full animate-spin" />
              <p className="text-sm">正在加载模板主题...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0">
              <div className="max-w-[1360px] mx-auto px-6 pb-4 pt-8">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-gray-900">
                      简历模板
                    </h1>
                    <span className="inline-flex h-6 flex-shrink-0 items-center rounded-full bg-slate-100 px-[9px] text-xs font-semibold text-[#3f5f8a]">
                      {entries.length} 份
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[#667085]">
                    选择合适的模板，快速创建你的个人简历
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[15px] font-bold tracking-normal transition-colors ${
                        activeCategory === cat
                          ? 'bg-[#2248ff] text-white dark:bg-[#fbbf24] dark:text-[#17191d]'
                          : 'text-gray-800 hover:bg-[#2248ff] hover:text-white dark:text-[color:var(--text-secondary)] dark:hover:bg-[#fbbf24] dark:hover:text-[#17191d]'
                      }`}
                    >
                      {cat === ALL_THEME_CATEGORY ? '全部' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[1360px] mx-auto px-6 py-6" data-global-toolbar-content>
                {filteredEntries.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-gray-400">
                    <p className="text-sm">暂无可用模板主题</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                    {filteredEntries.map((entry) => {
                      const previewTheme = buildResumePreviewTheme(entry);

                      return (
                        <div key={entry.id} className="relative group w-full">
                          <div className="resume-grid-card theme-color-transition w-full rounded-[22px] border border-slate-200/60 overflow-hidden relative">
                            <div className="pointer-events-none invisible" aria-hidden="true">
                              <div className="aspect-[4/5] w-full" />
                              <div className="resume-grid-card-footer-spacer" />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCreateFromTemplate(entry)}
                              className="resume-grid-card-preview absolute inset-0 z-0 h-full w-full cursor-pointer block border-0 bg-white p-0 overflow-hidden"
                              aria-label={`使用 ${entry.name} 模板`}
                            >
                              <div className="resume-grid-card-preview-surface absolute inset-0 bg-gray-100">
                                {demoContent ? (
                                  <ResumeCardPreview content={demoContent} theme={previewTheme} />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                    <div className="select-none text-center text-gray-300">
                                      <FileText className="mx-auto mb-2 h-10 w-10" />
                                      <span className="text-xs font-medium">{entry.name}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </button>

                            <div
                              className="resume-grid-card-footer absolute inset-x-0 bottom-0 z-10 p-4 border-t border-slate-100/80"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                                <h3 className="resume-card-title font-semibold text-slate-900 truncate text-sm">
                                  {entry.name}
                                </h3>
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100/70 text-slate-500 text-[10px] font-medium border border-slate-200/70">
                                  {getLayoutName(entry.layoutId)}
                                </span>
                              </div>
                              <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
                                <span className="truncate">{entry.description}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
