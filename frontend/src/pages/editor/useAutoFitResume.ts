import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppUI } from '../../context/ResumeContext';
import { useToast } from '../../components/common/Toast';
import { stepPreviewZoom } from '../../utils/previewZoom';

export function useAutoFitResume() {
  const { ui, uiDispatch } = useAppUI();
  const { showToast } = useToast();
  const { t } = useTranslation('editor');
  // ---- Auto-fit state machine ----
  const AUTO_FIT_MIN_PAGE_MARGIN = 10;
  const AUTO_FIT_MIN_LINE_SPACING = 1.2;
  const AUTO_FIT_MIN_FONT_SIZE = 11;
  const AUTO_FIT_PAGE_MARGIN_STEP = 1;
  const AUTO_FIT_LINE_SPACING_STEP = 0.1;
  const AUTO_FIT_FONT_SIZE_STEP = 1;
  type AutoFitPhase = 'idle' | 'pagemargin' | 'linespacing' | 'fontsize';
  interface AutoFitState {
    phase: AutoFitPhase;
    originalSettings: { pageMargin: number; lineSpacing: number; fontSize: number } | null;
  }
  const autoFitRef = useRef<AutoFitState>({ phase: 'idle', originalSettings: null });
  const pageCountRef = useRef(0);
  const [measureTick, setMeasureTick] = useState(0);
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const [autoFitActive, setAutoFitActive] = useState(false);
  // 稳定引用，始终指向最新的 doNextStep
  const doNextStepRef = useRef<() => void>(() => {});

  const finishAutoFitAtMinimum = useCallback(() => {
    autoFitRef.current.phase = 'idle';
    setIsAutoFitting(false);
    setAutoFitActive(true);
    showToast(t('autoFitMinReached'), 'error');
  }, [showToast, t]);

  // ---- Zoom controls ----
  const setZoom = useCallback(
    (newZoom: number) => uiDispatch({ type: 'SET_ZOOM', payload: newZoom }),
    [uiDispatch],
  );
  const handleZoomIn = useCallback(() => setZoom(stepPreviewZoom(ui.zoom, 0.1)), [ui.zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(stepPreviewZoom(ui.zoom, -0.1)), [ui.zoom, setZoom]);
  const handleResetZoom = useCallback(() => setZoom(1), [setZoom]);
  const handleFitToWidth = useCallback(() => {
    // 由 PreviewPanel 覆盖实现，此处提供 noop 以满足类型要求
  }, []);

  // ---- Auto-fit: page count callback from preview ----
  const handlePageCountChange = useCallback((numPages: number) => {
    pageCountRef.current = numPages;
    setMeasureTick((t) => t + 1);
  }, []);

  // ---- Auto-fit: execute next adjustment step ----
  const doNextStep = useCallback(() => {
    const state = autoFitRef.current;
    if (state.phase === 'idle' || !state.originalSettings) return;

    const { theme } = ui;

    if (state.phase === 'pagemargin') {
      if (theme.pageMargin > AUTO_FIT_MIN_PAGE_MARGIN) {
        uiDispatch({
          type: 'SET_THEME',
          payload: { pageMargin: Math.max(AUTO_FIT_MIN_PAGE_MARGIN, theme.pageMargin - AUTO_FIT_PAGE_MARGIN_STEP) },
        });
        return;
      }
      autoFitRef.current.phase = 'linespacing';
    }

    if (autoFitRef.current.phase === 'linespacing') {
      if (theme.lineSpacing > AUTO_FIT_MIN_LINE_SPACING) {
        uiDispatch({
          type: 'SET_THEME',
          payload: {
            lineSpacing: Math.max(
              AUTO_FIT_MIN_LINE_SPACING,
              +(theme.lineSpacing - AUTO_FIT_LINE_SPACING_STEP).toFixed(1),
            ),
          },
        });
        return;
      }
      autoFitRef.current.phase = 'fontsize';
    }

    if (autoFitRef.current.phase === 'fontsize') {
      if (theme.fontSize > AUTO_FIT_MIN_FONT_SIZE) {
        uiDispatch({
          type: 'SET_THEME',
          payload: { fontSize: Math.max(AUTO_FIT_MIN_FONT_SIZE, theme.fontSize - AUTO_FIT_FONT_SIZE_STEP) },
        });
        return;
      }
      // 全部参数已到最小值，停留在当前压缩结果，等待用户再次点击恢复
      finishAutoFitAtMinimum();
    }
  }, [finishAutoFitAtMinimum, ui, uiDispatch]);

  // 保持 doNextStepRef 同步到最新
  useEffect(() => {
    doNextStepRef.current = doNextStep;
  }, [doNextStep]);

  // ---- Auto-fit: 监听测量回调驱动状态机 ----
  useEffect(() => {
    const state = autoFitRef.current;
    if (state.phase === 'idle' || !state.originalSettings) return;

    if (pageCountRef.current <= 1) {
      // 成功适配一页！保持开关激活状态，保留原始设置以便后续关闭恢复
      autoFitRef.current.phase = 'idle';
      setIsAutoFitting(false);
      setAutoFitActive(true);
      showToast(t('autoFitDone'), 'success');
      return;
    }

    // 仍多页，继续下一步调整
    doNextStepRef.current();
  }, [measureTick, showToast, t]);

  // ---- Auto-fit: 开关切换 ----
  const handleToggleAutoFit = useCallback(() => {
    if (autoFitActive) {
      // 关闭：还原原始设置
      const orig = autoFitRef.current.originalSettings;
      if (orig) {
        uiDispatch({ type: 'SET_THEME', payload: orig });
      }
      autoFitRef.current = { phase: 'idle', originalSettings: null };
      setIsAutoFitting(false);
      setAutoFitActive(false);
      showToast(t('autoFitRestored'), 'success');
      return;
    }

    // 开启：当前测量结果已是一页则无需调整
    if (pageCountRef.current <= 1) {
      setAutoFitActive(true);
      showToast(t('autoFitAlreadyOne'), 'success');
      return;
    }

    const { theme } = ui;
    const orig = {
      pageMargin: theme.pageMargin,
      lineSpacing: theme.lineSpacing,
      fontSize: theme.fontSize,
    };

    autoFitRef.current = {
      phase: 'pagemargin',
      originalSettings: orig,
    };
    setIsAutoFitting(true);
    setAutoFitActive(true);

    // 首次调整：按优先级选择第一个可调的参数
    if (theme.pageMargin > AUTO_FIT_MIN_PAGE_MARGIN) {
      uiDispatch({
        type: 'SET_THEME',
        payload: { pageMargin: Math.max(AUTO_FIT_MIN_PAGE_MARGIN, theme.pageMargin - AUTO_FIT_PAGE_MARGIN_STEP) },
      });
    } else if (theme.lineSpacing > AUTO_FIT_MIN_LINE_SPACING) {
      autoFitRef.current.phase = 'linespacing';
      uiDispatch({
        type: 'SET_THEME',
        payload: {
          lineSpacing: Math.max(
            AUTO_FIT_MIN_LINE_SPACING,
            +(theme.lineSpacing - AUTO_FIT_LINE_SPACING_STEP).toFixed(1),
          ),
        },
      });
    } else if (theme.fontSize > AUTO_FIT_MIN_FONT_SIZE) {
      autoFitRef.current.phase = 'fontsize';
      uiDispatch({
        type: 'SET_THEME',
        payload: { fontSize: Math.max(AUTO_FIT_MIN_FONT_SIZE, theme.fontSize - AUTO_FIT_FONT_SIZE_STEP) },
      });
    } else {
        // 页面设置已为最小值，无法自动调整为一页
      finishAutoFitAtMinimum();
    }
  }, [autoFitActive, finishAutoFitAtMinimum, ui, uiDispatch, showToast, t]);


  return {
    autoFitActive,
    isAutoFitting,
    handlePageCountChange,
    handleZoomOut,
    handleResetZoom,
    handleZoomIn,
    handleToggleAutoFit,
    handleFitToWidth,
  };
}
