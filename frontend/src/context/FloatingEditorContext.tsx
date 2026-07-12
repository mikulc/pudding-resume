import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface FloatingEditorCallbacks {
  onTextChange: (text: string) => void;
  onSave: (text: string) => void;
  onSaveWithoutClose?: (text: string) => void;
  onCancel: () => void;
}

// Module-level ref: 供 SaveSync 在 Ctrl+S 时触发浮层「完成」逻辑
// 返回 { hasError } — hasError 为 true 时 SaveSync 应中断保存并提示用户
let completeRef: (() => { hasError: boolean }) | null = null;

/** 注册浮层完成回调（由 FloatingContentEditor 在打开/关闭时调用） */
export function registerFloatingEditorComplete(handler: (() => { hasError: boolean }) | null) {
  completeRef = handler;
}

/** 触发浮层完成逻辑，返回是否有校验错误 */
export function triggerFloatingEditorComplete(): { hasError: boolean } {
  return completeRef?.() ?? { hasError: false };
}

interface FloatingEditorConfig {
  editorKey: string;
  title: string;
  text: string;
  highlightIndex: number;
  totalCount: number;
}

interface FloatingEditorContextType {
  config: FloatingEditorConfig | null;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  open: (cfg: FloatingEditorConfig & { anchorRect: DOMRect } & FloatingEditorCallbacks) => void;
  close: () => void;
  updateCallbacks: (cb: FloatingEditorCallbacks) => void;
  getCallbacks: () => FloatingEditorCallbacks;
}

const FloatingEditorContext = createContext<FloatingEditorContextType | undefined>(undefined);

export function FloatingEditorProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<FloatingEditorConfig | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const configRef = useRef<FloatingEditorConfig | null>(null);
  const callbacksRef = useRef<FloatingEditorCallbacks>({
    onTextChange: () => {},
    onSave: () => {},
    onCancel: () => {},
  });

  const open = useCallback(
    (cfg: FloatingEditorConfig & { anchorRect: DOMRect } & FloatingEditorCallbacks) => {
      callbacksRef.current = {
        onTextChange: cfg.onTextChange,
        onSave: cfg.onSave,
        onSaveWithoutClose: cfg.onSaveWithoutClose,
        onCancel: cfg.onCancel,
      };

      // Same editor reopened — only refresh callbacks & anchor, keep UI stable
      if (isOpen && configRef.current?.editorKey === cfg.editorKey) {
        setAnchorRect(cfg.anchorRect);
        return;
      }

      const { onTextChange, onSave, onSaveWithoutClose, onCancel, ...rest } = cfg;
      configRef.current = rest;
      setConfig(rest);
      setAnchorRect(cfg.anchorRect);
      setIsOpen(true);
    },
    [isOpen],
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateCallbacks = useCallback((cb: FloatingEditorCallbacks) => {
    callbacksRef.current = cb;
  }, []);

  const getCallbacks = useCallback(() => callbacksRef.current, []);

  const value = useMemo<FloatingEditorContextType>(
    () => ({ config, anchorRect, isOpen, open, close, updateCallbacks, getCallbacks }),
    [config, anchorRect, isOpen, open, close, updateCallbacks, getCallbacks],
  );

  return (
    <FloatingEditorContext.Provider value={value}>
      {children}
    </FloatingEditorContext.Provider>
  );
}

export function useFloatingEditor() {
  const context = useContext(FloatingEditorContext);
  if (!context) {
    throw new Error('useFloatingEditor must be used within a FloatingEditorProvider');
  }
  return context;
}
