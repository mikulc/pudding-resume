import { useState, useCallback, useRef, useEffect } from 'react';
import { useResume } from '../context/ResumeContext';
import {
  buildOffsetMap,
  getRenderedOffset,
  toggleBoldAtPosition,
  toggleItalicAtPosition,
  toggleUnderlineAtPosition,
  clearFormatAtPosition,
  toggleOrderedListInRange,
  toggleUnorderedListInRange,
} from '../utils/markdown';

export interface SelectionState {
  /** 选区在视口中的位置（用于定位工具栏） */
  rect: DOMRect | null;
  /** 选中的纯文本 */
  text: string;
  /** 数据来源 section */
  section: 'personal' | 'education' | 'work' | 'projects' | 'summary' | 'portfolio' | 'skills';
  /** 条目 ID */
  entryId: string;
  /** 字段名 */
  field: string;
  /** 附加索引信息 */
  indexInfo?: { tagIndex?: number };
  /** 选区在源文本（含 ** 标记）中的起始偏移 */
  sourceStart: number;
  /** 选区在源文本（含 ** 标记）中的结束偏移 */
  sourceEnd: number;
}

/** 从 DOM 节点向上查找可编辑文本元素，返回数据属性 + 元素引用 */
function findEditableAncestor(node: Node | null): {
  section: string;
  entryId: string;
  field: string;
  tagIndex?: number;
  /** 可编辑容器元素（用于位置映射） */
  element: HTMLElement;
} | null {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType !== Node.ELEMENT_NODE) {
      current = current.parentNode;
      continue;
    }
    const el = current as HTMLElement;
    const section = el.dataset.section;
    if (!section) {
      current = current.parentNode;
      continue;
    }

    let field = el.dataset.field || 'text';
    if (el.dataset.tagIndex !== undefined) {
      field = 'tags';
    }

    const entryId = el.dataset.entryId || section;

    return {
      section,
      entryId,
      field,
      tagIndex: el.dataset.tagIndex !== undefined ? parseInt(el.dataset.tagIndex) : undefined,
      element: el,
    };
  }
  return null;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const { data, dispatch } = useResume();
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  // 防抖：防止快速连续点击
  const processingRef = useRef(false);

  /** 关闭工具栏 */
  const closeToolbar = useCallback(() => {
    setShowToolbar(false);
    setSelection(null);
    // 清除选区
    window.getSelection()?.removeAllRanges();
  }, []);

  /** 处理 mouseup 事件 */
  const handleMouseUp = useCallback(() => {
    if (processingRef.current) return;

    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setShowToolbar(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const selectedText = sel.toString().trim();

      if (!selectedText) {
        setShowToolbar(false);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      if (!container.contains(range.startContainer)) {
        setShowToolbar(false);
        return;
      }

      const editableInfo = findEditableAncestor(range.startContainer);
      if (!editableInfo) {
        setShowToolbar(false);
        return;
      }

      // 教育经历不弹出工具栏
      if (editableInfo.section === 'education') {
        setShowToolbar(false);
        return;
      }

      const endInfo = findEditableAncestor(range.endContainer);
      if (
        !endInfo ||
        endInfo.entryId !== editableInfo.entryId ||
        endInfo.section !== editableInfo.section ||
        endInfo.field !== editableInfo.field
      ) {
        setShowToolbar(false);
        return;
      }

      if (
        editableInfo.tagIndex !== undefined && editableInfo.tagIndex !== endInfo.tagIndex
      ) {
        setShowToolbar(false);
        return;
      }

      // ---- 基于 DOM 位置计算源文本偏移（替代文本搜索，避免错位） ----
      const containerEl = editableInfo.element;

      // 计算选区起止点在容器渲染文本中的字符偏移
      const renderedStart = getRenderedOffset(containerEl, range.startContainer, range.startOffset);
      const renderedEnd = getRenderedOffset(containerEl, range.endContainer, range.endOffset);

      // 建立"渲染偏移 → 源文本偏移"映射
      const offsetMap = buildOffsetMap(containerEl);
      if (offsetMap.length === 0) {
        setShowToolbar(false);
        return;
      }

      // 查找映射，将渲染偏移转为源文本偏移
      let sourceStart = -1;
      let sourceEnd = -1;
      for (const entry of offsetMap) {
        if (entry.renderedOffset === renderedStart && sourceStart === -1) {
          sourceStart = entry.sourceOffset;
        }
        if (entry.renderedOffset === renderedEnd - 1) {
          // end 是排他边界，源文本中取最后一个字符的下一个位置
          sourceEnd = entry.sourceOffset + 1;
        }
      }
      // 处理终点在文本末尾的情况
      if (renderedEnd >= offsetMap.length) {
        sourceEnd = offsetMap[offsetMap.length - 1].sourceOffset + 1;
      }
      if (sourceStart === -1 || sourceEnd === -1 || sourceStart >= sourceEnd) {
        setShowToolbar(false);
        return;
      }

      const rect = range.getBoundingClientRect();

      setSelection({
        rect,
        text: selectedText,
        section: editableInfo.section as SelectionState['section'],
        entryId: editableInfo.entryId,
        field: editableInfo.field,
        indexInfo: {
          tagIndex: editableInfo.tagIndex,
        },
        sourceStart,
        sourceEnd,
      });
      setShowToolbar(true);
    }, 10);
  }, [containerRef]);

  /** 切换加粗（基于源文本精确偏移量，从根本上避免错位） */
  const handleToggleBold = useCallback(() => {
    if (!selection || processingRef.current) return;

    processingRef.current = true;
    const { section, entryId, field, sourceStart, sourceEnd } = selection;

    let sourceText = '';
    switch (section) {
      case 'work': {
        const work = data.workExperience.find((w) => w.id === entryId);
        if (work) sourceText = work.highlights || '';
        break;
      }
      case 'projects': {
        const proj = data.projects.find((p) => p.id === entryId);
        if (proj) sourceText = proj.highlights || '';
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu && field === 'courses') sourceText = edu.courses || '';
        break;
      }
      case 'summary': {
        sourceText = data.summary || '';
        break;
      }
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) sourceText = portfolio.description || '';
        break;
      }
      case 'skills': {
        sourceText = data.skills || '';
        break;
      }
    }

    if (!sourceText) { processingRef.current = false; return; }

    const newText = toggleBoldAtPosition(sourceText, sourceStart, sourceEnd);
    if (newText === sourceText) { processingRef.current = false; return; }

    switch (section) {
      case 'work':
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: entryId, highlights: newText } });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: entryId, highlights: newText } });
        break;
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu) dispatch({ type: 'UPDATE_EDUCATION', payload: { ...edu, courses: newText } });
        break;
      }
      case 'summary':
        dispatch({ type: 'SET_SUMMARY', payload: newText });
        break;
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...portfolio, description: newText } });
        break;
      }
      case 'skills':
        dispatch({ type: 'SET_SKILLS', payload: newText });
        break;
    }

    closeToolbar();
    setTimeout(() => { processingRef.current = false; }, 200);
  }, [selection, data, dispatch, closeToolbar]);

  /** 切换斜体（基于源文本精确偏移量） */
  const handleToggleItalic = useCallback(() => {
    if (!selection || processingRef.current) return;

    processingRef.current = true;
    const { section, entryId, field, sourceStart, sourceEnd } = selection;

    let sourceText = '';
    switch (section) {
      case 'work': {
        const work = data.workExperience.find((w) => w.id === entryId);
        if (work) sourceText = work.highlights || '';
        break;
      }
      case 'projects': {
        const proj = data.projects.find((p) => p.id === entryId);
        if (proj) sourceText = proj.highlights || '';
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu && field === 'courses') sourceText = edu.courses || '';
        break;
      }
      case 'summary': {
        sourceText = data.summary || '';
        break;
      }
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) sourceText = portfolio.description || '';
        break;
      }
      case 'skills': {
        sourceText = data.skills || '';
        break;
      }
    }

    if (!sourceText) { processingRef.current = false; return; }

    const newText = toggleItalicAtPosition(sourceText, sourceStart, sourceEnd);
    if (newText === sourceText) { processingRef.current = false; return; }

    switch (section) {
      case 'work':
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: entryId, highlights: newText } });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: entryId, highlights: newText } });
        break;
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu) dispatch({ type: 'UPDATE_EDUCATION', payload: { ...edu, courses: newText } });
        break;
      }
      case 'summary':
        dispatch({ type: 'SET_SUMMARY', payload: newText });
        break;
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...portfolio, description: newText } });
        break;
      }
      case 'skills':
        dispatch({ type: 'SET_SKILLS', payload: newText });
        break;
    }

    closeToolbar();
    setTimeout(() => { processingRef.current = false; }, 200);
  }, [selection, data, dispatch, closeToolbar]);

  /** 切换下划线（基于源文本精确偏移量） */
  const handleToggleUnderline = useCallback(() => {
    if (!selection || processingRef.current) return;

    processingRef.current = true;
    const { section, entryId, field, sourceStart, sourceEnd } = selection;

    let sourceText = '';
    switch (section) {
      case 'work': {
        const work = data.workExperience.find((w) => w.id === entryId);
        if (work) sourceText = work.highlights || '';
        break;
      }
      case 'projects': {
        const proj = data.projects.find((p) => p.id === entryId);
        if (proj) sourceText = proj.highlights || '';
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu && field === 'courses') sourceText = edu.courses || '';
        break;
      }
      case 'summary': {
        sourceText = data.summary || '';
        break;
      }
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) sourceText = portfolio.description || '';
        break;
      }
      case 'skills': {
        sourceText = data.skills || '';
        break;
      }
    }

    if (!sourceText) { processingRef.current = false; return; }

    const newText = toggleUnderlineAtPosition(sourceText, sourceStart, sourceEnd);
    if (newText === sourceText) { processingRef.current = false; return; }

    switch (section) {
      case 'work':
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: entryId, highlights: newText } });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: entryId, highlights: newText } });
        break;
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu) dispatch({ type: 'UPDATE_EDUCATION', payload: { ...edu, courses: newText } });
        break;
      }
      case 'summary':
        dispatch({ type: 'SET_SUMMARY', payload: newText });
        break;
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...portfolio, description: newText } });
        break;
      }
      case 'skills':
        dispatch({ type: 'SET_SKILLS', payload: newText });
        break;
    }

    closeToolbar();
    setTimeout(() => { processingRef.current = false; }, 200);
  }, [selection, data, dispatch, closeToolbar]);

  /** 清除格式：移除选中区域内所有 ** 和 * 标记 */
  const handleClearFormat = useCallback(() => {
    if (!selection || processingRef.current) return;

    processingRef.current = true;
    const { section, entryId, field, sourceStart, sourceEnd } = selection;

    let sourceText = '';
    switch (section) {
      case 'work': {
        const work = data.workExperience.find((w) => w.id === entryId);
        if (work) sourceText = work.highlights || '';
        break;
      }
      case 'projects': {
        const proj = data.projects.find((p) => p.id === entryId);
        if (proj) sourceText = proj.highlights || '';
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu && field === 'courses') sourceText = edu.courses || '';
        break;
      }
      case 'summary': {
        sourceText = data.summary || '';
        break;
      }
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) sourceText = portfolio.description || '';
        break;
      }
      case 'skills': {
        sourceText = data.skills || '';
        break;
      }
    }

    if (!sourceText) { processingRef.current = false; return; }

    const newText = clearFormatAtPosition(sourceText, sourceStart, sourceEnd);
    if (newText === sourceText) { processingRef.current = false; return; }

    switch (section) {
      case 'work':
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: entryId, highlights: newText } });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: entryId, highlights: newText } });
        break;
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu) dispatch({ type: 'UPDATE_EDUCATION', payload: { ...edu, courses: newText } });
        break;
      }
      case 'summary':
        dispatch({ type: 'SET_SUMMARY', payload: newText });
        break;
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...portfolio, description: newText } });
        break;
      }
      case 'skills':
        dispatch({ type: 'SET_SKILLS', payload: newText });
        break;
    }

    closeToolbar();
    setTimeout(() => { processingRef.current = false; }, 200);
  }, [selection, data, dispatch, closeToolbar]);

  /** 切换有序列表（基于源文本行边界） */
  const handleToggleOrderedList = useCallback(() => {
    if (!selection || processingRef.current) return;

    processingRef.current = true;
    const { section, entryId, field, sourceStart, sourceEnd } = selection;

    let sourceText = '';
    switch (section) {
      case 'work': {
        const work = data.workExperience.find((w) => w.id === entryId);
        if (work) sourceText = work.highlights || '';
        break;
      }
      case 'projects': {
        const proj = data.projects.find((p) => p.id === entryId);
        if (proj) sourceText = proj.highlights || '';
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu && field === 'courses') sourceText = edu.courses || '';
        break;
      }
      case 'summary': {
        sourceText = data.summary || '';
        break;
      }
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) sourceText = portfolio.description || '';
        break;
      }
      case 'skills': {
        sourceText = data.skills || '';
        break;
      }
    }

    if (!sourceText) { processingRef.current = false; return; }

    const newText = toggleOrderedListInRange(sourceText, sourceStart, sourceEnd);
    if (newText === sourceText) { processingRef.current = false; return; }

    switch (section) {
      case 'work':
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: entryId, highlights: newText } });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: entryId, highlights: newText } });
        break;
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu) dispatch({ type: 'UPDATE_EDUCATION', payload: { ...edu, courses: newText } });
        break;
      }
      case 'summary':
        dispatch({ type: 'SET_SUMMARY', payload: newText });
        break;
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...portfolio, description: newText } });
        break;
      }
      case 'skills':
        dispatch({ type: 'SET_SKILLS', payload: newText });
        break;
    }

    closeToolbar();
    setTimeout(() => { processingRef.current = false; }, 200);
  }, [selection, data, dispatch, closeToolbar]);

  /** 切换无序列表（基于源文本行边界） */
  const handleToggleUnorderedList = useCallback(() => {
    if (!selection || processingRef.current) return;

    processingRef.current = true;
    const { section, entryId, field, sourceStart, sourceEnd } = selection;

    let sourceText = '';
    switch (section) {
      case 'work': {
        const work = data.workExperience.find((w) => w.id === entryId);
        if (work) sourceText = work.highlights || '';
        break;
      }
      case 'projects': {
        const proj = data.projects.find((p) => p.id === entryId);
        if (proj) sourceText = proj.highlights || '';
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu && field === 'courses') sourceText = edu.courses || '';
        break;
      }
      case 'summary': {
        sourceText = data.summary || '';
        break;
      }
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) sourceText = portfolio.description || '';
        break;
      }
      case 'skills': {
        sourceText = data.skills || '';
        break;
      }
    }

    if (!sourceText) { processingRef.current = false; return; }

    const newText = toggleUnorderedListInRange(sourceText, sourceStart, sourceEnd);
    if (newText === sourceText) { processingRef.current = false; return; }

    switch (section) {
      case 'work':
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: entryId, highlights: newText } });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: entryId, highlights: newText } });
        break;
      case 'education': {
        const edu = data.education.find((e) => e.id === entryId);
        if (edu) dispatch({ type: 'UPDATE_EDUCATION', payload: { ...edu, courses: newText } });
        break;
      }
      case 'summary':
        dispatch({ type: 'SET_SUMMARY', payload: newText });
        break;
      case 'portfolio': {
        const portfolio = (data.portfolio || []).find((p) => p.id === entryId);
        if (portfolio) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...portfolio, description: newText } });
        break;
      }
      case 'skills':
        dispatch({ type: 'SET_SKILLS', payload: newText });
        break;
    }

    closeToolbar();
    setTimeout(() => { processingRef.current = false; }, 200);
  }, [selection, data, dispatch, closeToolbar]);

  /** 点击预览区空白处关闭工具栏 */
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!showToolbar) return;
      const target = e.target as HTMLElement;
      // 如果点击的不是工具栏按钮，关闭
      if (!target.closest('[data-toolbar]')) {
        closeToolbar();
      }
    },
    [showToolbar, closeToolbar]
  );

  /** 鼠标移出预览区域外层 */
  const handleMouseLeave = useCallback(() => {
    if (showToolbar) {
      closeToolbar();
    }
  }, [showToolbar, closeToolbar]);

  // 全局点击监听（点击预览区空白位置关闭）
  useEffect(() => {
    if (showToolbar) {
      document.addEventListener('mousedown', handleClick, true);
      return () => document.removeEventListener('mousedown', handleClick, true);
    }
  }, [showToolbar, handleClick]);

  return {
    selection,
    showToolbar,
    handleMouseUp,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleClearFormat,
    handleToggleOrderedList,
    handleToggleUnorderedList,
    closeToolbar,
    handleMouseLeave,
  };
}
