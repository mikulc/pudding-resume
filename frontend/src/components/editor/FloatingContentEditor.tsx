import { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bold, Eraser, Italic, List, ListOrdered, Loader2, Sparkles, Underline } from 'lucide-react';
import {
  clearFormatAtPosition,
  editableHtmlToMarkdown,
  markdownToEditableHtml,
  toggleBoldAtPosition,
  toggleItalicAtPosition,
  toggleUnderlineAtPosition,
  toggleOrderedListInRange,
  toggleUnorderedListInRange,
} from '../../utils/markdown';
import { useAppUI } from '../../context/ResumeContext';
import { useLongTextEditor } from '../../context/LongTextEditorContext';
import { useFloatingEditor, registerFloatingEditorComplete } from '../../context/FloatingEditorContext';
import { useConfirm } from '../common/ConfirmModal';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { aiPolish } from '../../api/ai';
import { AiOptimizePanel, type OptimizeStatus, type OptimizeTab } from './AiOptimizePanel';
import {
  type PanelGeometry,
  type MarkdownRange,
  EDITOR_MAX_HISTORY,
  PANEL_DEFAULT_WIDTH,
  PANEL_MAX_HEIGHT,
  MOBILE_LAYOUT_QUERY,
  calcAnchorGeometry,
  findMarkdownRangeFromSelection,
  normalizeSelectedParagraphBreaks,
} from './floatingEditorGeometry';

/**
 * 基于锚点按钮位置动态定位的浮动内容编辑器。
 * - 读取 FloatingEditorContext 获取当前编辑配置
 * - 默认显示在触发按钮右侧 12px 处
 * - 右侧空间不足时自动切换到左侧
 * - 上下超出可视区域时自动调整
 * - 滚动/窗口大小变化时跟随锚点重新定位
 * - 锚点元素消失时自动关闭
 */
export function FloatingContentEditor() {
  const { config, anchorRect: contextAnchorRect, isOpen, close, getCallbacks } = useFloatingEditor();
  const { t } = useTranslation(['editor', 'common']);

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [panelGeometry, setPanelGeometry] = useState<PanelGeometry>({
    top: 0,
    left: 0,
    width: PANEL_DEFAULT_WIDTH,
    height: PANEL_MAX_HEIGHT,
    isMobile: false,
  });
  const [draftText, setDraftText] = useState('');
  const [isMdMode, setIsMdMode] = useState(false); // false = preview mode
  const [isPolishing, setIsPolishing] = useState(false);
  const [optimizeStatus, setOptimizeStatus] = useState<OptimizeStatus>('idle');
  const [optimizeTab, setOptimizeTab] = useState<OptimizeTab>('compare');
  const [optimizeOriginalText, setOptimizeOriginalText] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [optimizeError, setOptimizeError] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const mdEditorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const textRef = useRef('');
  const baselineTextRef = useRef('');
  const closeConfirmPendingRef = useRef(false);
  const suppressNextOutsideClickRef = useRef(false);
  const suppressOutsideClickTimerRef = useRef<number | null>(null);
  const skipRichDomSyncRef = useRef(false);
  const skipMdDomSyncRef = useRef(false);
  const richSelectionRangeRef = useRef<Range | null>(null);
  const mdSelectionRangeRef = useRef<Range | null>(null);
  const optimizeRequestIdRef = useRef(0);

  const { ui, uiDispatch } = useAppUI();
  const { registerEditor, unregisterEditor } = useLongTextEditor();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // ---------- Resolve callbacks via context ----------
  const editorKey = config?.editorKey ?? '';
  const title = config?.title ?? '';
  const text = config?.text ?? '';

  // Resolve current callbacks
  const resolveCallbacks = useCallback(() => getCallbacks(), [getCallbacks]);

  const renderRichEditorContent = useCallback((sourceText: string) => {
    const editorEl = previewRef.current;
    if (!editorEl) return;
    const html = markdownToEditableHtml(sourceText);
    if (editorEl.innerHTML !== html) {
      editorEl.innerHTML = html;
    }
  }, []);

  const renderMdEditorContent = useCallback((sourceText: string) => {
    const editorEl = mdEditorRef.current;
    if (!editorEl) return;
    if (editorEl.textContent !== sourceText) {
      editorEl.textContent = sourceText;
    }
  }, []);

  const focusEditorAtEnd = useCallback((editorEl: HTMLDivElement, selectionRef: MutableRefObject<Range | null>) => {
    const selection = window.getSelection();
    if (!selection) return;

    editorEl.focus({ preventScroll: true });

    const range = document.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
  }, []);

  const readMdEditorText = useCallback(() => {
    const editorEl = mdEditorRef.current;
    if (!editorEl) return textRef.current;
    return editorEl.innerText.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  }, []);

  // Force plain-text paste on contentEditable surfaces to prevent arbitrary
  // HTML/script injection via clipboard. The editor stores Markdown, so rich
  // HTML paste is meaningless and only an XSS vector.
  const handleSafePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    document.execCommand('insertText', false, text);
  }, []);

  const syncDraftFromMdEditor = useCallback(() => {
    const nextText = readMdEditorText();
    if (nextText !== textRef.current) {
      skipMdDomSyncRef.current = true;
      textRef.current = nextText;
      setDraftText(nextText);
    }
    return nextText;
  }, [readMdEditorText]);

  const syncDraftFromRichEditor = useCallback(() => {
    const editorEl = previewRef.current;
    if (!editorEl) return textRef.current;

    const nextText = editableHtmlToMarkdown(editorEl);
    if (!nextText && editorEl.innerHTML !== '') {
      editorEl.innerHTML = '';
    }

    if (nextText !== textRef.current) {
      skipRichDomSyncRef.current = true;
      textRef.current = nextText;
      setDraftText(nextText);
    }

    return nextText;
  }, []);

  const captureRichSelection = useCallback(() => {
    const editorEl = previewRef.current;
    const selection = window.getSelection();
    if (!editorEl || !selection || selection.rangeCount === 0) return;
    if (!editorEl.contains(selection.anchorNode) || !editorEl.contains(selection.focusNode)) return;
    richSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const restoreRichSelection = useCallback(() => {
    const editorEl = previewRef.current;
    const savedRange = richSelectionRangeRef.current;
    const selection = window.getSelection();
    if (!editorEl || !savedRange || !selection) return false;
    try {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return editorEl.contains(selection.anchorNode) && editorEl.contains(selection.focusNode);
    } catch {
      richSelectionRangeRef.current = null;
      return false;
    }
  }, []);

  const isSelectionInsideMdEditor = useCallback((requireTextSelection: boolean) => {
    const editorEl = mdEditorRef.current;
    const selection = window.getSelection();
    if (!editorEl || !selection || selection.rangeCount === 0) return false;
    if (!editorEl.contains(selection.anchorNode) || !editorEl.contains(selection.focusNode)) return false;
    if (requireTextSelection && selection.toString().length === 0) return false;
    return true;
  }, []);

  const captureMdSelection = useCallback(() => {
    const editorEl = mdEditorRef.current;
    const selection = window.getSelection();
    if (!editorEl || !selection || selection.rangeCount === 0) return;
    if (!editorEl.contains(selection.anchorNode) || !editorEl.contains(selection.focusNode)) return;
    mdSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const restoreMdSelection = useCallback(() => {
    const editorEl = mdEditorRef.current;
    const savedRange = mdSelectionRangeRef.current;
    const selection = window.getSelection();
    if (!editorEl || !savedRange || !selection) return false;
    try {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return editorEl.contains(selection.anchorNode) && editorEl.contains(selection.focusNode);
    } catch {
      mdSelectionRangeRef.current = null;
      return false;
    }
  }, []);

  const getMdSelectionRange = useCallback((emptySelectionMessage: string): MarkdownRange | null => {
    const editorEl = mdEditorRef.current;
    if (!editorEl) return null;

    if (!isSelectionInsideMdEditor(true)) {
      restoreMdSelection();
    }

    if (!isSelectionInsideMdEditor(true)) {
      showToast(emptySelectionMessage, 'info');
      editorEl.focus({ preventScroll: true });
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(editorEl);
    beforeRange.setEnd(range.startContainer, range.startOffset);

    const start = beforeRange.toString().replace(/\r\n?/g, '\n').length;
    const selectedLength = range.toString().replace(/\r\n?/g, '\n').length;
    return { start, end: start + selectedLength };
  }, [isSelectionInsideMdEditor, restoreMdSelection, showToast]);

  const setMdSelectionRange = useCallback((start: number, end: number) => {
    const editorEl = mdEditorRef.current;
    const selection = window.getSelection();
    if (!editorEl || !selection) return;

    const targetStart = Math.max(0, start);
    const targetEnd = Math.max(targetStart, end);
    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startOffset = 0;
    let endOffset = 0;

    let node = walker.nextNode();
    while (node) {
      const textLength = node.textContent?.length ?? 0;
      const nextOffset = currentOffset + textLength;

      if (!startNode && targetStart <= nextOffset) {
        startNode = node;
        startOffset = Math.max(0, Math.min(textLength, targetStart - currentOffset));
      }
      if (!endNode && targetEnd <= nextOffset) {
        endNode = node;
        endOffset = Math.max(0, Math.min(textLength, targetEnd - currentOffset));
        break;
      }

      currentOffset = nextOffset;
      node = walker.nextNode();
    }

    if (!startNode || !endNode) {
      if (!editorEl.firstChild) {
        editorEl.appendChild(document.createTextNode(''));
      }
      const fallbackNode = editorEl.firstChild as Node;
      startNode = startNode || fallbackNode;
      endNode = endNode || fallbackNode;
      startOffset = startNode.textContent?.length ?? 0;
      endOffset = endNode.textContent?.length ?? 0;
    }

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
    mdSelectionRangeRef.current = range.cloneRange();
  }, []);

  const getCurrentDraftText = useCallback(() => {
    if (!isMdMode && previewRef.current) {
      return syncDraftFromRichEditor();
    }
    if (isMdMode && mdEditorRef.current) {
      return syncDraftFromMdEditor();
    }
    textRef.current = draftText;
    return draftText;
  }, [draftText, isMdMode, syncDraftFromMdEditor, syncDraftFromRichEditor]);

  const commitDraftFromToolbar = useCallback((nextText: string, syncEditorDom = false) => {
    const syncEditorContent = () => {
      requestAnimationFrame(() => {
        if (isMdMode) {
          renderMdEditorContent(nextText);
          return;
        }
        renderRichEditorContent(nextText);
      });
    };

    if (nextText === textRef.current) {
      if (syncEditorDom) {
        syncEditorContent();
      }
      return;
    }
    textRef.current = nextText;
    setDraftText(nextText);
    if (syncEditorDom) {
      syncEditorContent();
    }
  }, [isMdMode, renderMdEditorContent, renderRichEditorContent]);

  const resetOptimizeResult = useCallback(() => {
    optimizeRequestIdRef.current += 1;
    setOptimizeStatus('idle');
    setOptimizeTab('compare');
    setOptimizeOriginalText('');
    setOptimizedText('');
    setOptimizeError('');
    setIsPolishing(false);
  }, []);

  // ---------- Sync text when editor opens/closes or content switches ----------
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const prevTextRef = useRef(text);
  const openKeyRef = useRef(editorKey);

  useEffect(() => {
    if (!isOpen) {
      setDraftText(text);
      textRef.current = text;
      baselineTextRef.current = text;
      prevTextRef.current = text;
      setIsMdMode(false);
      resetOptimizeResult();
      return;
    }
    // Reset draft when opening or switching to a different key
    if (openKeyRef.current !== editorKey) {
      openKeyRef.current = editorKey;
      setDraftText(text);
      textRef.current = text;
      baselineTextRef.current = text;
      prevTextRef.current = text;
      initialRenderDoneRef.current = false;
      setIsMdMode(false);
      resetOptimizeResult();
    }
  }, [isOpen, text, editorKey, resetOptimizeResult]);

  // ---------- Anchor-based geometry ----------
  const initialRenderDoneRef = useRef(false);
  const recalcGeometry = useCallback(() => {
    if (!isOpenRef.current || !config) return;

    const isMobile = window.matchMedia(MOBILE_LAYOUT_QUERY).matches;

    // Try to re-query anchor element from DOM
    const anchorEl = document.querySelector<HTMLElement>(
      `[data-floating-editor-anchor="${editorKey}"]`,
    );

    if (!anchorEl && !isMobile) {
      // During initial render, the anchor may not be found yet due to React batching.
      // Only auto-close when we've confirmed the panel was previously open and stable.
      if (!initialRenderDoneRef.current) return;

      // Anchor disappeared (section collapsed/deleted) — close the editor
      const cbs = getCallbacks();
      cbs.onCancel();
      close();
      return;
    }

    const rect = anchorEl
      ? anchorEl.getBoundingClientRect()
      : contextAnchorRect ?? new DOMRect(0, 0, 0, 0);

    setPanelGeometry(calcAnchorGeometry(rect, isMobile));
    initialRenderDoneRef.current = true;
  }, [config, editorKey, contextAnchorRect, getCallbacks, close]);

  // Initial placement + resize listener
  useEffect(() => {
    if (!isOpen) return;
    recalcGeometry();
    window.addEventListener('resize', recalcGeometry);
    return () => window.removeEventListener('resize', recalcGeometry);
  }, [isOpen, recalcGeometry]);

  // Scroll following: listen to window scroll + editor panel scroll container
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => recalcGeometry();
    window.addEventListener('scroll', handleScroll, true); // capture phase to catch all scrolls

    // Also listen on the specific scroll container for more reliable tracking
    const scrollContainer = document.querySelector('.overflow-y-auto') as HTMLElement | null;
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      scrollContainer?.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, recalcGeometry]);

  // Close floating editor when left panel collapses or mobile dock switches away from edit.
  // Auto-save unsaved changes instead of discarding them.
  const isMobileRef = useRef(false);
  useEffect(() => {
    isMobileRef.current = window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
  });
  useEffect(() => {
    if (!isOpen) return;
    const isMobile = isMobileRef.current;
    const panelHidden = isMobile
      ? ui.mobileDockMode !== 'edit'
      : !ui.editorOpen;
    if (panelHidden) {
      const cbs = getCallbacks();
      const nextText = getCurrentDraftText();
      cbs.onTextChange(nextText);
      cbs.onSave(nextText);
      close();
      showToast(t('longTextEditor.toast.applied'), 'success');
    }
  }, [ui.editorOpen, ui.mobileDockMode, isOpen, getCallbacks, close, getCurrentDraftText, showToast, t]);

  // ====== Local history stack ======
  const localHistoryRef = useRef<string[]>([]);
  const localIdxRef = useRef(-1);
  const localSkipRef = useRef(false);

  const resetLocalHistory = useCallback((initialText: string) => {
    baselineTextRef.current = initialText;
    textRef.current = initialText;
    localHistoryRef.current = [initialText];
    localIdxRef.current = 0;
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    return textRef.current !== baselineTextRef.current;
  }, []);

  const discardWithoutPrompt = useCallback(() => {
    const cbs = resolveCallbacks();
    cbs.onCancel();
    close();
  }, [resolveCallbacks, close]);

  const handleAiAction = useCallback(async () => {
    const currentText = getCurrentDraftText();
    if (currentText.trim().length < 5) {
      showToast(t('longTextEditor.toast.textTooShort'), 'info');
      return;
    }
    // 从 editorKey（如 work:xxx:highlights）解析模块类型，为 AI 提供上下文
    const sectionModule = editorKey.split(':')[0] || '';
    const requestId = optimizeRequestIdRef.current + 1;
    optimizeRequestIdRef.current = requestId;
    setOptimizeOriginalText(currentText);
    setOptimizedText('');
    setOptimizeError('');
    setOptimizeTab('compare');
    setOptimizeStatus('loading');
    setIsPolishing(true);
    try {
      const result = await aiPolish(currentText, sectionModule);
      // 浮层可能已关闭，丢弃过期结果避免无效状态更新
      if (!isOpenRef.current || optimizeRequestIdRef.current !== requestId) return;
      setOptimizedText(result.text);
      setOptimizeStatus('success');
      setOptimizeTab('compare');
      showToast(t('aiPolishComplete'), 'success');
    } catch (err: unknown) {
      if (!isOpenRef.current || optimizeRequestIdRef.current !== requestId) return;
      const msg = err instanceof Error ? err.message : '';
      setOptimizeStatus('error');
      setOptimizeError(msg || t('aiPolishFailed'));
      if (msg.includes('请先配置') || msg.includes('API')) {
        showToast(t('longTextEditor.toast.aiConfigMissing'), 'error');
      } else {
        showToast(msg || t('aiPolishFailed'), 'error');
      }
    } finally {
      if (optimizeRequestIdRef.current === requestId) {
        setIsPolishing(false);
      }
    }
  }, [getCurrentDraftText, showToast, t, editorKey]);

  const handleRestoreOriginal = useCallback(() => {
    const originalText = optimizeOriginalText || textRef.current;
    resetOptimizeResult();
    commitDraftFromToolbar(originalText, true);
  }, [commitDraftFromToolbar, optimizeOriginalText, resetOptimizeResult]);

  const handleApplyOptimization = useCallback(() => {
    if (optimizeStatus !== 'success') return;
    const finalText = optimizedText;
    const cbs = resolveCallbacks();
    commitDraftFromToolbar(finalText, true);
    cbs.onTextChange(finalText);
    resetLocalHistory(finalText);
    cbs.onSave(finalText);
    resetOptimizeResult();
    close();
    showToast(t('longTextEditor.toast.applied'), 'success');
  }, [
    close,
    commitDraftFromToolbar,
    optimizedText,
    optimizeStatus,
    resetLocalHistory,
    resetOptimizeResult,
    resolveCallbacks,
    showToast,
    t,
  ]);

  // 完成当前模块编辑（同步内容、更新基线，不关闭）：供 Ctrl+S 整份保存前调用
  const completeEditing = useCallback(() => {
    const nextText = getCurrentDraftText();
    const cbs = resolveCallbacks();
    cbs.onTextChange(nextText);
    cbs.onSaveWithoutClose?.(nextText);
    resetLocalHistory(nextText);
  }, [getCurrentDraftText, resolveCallbacks, resetLocalHistory]);

  // 完成并关闭（「完成」按钮）
  const handleSaveAndClose = useCallback(() => {
    const nextText = getCurrentDraftText();
    const cbs = resolveCallbacks();
    cbs.onTextChange(nextText);
    resetLocalHistory(nextText);
    cbs.onSave(nextText);
    close();
    showToast(t('longTextEditor.toast.applied'), 'success');
  }, [getCurrentDraftText, resolveCallbacks, resetLocalHistory, showToast, close, t]);

  const handleRequestCancel = useCallback(async () => {
    const cbs = resolveCallbacks();
    if (optimizeStatus !== 'idle') {
      if (closeConfirmPendingRef.current) return;
      closeConfirmPendingRef.current = true;
      const confirmed = await confirm({
        title: t('longTextEditor.aiOptimize.discard.title', { defaultValue: 'Discard AI optimization?' }),
        message: t('longTextEditor.aiOptimize.discard.message', {
          defaultValue: 'The AI result has not been applied. Closing now will discard it and keep the resume unchanged.',
        }),
        confirmText: t('longTextEditor.aiOptimize.discard.confirm', { defaultValue: 'Discard result' }),
        cancelText: t('longTextEditor.aiOptimize.discard.cancel', { defaultValue: 'Keep reviewing' }),
        confirmVariant: 'danger',
      });
      closeConfirmPendingRef.current = false;
      if (confirmed) {
        resetOptimizeResult();
        cbs.onCancel();
        close();
      }
      return;
    }

    if (!hasUnsavedChanges()) {
      cbs.onCancel();
      close();
      return;
    }
    if (closeConfirmPendingRef.current) return;
    closeConfirmPendingRef.current = true;
    const confirmed = await confirm({
      title: t('longTextEditor.discard.title'),
      message: t('longTextEditor.discard.message'),
      confirmText: t('longTextEditor.discard.confirm'),
      cancelText: t('longTextEditor.discard.cancel'),
      confirmVariant: 'danger',
    });
    closeConfirmPendingRef.current = false;
    if (confirmed) {
      cbs.onCancel();
      close();
    }
  }, [confirm, hasUnsavedChanges, optimizeStatus, resetOptimizeResult, resolveCallbacks, close, t]);

  const localUndo = useCallback(() => {
    if (localIdxRef.current <= 0) return;
    localIdxRef.current--;
    localSkipRef.current = true;
    setDraftText(localHistoryRef.current[localIdxRef.current]);
  }, []);

  const localRedo = useCallback(() => {
    if (localIdxRef.current >= localHistoryRef.current.length - 1) return;
    localIdxRef.current++;
    localSkipRef.current = true;
    setDraftText(localHistoryRef.current[localIdxRef.current]);
  }, []);

  // Auto-record text changes to local history
  const prevDraftRef = useRef(text);
  useEffect(() => {
    if (localSkipRef.current) {
      localSkipRef.current = false;
      prevDraftRef.current = draftText;
      textRef.current = draftText;
      return;
    }
    if (draftText === prevDraftRef.current) return;
    localHistoryRef.current = [
      ...localHistoryRef.current.slice(0, localIdxRef.current + 1),
      draftText,
    ];
    if (localHistoryRef.current.length > EDITOR_MAX_HISTORY) {
      localHistoryRef.current.shift();
    } else {
      localIdxRef.current++;
    }
    prevDraftRef.current = draftText;
    textRef.current = draftText;
  }, [draftText]);

  // Register/unregister with LongTextEditorContext when open/close
  useEffect(() => {
    if (!isOpen) return;
    setDraftText(text);
    resetLocalHistory(text);
    prevTextRef.current = text;
    registerEditor({
      key: editorKey,
      hasUnsavedChanges,
      discard: discardWithoutPrompt,
    });
    uiDispatch({ type: 'SET_DRAWER_OPEN', payload: true });
    return () => {
      unregisterEditor(editorKey);
      uiDispatch({ type: 'SET_DRAWER_OPEN', payload: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 注册完成回调供 SaveSync 在 Ctrl+S 时调用
  const completeEditingRef = useRef(completeEditing);
  completeEditingRef.current = completeEditing;
  useEffect(() => {
    if (!isOpen) return;
    registerFloatingEditorComplete(() => {
      completeEditingRef.current();
      return { hasError: false };
    });
    return () => {
      registerFloatingEditorComplete(null);
    };
  }, [isOpen]);

  // Enter/exit animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keep the contenteditable DOM in sync for non-typing changes: open, MD → rich,
  // toolbar actions that rewrite markdown, and local undo/redo.
  useEffect(() => {
    if (!isOpen || !isVisible || isMdMode || !previewRef.current) return;
    if (skipRichDomSyncRef.current) {
      skipRichDomSyncRef.current = false;
      return;
    }
    renderRichEditorContent(draftText);
  }, [draftText, isMdMode, isOpen, isVisible, optimizeStatus, renderRichEditorContent]);

  useEffect(() => {
    if (!isOpen || !isVisible || !isMdMode || !mdEditorRef.current) return;
    if (skipMdDomSyncRef.current) {
      skipMdDomSyncRef.current = false;
      return;
    }
    renderMdEditorContent(draftText);
  }, [draftText, isMdMode, isOpen, isVisible, optimizeStatus, renderMdEditorContent]);

  // Auto-focus the active editor surface once the floating panel has mounted
  // and its contenteditable DOM has been synchronized.
  useEffect(() => {
    if (!isOpen || !isVisible) return;
    const editorEl = isMdMode ? mdEditorRef.current : previewRef.current;
    if (!editorEl) return;

    const frameId = requestAnimationFrame(() => {
      focusEditorAtEnd(editorEl, isMdMode ? mdSelectionRangeRef : richSelectionRangeRef);
    });
    return () => cancelAnimationFrame(frameId);
  }, [focusEditorAtEnd, isMdMode, isOpen, isVisible]);

  useEffect(() => {
    if (!isOpen) return;
    const handleSelectionChange = () => {
      if (isMdMode) {
        captureMdSelection();
      } else {
        captureRichSelection();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [captureMdSelection, captureRichSelection, isMdMode, isOpen]);

  // Keyboard shortcuts (Ctrl+Z/Y/Escape; Ctrl+S 由 SaveSync 全局处理)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void handleRequestCancel();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          e.stopPropagation();
          localUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          e.stopPropagation();
          localRedo();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestCancel, isOpen, localRedo, localUndo]);

  // Outside click to close
  useEffect(() => {
    if (!isOpen) return;

    const isIgnoredTarget = (target: Node | null) => {
      if (!target) return true;
      if (target instanceof Element && target.closest('[data-long-text-editor-trigger]')) return true;
      return Boolean(panelRef.current?.contains(target));
    };

    const stopOutsideEvent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const installOneShotClickBlocker = () => {
      const blockClick = (event: MouseEvent) => {
        stopOutsideEvent(event);
        document.removeEventListener('click', blockClick, true);
        if (blockerTimer !== null) {
          window.clearTimeout(blockerTimer);
        }
      };
      const blockerTimer = window.setTimeout(() => {
        document.removeEventListener('click', blockClick, true);
      }, 400);
      document.addEventListener('click', blockClick, true);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (closeConfirmPendingRef.current) return;
      const target = e.target as Node | null;
      if (isIgnoredTarget(target)) return;
      stopOutsideEvent(e);
      installOneShotClickBlocker();
      suppressNextOutsideClickRef.current = true;
      if (suppressOutsideClickTimerRef.current !== null) {
        window.clearTimeout(suppressOutsideClickTimerRef.current);
      }
      suppressOutsideClickTimerRef.current = window.setTimeout(() => {
        suppressNextOutsideClickRef.current = false;
        suppressOutsideClickTimerRef.current = null;
      }, 400);
      void handleRequestCancel();
    };

    const handleClick = (e: MouseEvent) => {
      if (closeConfirmPendingRef.current) return;
      const target = e.target as Node | null;
      if (!suppressNextOutsideClickRef.current && isIgnoredTarget(target)) return;
      stopOutsideEvent(e);
      suppressNextOutsideClickRef.current = false;
      if (suppressOutsideClickTimerRef.current !== null) {
        window.clearTimeout(suppressOutsideClickTimerRef.current);
        suppressOutsideClickTimerRef.current = null;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('click', handleClick, true);
      if (suppressOutsideClickTimerRef.current !== null) {
        window.clearTimeout(suppressOutsideClickTimerRef.current);
        suppressOutsideClickTimerRef.current = null;
      }
      suppressNextOutsideClickRef.current = false;
    };
  }, [handleRequestCancel, isOpen]);

  const isSelectionInsideRichEditor = useCallback((requireTextSelection: boolean) => {
    const editorEl = previewRef.current;
    const selection = window.getSelection();
    if (!editorEl || !selection || selection.rangeCount === 0) return false;
    if (!editorEl.contains(selection.anchorNode) || !editorEl.contains(selection.focusNode)) return false;
    if (requireTextSelection && selection.toString().length === 0) return false;
    return true;
  }, []);

  const applyRichCommand = useCallback((
    command: 'bold' | 'italic' | 'underline' | 'removeFormat' | 'insertOrderedList' | 'insertUnorderedList',
    requireTextSelection: boolean,
    emptySelectionMessage: string,
  ) => {
    const editorEl = previewRef.current;
    if (!editorEl) return;

    if (!isSelectionInsideRichEditor(requireTextSelection)) {
      restoreRichSelection();
    }

    if (!isSelectionInsideRichEditor(requireTextSelection)) {
      showToast(emptySelectionMessage, 'info');
      return;
    }

    editorEl.focus({ preventScroll: true });
    restoreRichSelection();
    document.execCommand(command, false);
    if (command === 'removeFormat') {
      document.execCommand('unlink', false);
    }
    captureRichSelection();
    syncDraftFromRichEditor();
  }, [captureRichSelection, isSelectionInsideRichEditor, restoreRichSelection, showToast, syncDraftFromRichEditor]);

  const applyRichListAction = useCallback((
    mdAction: (source: string, start: number, end: number) => string,
  ) => {
    if (!previewRef.current) return;

    if (!isSelectionInsideRichEditor(true)) {
      restoreRichSelection();
    }

    if (!isSelectionInsideRichEditor(true)) {
      showToast(t('longTextEditor.toast.selectTextForList'), 'info');
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString() ?? '';
    const sourceText = syncDraftFromRichEditor();
    const range = findMarkdownRangeFromSelection(sourceText, selectedText);
    if (!range) {
      showToast(t('longTextEditor.toast.selectionNotRecognized'), 'info');
      return;
    }

    const prepared = normalizeSelectedParagraphBreaks(sourceText, range);
    const newText = mdAction(prepared.text, prepared.range.start, prepared.range.end);
    commitDraftFromToolbar(newText, true);
  }, [
    commitDraftFromToolbar,
    isSelectionInsideRichEditor,
    restoreRichSelection,
    showToast,
    syncDraftFromRichEditor,
    t,
  ]);

  const handleRichInput = useCallback(() => {
    syncDraftFromRichEditor();
  }, [syncDraftFromRichEditor]);

  const handleMdInput = useCallback(() => {
    syncDraftFromMdEditor();
  }, [syncDraftFromMdEditor]);

  const handleToggleMdMode = useCallback(() => {
    if (!isMdMode) {
      syncDraftFromRichEditor();
      setIsMdMode(true);
      return;
    }

    syncDraftFromMdEditor();
    setIsMdMode(false);
  }, [isMdMode, syncDraftFromMdEditor, syncDraftFromRichEditor]);

  // ---------- Markdown formatting handlers (dual-mode) ----------

  const commitMdSourceText = useCallback((
    nextText: string,
    selectionStart: number,
    selectionEnd: number,
  ) => {
    textRef.current = nextText;
    setDraftText(nextText);
    requestAnimationFrame(() => {
      renderMdEditorContent(nextText);
      mdEditorRef.current?.focus({ preventScroll: true });
      setMdSelectionRange(selectionStart, selectionEnd);
    });
  }, [renderMdEditorContent, setMdSelectionRange]);

  // Shared helper: apply a position-based format action, with MD source editor fallback
  const applyFormatAction = useCallback(
    (mdAction: (source: string, start: number, end: number) => string, marker: string) => {
      if (!isMdMode) {
        const command = marker === '**' ? 'bold' : marker === '*' ? 'italic' : 'underline';
        applyRichCommand(command, true, t('longTextEditor.toast.selectTextForFormatting'));
        return;
      }

      const range = getMdSelectionRange(t('longTextEditor.toast.selectTextForFormatting'));
      if (!range) return;

      const sourceText = syncDraftFromMdEditor();
      const newText = mdAction(sourceText, range.start, range.end);
      if (newText === sourceText) return;
      const delta = newText.length - sourceText.length;
      commitMdSourceText(newText, range.start, Math.max(range.start, range.end + delta));
    },
    [isMdMode, applyRichCommand, commitMdSourceText, getMdSelectionRange, syncDraftFromMdEditor, t],
  );

  const handleBold = useCallback(() => {
    applyFormatAction(toggleBoldAtPosition, '**');
  }, [applyFormatAction]);

  const handleItalic = useCallback(() => {
    applyFormatAction(toggleItalicAtPosition, '*');
  }, [applyFormatAction]);

  const handleUnderline = useCallback(() => {
    applyFormatAction(toggleUnderlineAtPosition, '__');
  }, [applyFormatAction]);

  const handleClearFormat = useCallback(() => {
    if (!isMdMode) {
      applyRichCommand('removeFormat', true, t('longTextEditor.toast.selectTextForClearFormat'));
      return;
    }

    const range = getMdSelectionRange(t('longTextEditor.toast.selectTextForClearFormat'));
    if (!range) return;

    const sourceText = syncDraftFromMdEditor();
    const newText = clearFormatAtPosition(sourceText, range.start, range.end);
    if (newText === sourceText) return;
    commitMdSourceText(newText, Math.min(range.start, newText.length), Math.min(range.start, newText.length));
  }, [isMdMode, applyRichCommand, commitMdSourceText, getMdSelectionRange, syncDraftFromMdEditor, t]);

  const handleOrderedList = useCallback(() => {
    if (!isMdMode) {
      applyRichListAction(toggleOrderedListInRange);
      return;
    }

    const range = getMdSelectionRange(t('longTextEditor.toast.selectTextForList'));
    if (!range) return;

    const sourceText = syncDraftFromMdEditor();
    const newText = toggleOrderedListInRange(sourceText, range.start, range.end);
    if (newText === sourceText) return;
    commitMdSourceText(newText, Math.min(range.start, newText.length), Math.min(range.start, newText.length));
  }, [isMdMode, applyRichListAction, commitMdSourceText, getMdSelectionRange, syncDraftFromMdEditor, t]);

  const handleUnorderedList = useCallback(() => {
    if (!isMdMode) {
      applyRichListAction(toggleUnorderedListInRange);
      return;
    }

    const range = getMdSelectionRange(t('longTextEditor.toast.selectTextForList'));
    if (!range) return;

    const sourceText = syncDraftFromMdEditor();
    const newText = toggleUnorderedListInRange(sourceText, range.start, range.end);
    if (newText === sourceText) return;
    commitMdSourceText(newText, Math.min(range.start, newText.length), Math.min(range.start, newText.length));
  }, [isMdMode, applyRichListAction, commitMdSourceText, getMdSelectionRange, syncDraftFromMdEditor, t]);

  if (!isVisible) return null;

  const toolButtonClass = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';
  const editorSurfaceClass = 'hide-scrollbar h-full w-full overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-gray-200 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-gray-800 transition-colors focus:outline-none select-text cursor-text';
  const hasOptimizePanel = optimizeStatus !== 'idle';
  const panelTransform = isAnimating
    ? 'translate3d(0, 0, 0)'
    : panelGeometry.isMobile
      ? 'translate3d(0, 14px, 0)'
      : 'translate3d(-14px, 0, 0)';

  const editorContent = (
    <div
      ref={panelRef}
      data-long-text-editor-panel
      className={[
        'fixed z-[9998] flex flex-col overflow-hidden border border-slate-200/70 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.10)]',
        panelGeometry.isMobile ? 'rounded-none' : 'rounded-2xl',
      ].join(' ')}
      style={{
        top: panelGeometry.top,
        left: panelGeometry.left,
        width: panelGeometry.isMobile ? '100vw' : panelGeometry.width,
        height: panelGeometry.isMobile ? '100vh' : panelGeometry.height,
        maxWidth: panelGeometry.isMobile ? '100vw' : 'calc(100vw - 16px)',
        opacity: isAnimating ? 1 : 0,
        transform: panelTransform,
        pointerEvents: isAnimating ? 'auto' : 'none',
        transition: 'opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div className="shrink-0 border-b border-blue-50 bg-white/95 backdrop-blur">
        <div className="flex items-start justify-between gap-3 px-7 pb-2.5 pt-5">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-800">{title}</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-gray-400">{t('longTextEditor.description')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {hasOptimizePanel ? (
              <>
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                  {t('longTextEditor.aiOptimize.restoreOriginal', { defaultValue: 'Restore original' })}
                </button>
                <button
                  type="button"
                  disabled={optimizeStatus !== 'success'}
                  onClick={handleApplyOptimization}
                  className="inline-flex h-7 items-center justify-center rounded-lg bg-blue-500 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('longTextEditor.aiOptimize.applyOptimization', { defaultValue: 'Apply optimization' })}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleRequestCancel()}
                  className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                  {t('common:button.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  className="inline-flex h-7 items-center justify-center rounded-lg bg-blue-500 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
                >
                  {t('common:button.done')}
                </button>
              </>
            )}
          </div>
        </div>

        {!hasOptimizePanel && <div className="flex items-center gap-1 px-7 pt-2 pb-3">
          <Tooltip enabled content={t('formatting.bold')}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleBold} className={toolButtonClass}>
            <Bold className="h-3.5 w-3.5" />
          </button>
          </Tooltip>
          <Tooltip enabled content={t('formatting.italic')}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleItalic} className={toolButtonClass}>
            <Italic className="h-3.5 w-3.5" />
          </button>
          </Tooltip>
          <Tooltip enabled content={t('formatting.underline')}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleUnderline} className={toolButtonClass}>
            <Underline className="h-3.5 w-3.5" />
          </button>
          </Tooltip>
          <Tooltip enabled content={t('formatting.clear')}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleClearFormat} className={toolButtonClass}>
            <Eraser className="h-3.5 w-3.5" />
          </button>
          </Tooltip>
          <Tooltip enabled content={t('formatting.unorderedList')}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleUnorderedList} className={toolButtonClass}>
            <List className="h-3.5 w-3.5" />
          </button>
          </Tooltip>
          <Tooltip enabled content={t('formatting.orderedList')}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleOrderedList} className={toolButtonClass}>
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          </Tooltip>
          {/* MD 切换按钮 */}
          <Tooltip enabled content={isMdMode ? t('longTextEditor.tooltip.previewMode') : t('longTextEditor.tooltip.markdownMode')}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleMdMode}
            className={[
              'ml-1 inline-flex h-7 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200',
              isMdMode
                ? 'border border-blue-300 bg-blue-100 text-blue-700 shadow-sm'
                : 'border border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600',
            ].join(' ')}
          >
            MD
          </button>
          </Tooltip>
          <button
            type="button"
            disabled={isPolishing}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAiAction}
            className="ml-1 inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPolishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{isPolishing ? t('aiPolishRunning') : t('longTextEditor.aiOptimizeShort')}</span>
          </button>
        </div>}
      </div>

      <div className="flex min-h-0 flex-1 p-4">
        {hasOptimizePanel ? (
          <AiOptimizePanel
            status={optimizeStatus}
            activeTab={optimizeTab}
            originalText={optimizeOriginalText}
            optimizedText={optimizedText}
            errorMessage={optimizeError}
            onTabChange={setOptimizeTab}
            onOptimizedTextChange={setOptimizedText}
            onRetry={handleAiAction}
          />
        ) : isMdMode ? (
          <div
            ref={mdEditorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={t('longTextEditor.markdownAria')}
            data-placeholder={t('longTextEditor.markdownPlaceholder')}
            spellCheck={false}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-ms-editor="false"
            onPaste={handleSafePaste}
            onInput={handleMdInput}
            onBlur={handleMdInput}
            onMouseUp={() => captureMdSelection()}
            onKeyUp={() => captureMdSelection()}
            className={`md-source-editable ${editorSurfaceClass}`}
          />
        ) : (
          <div
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            role="textbox"
            aria-multiline="true"
            aria-label={t('longTextEditor.richTextAria')}
            data-placeholder={t('longTextEditor.richTextPlaceholder')}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-ms-editor="false"
            onPaste={handleSafePaste}
            onInput={handleRichInput}
            onBlur={handleRichInput}
            onMouseUp={() => captureRichSelection()}
            onKeyUp={() => captureRichSelection()}
            className={`rich-text-editable ${editorSurfaceClass}`}
          />
        )}
      </div>
    </div>
  );

  return createPortal(editorContent, document.body);
}
