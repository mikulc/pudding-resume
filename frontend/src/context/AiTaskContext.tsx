import React, { createContext, useCallback, useContext, useState } from 'react';

export type ActiveAiTask = 'diagnosis' | 'ats' | 'translate' | null;

interface AiTaskContextValue {
  activeAiTask: ActiveAiTask;
  requestAiTask: (task: Exclude<ActiveAiTask, null>) => boolean;
  releaseAiTask: (task: Exclude<ActiveAiTask, null>) => void;
}

const AiTaskContext = createContext<AiTaskContextValue | null>(null);

export function AiTaskProvider({ children }: { children: React.ReactNode }) {
  const [activeAiTask, setActiveAiTask] = useState<ActiveAiTask>(null);

  const requestAiTask = useCallback((task: Exclude<ActiveAiTask, null>) => {
    let acquired = false;
    setActiveAiTask((current) => {
      if (current && current !== task) return current;
      acquired = true;
      return task;
    });
    return acquired;
  }, []);

  const releaseAiTask = useCallback((task: Exclude<ActiveAiTask, null>) => {
    setActiveAiTask((current) => (current === task ? null : current));
  }, []);

  return (
    <AiTaskContext.Provider value={{ activeAiTask, requestAiTask, releaseAiTask }}>
      {children}
    </AiTaskContext.Provider>
  );
}

export function useAiTask() {
  const ctx = useContext(AiTaskContext);
  if (!ctx) {
    throw new Error('useAiTask must be used within an AiTaskProvider');
  }
  return ctx;
}
