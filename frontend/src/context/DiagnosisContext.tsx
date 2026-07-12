import React, { createContext, useContext } from 'react';
import { useDiagnosis } from '../hooks/useDiagnosis';
import type { DiagnosisItem } from '../types/resume';

interface DiagnosisContextValue {
  items: DiagnosisItem[];
  loading: boolean;
  error: string | null;
  activeItemId: string | null;
  hasResults: boolean;
  /** 流式诊断时 AI 实时返回的累积文本 */
  streamingText?: string;
  runDiagnosis: () => Promise<boolean>;
  clearDiagnosis: () => void;
  setActiveItem: (id: string | null) => void;
  getItemsByModule: (module: string) => DiagnosisItem[];
  ignoreItem: (id: string) => void;
  optimizeItem: (id: string) => void;
  undoLastAction: () => boolean;
  canUndoLastAction: boolean;
}

export const DiagnosisContext = createContext<DiagnosisContextValue | null>(null);

export function DiagnosisProvider({ children }: { children: React.ReactNode }) {
  const diagnosis = useDiagnosis();
  return (
    <DiagnosisContext.Provider value={diagnosis}>
      {children}
    </DiagnosisContext.Provider>
  );
}

export function useDiagnosisContext(): DiagnosisContextValue {
  const ctx = useContext(DiagnosisContext);
  if (!ctx) {
    throw new Error('useDiagnosisContext must be used within a DiagnosisProvider');
  }
  return ctx;
}

/** 安全获取诊断上下文，在 provider 之外使用时返回 null */
export function useDiagnosisSafe(): DiagnosisContextValue | null {
  return useContext(DiagnosisContext);
}
