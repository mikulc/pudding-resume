import React,{ createContext,useCallback,useContext,useEffect,useRef,useState } from 'react';
import { MAX_HISTORY,createDocumentSnapshot,deepClone,getSnapshotKey,type DocumentHistorySnapshot } from '../../features/resume/model/history';
import { useAppUI } from './AppUIContext';
import { useResume } from './ResumeProvider';

interface HistoryContextType {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { data, dispatch } = useResume();
  const { ui, uiDispatch } = useAppUI();
  const initialSnapshotRef = useRef<DocumentHistorySnapshot | null>(null);

  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = createDocumentSnapshot(data, ui.theme);
  }

  const historyRef = useRef<DocumentHistorySnapshot[]>([initialSnapshotRef.current]);
  const idxRef = useRef(0);
  const restoringToKeyRef = useRef<string | null>(null);
  const prevKeyRef = useRef(getSnapshotKey(initialSnapshotRef.current));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const currentSnapshotKey = getSnapshotKey({ data, theme: ui.theme });

  const updateButtons = useCallback(() => {
    setCanUndo(idxRef.current > 0);
    setCanRedo(idxRef.current < historyRef.current.length - 1);
  }, []);

  useEffect(() => {
    const restoringToKey = restoringToKeyRef.current;
    if (restoringToKey) {
      prevKeyRef.current = currentSnapshotKey;
      if (currentSnapshotKey === restoringToKey) {
        restoringToKeyRef.current = null;
      }
      updateButtons();
      return;
    }

    if (currentSnapshotKey === prevKeyRef.current) return;

    const nextSnapshot = createDocumentSnapshot(data, ui.theme);
    const nextHistory = [
      ...historyRef.current.slice(0, idxRef.current + 1),
      nextSnapshot,
    ];

    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.shift();
    }

    historyRef.current = nextHistory;
    idxRef.current = nextHistory.length - 1;
    prevKeyRef.current = currentSnapshotKey;
    updateButtons();
  }, [currentSnapshotKey, data, ui.theme, updateButtons]);

  const restoreSnapshot = useCallback(
    (snapshot: DocumentHistorySnapshot) => {
      const nextSnapshot = deepClone(snapshot);
      restoringToKeyRef.current = getSnapshotKey(nextSnapshot);
      dispatch({ type: 'RESTORE_STATE', payload: nextSnapshot.data });
      uiDispatch({ type: 'SET_THEME', payload: nextSnapshot.theme });
      updateButtons();
    },
    [dispatch, uiDispatch, updateButtons],
  );

  const undo = useCallback(() => {
    if (idxRef.current <= 0) return;
    idxRef.current--;
    restoreSnapshot(historyRef.current[idxRef.current]);
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    if (idxRef.current >= historyRef.current.length - 1) return;
    idxRef.current++;
    restoreSnapshot(historyRef.current[idxRef.current]);
  }, [restoreSnapshot]);

  return (
    <HistoryContext.Provider value={{ undo, redo, canUndo, canRedo }}>
      {children}
    </HistoryContext.Provider>
  );
}
