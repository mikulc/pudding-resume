import React, { createContext, useContext } from 'react';
import { useAtsAnalysis, type AtsHistoryItem } from '../hooks/useAtsAnalysis';
import type { AtsAnalysisResult } from '../types/resume';

interface AtsContextValue {
  jobDescription: string;
  result: AtsAnalysisResult | null;
  loading: boolean;
  progress: number;
  progressStage: string | null;
  receivedChars: number;
  error: string | null;
  lastAnalyzedAt: number | null;
  history: AtsHistoryItem[];
  hasResults: boolean;
  setJobDescription: (value: string) => void;
  runAnalysis: () => Promise<boolean>;
  clearResult: () => void;
  restoreHistory: (id: string) => void;
  clearHistory: () => void;
}

const AtsContext = createContext<AtsContextValue | null>(null);

export function AtsProvider({ children, resumeId }: { children: React.ReactNode; resumeId?: string | null }) {
  const ats = useAtsAnalysis(resumeId);
  return (
    <AtsContext.Provider value={ats}>
      {children}
    </AtsContext.Provider>
  );
}

export function useAtsContext(): AtsContextValue {
  const ctx = useContext(AtsContext);
  if (!ctx) {
    throw new Error('useAtsContext must be used within an AtsProvider');
  }
  return ctx;
}
