import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeAts } from '../api/ai';
import { useResume } from '../context/ResumeContext';
import type { AtsAnalysisResult } from '../types/resume';

interface AtsState {
  jobDescription: string;
  result: AtsAnalysisResult | null;
  loading: boolean;
  progress: number;
  progressStage: string | null;
  receivedChars: number;
  error: string | null;
  lastAnalyzedAt: number | null;
  history: AtsHistoryItem[];
}

const initialState: AtsState = {
  jobDescription: '',
  result: null,
  loading: false,
  progress: 0,
  progressStage: null,
  receivedChars: 0,
  error: null,
  lastAnalyzedAt: null,
  history: [],
};

export interface AtsHistoryItem {
  id: string;
  title: string;
  jobDescription: string;
  result: AtsAnalysisResult;
  analyzedAt: number;
}

const HISTORY_LIMIT = 5;
const HISTORY_PREFIX = 'pudding_ats_history';

function getSimulatedAtsStage(progress: number) {
  if (progress < 15) return 'request';
  if (progress < 30) return 'parsing';
  if (progress < 50) return 'keywords';
  if (progress < 70) return 'resume';
  if (progress < 85) return 'matching';
  return 'suggestions';
}

function getNextSimulatedProgress(progress: number) {
  if (progress < 15) return Math.min(15, progress + 2);
  if (progress < 30) return Math.min(30, progress + 1.5);
  if (progress < 50) return Math.min(50, progress + 1);
  if (progress < 70) return Math.min(70, progress + 0.75);
  if (progress < 85) return Math.min(85, progress + 0.5);
  return Math.min(90, progress + 0.25);
}

function normalizeScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeResult(result: AtsAnalysisResult): AtsAnalysisResult {
  return {
    score: normalizeScore(result.score),
    summary: result.summary || '',
    matched_keywords: Array.isArray(result.matched_keywords) ? result.matched_keywords : [],
    missing_keywords: Array.isArray(result.missing_keywords) ? result.missing_keywords : [],
    format_issues: Array.isArray(result.format_issues) ? result.format_issues : [],
    content_suggestions: Array.isArray(result.content_suggestions) ? result.content_suggestions : [],
    recommended_layouts: Array.isArray(result.recommended_layouts) ? result.recommended_layouts : [],
  };
}

function getHistoryKey(resumeId: string | null | undefined, language: string) {
  const normalizedLanguage = language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
  return `${HISTORY_PREFIX}_${resumeId || 'draft'}_${normalizedLanguage}`;
}

function makeHistoryTitle(jobDescription: string) {
  const firstLine = jobDescription.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return (firstLine || jobDescription.trim()).slice(0, 42);
}

function sanitizeHistoryItem(item: unknown): AtsHistoryItem | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as Partial<AtsHistoryItem>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.jobDescription !== 'string' ||
    typeof candidate.analyzedAt !== 'number' ||
    !candidate.result
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    jobDescription: candidate.jobDescription,
    result: normalizeResult(candidate.result),
    analyzedAt: candidate.analyzedAt,
  };
}

function readHistory(key: string): AtsHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeHistoryItem)
      .filter((item): item is AtsHistoryItem => Boolean(item))
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeHistory(key: string, history: AtsHistoryItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const payload = history.slice(0, HISTORY_LIMIT).map((item) => ({
      id: item.id,
      title: item.title,
      jobDescription: item.jobDescription,
      result: normalizeResult(item.result),
      analyzedAt: item.analyzedAt,
    }));
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore storage failures */
  }
}

export function useAtsAnalysis(resumeId?: string | null) {
  const { data } = useResume();
  const { i18n } = useTranslation();
  const historyKey = getHistoryKey(resumeId || null, i18n.language);
  const [state, setState] = useState<AtsState>(() => ({
    ...initialState,
    history: readHistory(historyKey),
  }));
  const requestAbortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    requestAbortRef.current?.abort();
    clearProgressTimer();
  }, [clearProgressTimer]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      history: readHistory(historyKey),
      result: null,
      error: null,
      lastAnalyzedAt: null,
    }));
  }, [historyKey]);

  const setJobDescription = useCallback((jobDescription: string) => {
    setState((current) => ({ ...current, jobDescription }));
  }, []);

  const runAnalysis = useCallback(async () => {
    const jobDescription = state.jobDescription.trim();
    if (jobDescription.length < 20) {
      setState((current) => ({
        ...current,
        error: 'jobDescriptionTooShort',
      }));
      return false;
    }

    const controller = new AbortController();
    requestAbortRef.current = controller;
    clearProgressTimer();

    setState((current) => ({
      ...current,
      loading: true,
      progress: 5,
      progressStage: 'request',
      receivedChars: 0,
      error: null,
    }));

    progressTimerRef.current = window.setInterval(() => {
      setState((current) => {
        if (!current.loading) return current;
        const progress = getNextSimulatedProgress(current.progress);
        return {
          ...current,
          progress,
          progressStage: getSimulatedAtsStage(progress),
        };
      });
    }, 600);

    try {
      const result = await analyzeAts(data, jobDescription, i18n.language, {
        onProgress: (event) => {
          setState((current) => {
            if (!current.loading) return current;
            const streamedProgress = event.received_chars
              ? Math.min(90, 30 + Math.floor(event.received_chars / 80))
              : 0;
            const progress = Math.min(90, Math.max(
              current.progress,
              event.progress ?? 0,
              streamedProgress,
            ));
            return {
              ...current,
              progress,
              progressStage: getSimulatedAtsStage(progress),
              receivedChars: event.received_chars ?? current.receivedChars,
            };
          });
        },
      }, controller.signal);
      clearProgressTimer();
      const normalizedResult = normalizeResult(result);
      const analyzedAt = Date.now();
      const item: AtsHistoryItem = {
        id: `${analyzedAt}`,
        title: makeHistoryTitle(jobDescription),
        jobDescription,
        result: normalizedResult,
        analyzedAt,
      };
      setState((current) => {
        const nextHistory = [item, ...current.history.filter((entry) => entry.jobDescription !== jobDescription)].slice(0, HISTORY_LIMIT);
        writeHistory(historyKey, nextHistory);
        return {
          ...current,
          result: normalizedResult,
          loading: false,
          progress: 100,
          progressStage: 'complete',
          error: null,
          lastAnalyzedAt: analyzedAt,
          history: nextHistory,
        };
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return false;
      setState((current) => ({
        ...current,
        loading: false,
        progress: 0,
        progressStage: null,
        error: error instanceof Error ? error.message : 'analysisFailed',
      }));
      return false;
    } finally {
      clearProgressTimer();
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
      }
    }
  }, [clearProgressTimer, data, historyKey, i18n.language, state.jobDescription]);

  const clearResult = useCallback(() => {
    setState((current) => ({
      ...current,
      result: null,
      error: null,
      progress: 0,
      progressStage: null,
      receivedChars: 0,
      lastAnalyzedAt: null,
    }));
  }, []);

  const restoreHistory = useCallback((id: string) => {
    setState((current) => {
      const item = current.history.find((entry) => entry.id === id);
      if (!item) return current;
      return {
        ...current,
        jobDescription: item.jobDescription,
        result: item.result,
        error: null,
        progress: 100,
        progressStage: 'complete',
        receivedChars: 0,
        lastAnalyzedAt: item.analyzedAt,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    writeHistory(historyKey, []);
    setState((current) => ({ ...current, history: [] }));
  }, [historyKey]);

  return useMemo(
    () => ({
      ...state,
      hasResults: Boolean(state.result),
      setJobDescription,
      runAnalysis,
      clearResult,
      restoreHistory,
      clearHistory,
    }),
    [clearHistory, clearResult, restoreHistory, runAnalysis, setJobDescription, state],
  );
}
