import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import {
  filterResumeThemeEntries,
  deriveCategories,
  ResumeThemeCards,
  useResumeThemeLibrary,
  ALL_THEME_CATEGORY,
} from './ResumeThemePicker';

interface Props {
  open: boolean;
  onClose: () => void;
  currentLayoutId: string;
  onApply: (layoutId: string) => Promise<void>;
}

export function ThemeDrawer({ open, onClose, currentLayoutId, onApply }: Props) {
  const { t } = useTranslation(['editor', 'common']);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL_THEME_CATEGORY);
  const [applyingLayoutId, setApplyingLayoutId] = useState<string | null>(null);
  const { entries, demoContent, loading } = useResumeThemeLibrary(open);
  const applyingRef = useRef(false);

  // 抽屉打开时重置分类
  useEffect(() => {
    if (open) {
      setActiveCategory(ALL_THEME_CATEGORY);
    }
  }, [open]);

  const drawerWidth = 1060;

  // 控制滑入/滑出动画
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // 按分类过滤
  const filteredEntries = useMemo(() => {
    return filterResumeThemeEntries(entries, activeCategory);
  }, [entries, activeCategory]);

  const handleSelect = useCallback(async (layoutId: string) => {
    // 防止重复点击：如果正在应用中或已经是当前主题，则忽略
    if (applyingRef.current || layoutId === currentLayoutId) return;

    applyingRef.current = true;
    setApplyingLayoutId(layoutId);

    try {
      await onApply(layoutId);
      // 应用成功后关闭抽屉
      onClose();
    } catch {
      // 应用失败 — 恢复原主题，由调用方展示错误提示
      setApplyingLayoutId(null);
    } finally {
      applyingRef.current = false;
      setApplyingLayoutId(null);
    }
  }, [currentLayoutId, onApply, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  return createPortal(
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-[910] bg-black/20 backdrop-blur-sm transition-all duration-300"
        style={{
          opacity: isAnimating ? 1 : 0,
          pointerEvents: isAnimating ? 'auto' : 'none',
        }}
        onClick={handleCancel}
      />

      {/* 抽屉主体 */}
      <div
        className="fixed top-0 bottom-0 right-0 z-[920] bg-white flex flex-col shadow-2xl dark:bg-[color:var(--bg-panel)]"
        style={{
          width: `${drawerWidth}px`,
          maxWidth: '100vw',
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-[color:var(--border-soft)]">
          <button
            onClick={handleCancel}
            className="theme-drawer-back-button p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors dark:text-[color:var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-[color:var(--text-primary)]">{t('document.resumeTheme.title')}</h2>
        </div>

        {/* Category Tabs */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-gray-50 dark:border-[color:var(--border-soft)]">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {deriveCategories(entries).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[15px] font-bold tracking-normal transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#2248ff] text-white dark:bg-[#fbbf24] dark:text-[#17191d]'
                    : 'text-gray-800 hover:bg-[#2248ff] hover:text-white dark:text-[color:var(--text-secondary)] dark:hover:bg-[#fbbf24] dark:hover:text-[#17191d]'
                }`}
              >
                {cat === ALL_THEME_CATEGORY ? t('themePicker.all') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 hide-scrollbar">
          <ResumeThemeCards
            entries={filteredEntries}
            demoContent={demoContent}
            loading={loading}
            selectedLayoutId={currentLayoutId}
            currentLayoutId={currentLayoutId}
            showCurrentBadge
            onSelect={handleSelect}
            applyingLayoutId={applyingLayoutId}
            gridClassName="grid grid-cols-[repeat(auto-fill,320px)] gap-4"
            loadingClassName="h-full"
            emptyText={t('themePicker.emptyCategory')}
            cardClassName="rounded-[22px] border border-slate-200/60 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]"
          />
        </div>

      </div>
    </>,
    document.body,
  );
}
