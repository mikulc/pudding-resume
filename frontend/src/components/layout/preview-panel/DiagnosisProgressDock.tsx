import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { TaskProgressDock } from '../../common/TaskProgressDock';


export function DiagnosisProgressDock({ mobile = false }: { mobile?: boolean }) {
  const { t } = useTranslation('editor');
  const diagnosis = useDiagnosisContext();
  const [visibleState, setVisibleState] = useState<'loading' | 'success' | 'error' | null>(
    diagnosis.loading ? 'loading' : null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const previousLoadingRef = useRef(diagnosis.loading);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (diagnosis.loading) {
      setVisibleState('loading');
      setElapsedSeconds(0);
      previousLoadingRef.current = true;
      return;
    }

    if (previousLoadingRef.current) {
      setVisibleState(diagnosis.error ? 'error' : 'success');
      hideTimerRef.current = window.setTimeout(() => {
        setVisibleState(null);
        hideTimerRef.current = null;
      }, diagnosis.error ? 4800 : 3200);
    }
    previousLoadingRef.current = false;

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [diagnosis.error, diagnosis.loading]);

  useEffect(() => {
    if (!diagnosis.loading) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [diagnosis.loading]);

  if (!visibleState) return null;

  const streamingLength = diagnosis.streamingText?.length ?? 0;
  const progress = visibleState === 'loading'
    ? Math.min(94, Math.max(12, Math.round((streamingLength / 2200) * 82) + Math.min(12, elapsedSeconds)))
    : 100;
  const stepKeys = [
    'diagnosisPanel.loading.initial',
    'diagnosisPanel.loading.scanning',
    'diagnosisPanel.loading.thinking',
    'diagnosisPanel.loading.reviewing',
  ];
  const activeStep = visibleState === 'loading'
    ? Math.min(stepKeys.length - 1, Math.floor(progress / 28))
    : stepKeys.length;
  const title = visibleState === 'loading'
    ? t('previewToolbar.aiDiagnosis')
    : visibleState === 'error'
      ? t('diagnosisError.failed')
      : t('diagnosisPanel.aiResults');
  const description = visibleState === 'loading'
    ? t(stepKeys[activeStep])
    : visibleState === 'error'
      ? (diagnosis.error || t('diagnosisPanel.loading.stillWorking'))
      : diagnosis.items.length > 0
        ? t('diagnosisPanel.suggestionCount', { count: diagnosis.items.length })
        : t('diagnosisPanel.noSuggestions');

  return (
    <TaskProgressDock
      visible
      taskType="diagnosis"
      status={visibleState}
      title={title}
      description={description}
      progress={progress}
      mobile={mobile}
      excludeId="diagnosis-progress-dock"
    />
  );
}

