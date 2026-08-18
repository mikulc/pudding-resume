import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const TOAST_DURATION = 5000;
const TOAST_EXIT_DURATION = 300;

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <svg className="toast__icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" />
        <path d="m6.6 10.1 2.1 2.1 4.7-4.7" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === 'error') {
    return (
      <svg className="toast__icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" />
        <path d="m7.3 7.3 5.4 5.4m0-5.4-5.4 5.4" fill="none" stroke="white" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className="toast__icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="currentColor" />
      <path d="M10 8.8v4.1M10 6.3h.01" fill="none" stroke="white" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((toast) => (
      toast.id === id ? { ...toast, exiting: true } : toast
    )));

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_EXIT_DURATION);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      dismissToast(id);
    }, TOAST_DURATION);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="toast-region z-[10100]" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => {
            return (
              <div
                key={toast.id}
                className={`toast toast--${toast.type}${toast.exiting ? ' toast--exiting' : ''}`}
                data-toast=""
                data-type={toast.type}
                role={toast.type === 'error' ? 'alert' : 'status'}
              >
                <ToastIcon type={toast.type} />
                <span className="toast__message" title={toast.message}>{toast.message}</span>
                <button
                  type="button"
                  className="toast__close"
                  aria-label="关闭通知"
                  onClick={() => dismissToast(toast.id)}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m5 5 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
