import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelLeft } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { PersonalInfoEditor, EducationEditor, SkillsEditor, WorkExperienceEditor, ProjectEditor, HonorEditor, CertificationEditor, PortfolioEditor, SummaryEditor } from '../editor/EditorComponents';
import { CustomModuleEditor } from '../editor/CustomModuleEditor';
import { FloatingContentEditor } from '../editor/FloatingContentEditor';
import { useResume, useAppUI } from '../../context/ResumeContext';
import { SectionKey, DEFAULT_SECTION_ORDER, getSystemModuleDefaultTitles } from '../../types/resume';
import { useToast } from '../common/Toast';

import { SortableSection } from './editor-panel/SortableSection';

// 模块编辑器映射表（key → Editor）
const EDITOR_MAP: Record<SectionKey, { Editor: React.ComponentType }> = {
  personal: { Editor: PersonalInfoEditor },
  summary: { Editor: SummaryEditor },
  education: { Editor: EducationEditor },
  skills: { Editor: SkillsEditor },
  work: { Editor: WorkExperienceEditor },
  projects: { Editor: ProjectEditor },
  honors: { Editor: HonorEditor },
  certifications: { Editor: CertificationEditor },
  portfolio: { Editor: PortfolioEditor },
};

const LAST_EXPANDED_SECTION_STORAGE_KEY = 'resume_editor_last_expanded_section';

// ── 模块更多操作下拉菜单（复用 field-more-menu 样式体系）──
function getStoredExpandedSection(): SectionKey {
  if (typeof window === 'undefined') return 'personal';
  const stored = window.localStorage.getItem(LAST_EXPANDED_SECTION_STORAGE_KEY);
  return DEFAULT_SECTION_ORDER.includes(stored as SectionKey) ? (stored as SectionKey) : 'personal';
}

interface EditorPanelProps {
  isMobile?: boolean;
}

export function EditorPanel({ isMobile = false }: EditorPanelProps) {
  const { data, dispatch } = useResume();
  const { uiDispatch } = useAppUI();
  const { showToast } = useToast();
  const { t } = useTranslation('editor');
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(() => getStoredExpandedSection());
  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 点击即拖拽（无需长按）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
  );

  const sectionOrder = data.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const customSections = useMemo(() => data.customSections ?? [], [data.customSections]);
  const sectionTitles = useMemo(() => data.sectionTitles ?? {}, [data.sectionTitles]);
  const hiddenSections = data.hiddenSections ?? [];
  const defaultModuleTitles = getSystemModuleDefaultTitles();

  // 新增自定义模块后自动滚动到底部
  const prevCustomCountRef = useRef(0);
  const customCount = customSections.length;
  useEffect(() => {
    if (customCount > prevCustomCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevCustomCountRef.current = customCount;
  }, [customCount]);

  // 按 sectionOrder 动态生成模块列表（内置 + 自定义）
  const sectionList = useMemo(() => {
    return sectionOrder
      .filter((key) => EDITOR_MAP[key] || customSections.some((cs) => cs.id === key))
      .map((key) => {
        const builtin = EDITOR_MAP[key];
        if (builtin) return { key, title: sectionTitles[key] ?? defaultModuleTitles[key] ?? key, Editor: builtin.Editor, isCustom: false as const };
        const cs = customSections.find((c) => c.id === key);
        return { key, title: cs?.name ?? t('customModule.defaultName'), Editor: CustomModuleEditor as React.ComponentType<{ sectionKey?: string }>, isCustom: true as const };
      });
  }, [sectionOrder, customSections, sectionTitles, defaultModuleTitles, t]);

  const handleToggleSection = useCallback((sectionKey: SectionKey) => {
    window.localStorage.setItem(LAST_EXPANDED_SECTION_STORAGE_KEY, sectionKey);
    setExpandedSection((prev) => {
      return prev === sectionKey ? null : sectionKey;
    });
  }, []);

  const handleBlockedDrag = useCallback(() => {
    showToast(t('sectionSort.collapseBeforeDrag'));
  }, [showToast, t]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sectionOrder.indexOf(active.id as SectionKey);
      const newIndex = sectionOrder.indexOf(over.id as SectionKey);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      dispatch({ type: 'REORDER_SECTIONS', payload: newOrder });
    },
    [sectionOrder, dispatch],
  );

  return (
    <div className="theme-transition-target h-full min-h-0 flex flex-col">
      {/* 单一共享浮动编辑器实例，通过 FloatingEditorContext 驱动内容与位置 */}
      <FloatingContentEditor />

      {/* Panel Header */}
      {!isMobile && (
        <div
          className="theme-transition-target editor-sub-header justify-between px-4"
          data-editor-sub-header="left"
        >
          <div className="flex items-center gap-2">
            <PanelLeft className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="text-gray-800 font-semibold text-sm">{t('panel.title')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => uiDispatch({ type: 'SET_EDITOR_OPEN', payload: false })}
              className="theme-color-transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Section List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sectionOrder}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={scrollContainerRef}
            className={[
              'flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3.5 scroll-smooth hide-scrollbar',
              isMobile ? 'mobile-scroll-dock-space' : '',
            ].join(' ')}
          >
            {sectionList.map(({ key, title, Editor, isCustom }) => {
              return (
                <SortableSection
                  key={key}
                  sectionKey={key}
                  title={title}
                  isExpanded={expandedSection === key}
                  onToggle={() => handleToggleSection(key)}
                  onBlockedDrag={handleBlockedDrag}
                  isHidden={hiddenSections.includes(key)}
                  isCustom={isCustom}
                  isPersonal={key === 'personal'}
                  isEditingTitle={editingTitleKey === key}
                  editingTitleValue={editingTitleKey === key ? editingTitleValue : undefined}
                  onEditingTitleChange={setEditingTitleValue}
                  onEditTitle={() => {
                    setEditingTitleKey(key);
                    setEditingTitleValue(isCustom
                      ? (customSections.find((c) => c.id === key)?.name ?? '')
                      : (sectionTitles[key] ?? title));
                  }}
                  onRenameConfirm={(_key, newTitle) => {
                    if (isCustom) {
                      dispatch({
                        type: 'UPDATE_CUSTOM_SECTION',
                        payload: { id: _key, updates: { name: newTitle } },
                      });
                    } else {
                      dispatch({
                        type: 'UPDATE_SECTION_TITLE',
                        payload: { key: _key, title: newTitle },
                      });
                    }
                    setEditingTitleKey(null);
                  }}
                  onToggleHidden={(sectionKey) => {
                    dispatch({ type: 'TOGGLE_SECTION_VISIBILITY', payload: sectionKey });
                  }}
                  onDeleteSection={
                    isCustom
                      ? () => {
                          dispatch({ type: 'DELETE_CUSTOM_SECTION', payload: key });
                          if (expandedSection === key) setExpandedSection(null);
                        }
                      : undefined
                  }
                  hasCustomTitle={!isCustom && key !== 'personal' && key in sectionTitles}
                  onResetTitle={
                    !isCustom && key !== 'personal'
                      ? () => dispatch({ type: 'RESET_SECTION_TITLE', payload: key })
                      : undefined
                  }
                  onConfirmEditTitle={() => {
                    if (editingTitleKey === key) {
                      const newTitle = editingTitleValue || title;
                      if (isCustom) {
                        dispatch({
                          type: 'UPDATE_CUSTOM_SECTION',
                          payload: { id: key, updates: { name: newTitle } },
                        });
                      } else {
                        dispatch({
                          type: 'UPDATE_SECTION_TITLE',
                          payload: { key, title: newTitle },
                        });
                      }
                      setEditingTitleKey(null);
                    }
                  }}
                  onCancelEditTitle={() => {
                    setEditingTitleKey(null);
                    setEditingTitleValue('');
                  }}
                >
                  {isCustom ? <Editor sectionKey={key} /> : <Editor />}
                </SortableSection>
              );
            })}
            {/* 添加自定义模块按钮 */}
            <button
              onClick={() => {
                const id = `custom-${Date.now()}`;
                dispatch({ type: 'ADD_CUSTOM_SECTION', payload: { id, name: t('customModule.defaultName') } });
                uiDispatch({ type: 'SET_ACTIVE_SECTION', payload: id });
                setExpandedSection(id);
                window.localStorage.setItem(LAST_EXPANDED_SECTION_STORAGE_KEY, id);
              }}
              className="theme-color-transition w-full flex items-center justify-center gap-2 rounded-[22px] border border-dashed border-blue-300 bg-transparent text-blue-400 hover:bg-blue-50/40 hover:border-blue-400 hover:text-blue-500 px-4 py-3.5 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('customModule.add')}
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
