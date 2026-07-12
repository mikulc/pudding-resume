import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../components/common/ConfirmModal';

interface LongTextEditorSession {
  key: string;
  hasUnsavedChanges: () => boolean;
  discard: () => void;
}

interface LongTextEditorContextType {
  activeEditorKey: string | null;
  requestOpenEditor: (nextKey: string) => Promise<boolean>;
  registerEditor: (session: LongTextEditorSession) => void;
  unregisterEditor: (key: string) => void;
}

const LongTextEditorContext = createContext<LongTextEditorContextType | undefined>(undefined);

export function LongTextEditorProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('editor');
  const { confirm } = useConfirm();
  const activeSessionRef = useRef<LongTextEditorSession | null>(null);
  const [activeEditorKey, setActiveEditorKey] = useState<string | null>(null);

  const requestOpenEditor = useCallback(
    async (nextKey: string) => {
      const current = activeSessionRef.current;
      if (!current || current.key === nextKey) return true;

      if (current.hasUnsavedChanges()) {
        const confirmed = await confirm({
          title: t('longTextContext.discard.title'),
          message: t('longTextContext.discard.message'),
          confirmText: t('longTextContext.discard.confirm'),
          cancelText: t('longTextContext.discard.cancel'),
          confirmVariant: 'danger',
        });
        if (!confirmed) return false;
      }

      current.discard();
      activeSessionRef.current = null;
      setActiveEditorKey(null);
      return true;
    },
    [confirm, t],
  );

  const registerEditor = useCallback((session: LongTextEditorSession) => {
    activeSessionRef.current = session;
    setActiveEditorKey(session.key);
  }, []);

  const unregisterEditor = useCallback((key: string) => {
    if (activeSessionRef.current?.key !== key) return;
    activeSessionRef.current = null;
    setActiveEditorKey(null);
  }, []);

  const value = useMemo(
    () => ({ activeEditorKey, requestOpenEditor, registerEditor, unregisterEditor }),
    [activeEditorKey, requestOpenEditor, registerEditor, unregisterEditor],
  );

  return (
    <LongTextEditorContext.Provider value={value}>
      {children}
    </LongTextEditorContext.Provider>
  );
}

export function useLongTextEditor() {
  const context = useContext(LongTextEditorContext);
  if (!context) {
    throw new Error('useLongTextEditor must be used within a LongTextEditorProvider');
  }
  return context;
}
