import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export type ExitChoice = 'save' | 'discard' | 'cancel';

interface ExitConfirmOptions {
  isLoggedIn: boolean;
  /** 是否已选择本地存储目录（可据此判断可否保存到本地） */
  localStoragePath?: string;
}

interface ExitConfirmContextType {
  exitConfirm: (options: ExitConfirmOptions) => Promise<ExitChoice>;
}

const ExitConfirmContext = createContext<ExitConfirmContextType | undefined>(undefined);

export function useExitConfirm() {
  const context = useContext(ExitConfirmContext);
  if (!context) {
    throw new Error('useExitConfirm must be used within an ExitConfirmProvider');
  }
  return context;
}

interface PendingState {
  options: ExitConfirmOptions;
  resolve: (choice: ExitChoice) => void;
}

export function ExitConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [state, setState] = useState<PendingState | null>(null);

  const exitConfirm = useCallback(
    (options: ExitConfirmOptions): Promise<ExitChoice> => {
      return new Promise((resolve) => {
        setState({ options, resolve });
      });
    },
    [],
  );

  const handleChoose = useCallback(
    (choice: ExitChoice) => {
      if (state) {
        state.resolve(choice);
        setState(null);
      }
    },
    [state],
  );

  return (
    <ExitConfirmContext.Provider value={{ exitConfirm }}>
      {children}
      {state &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={() => handleChoose('cancel')}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            {/* Dialog */}
            <div
              className="relative bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">{t('dialog.unsavedChanges.title')}</h3>
              </div>

              {/* Message */}
              <div className="text-sm text-gray-500 leading-relaxed mb-6 space-y-2">
                <p>{t('dialog.unsavedChanges.message')}</p>
                {!state.options.isLoggedIn && !state.options.localStoragePath && (
                  <p className="text-amber-600 font-medium">
                    {t('dialog.unsavedChanges.loginRequiredHint')}
                  </p>
                )}
                {!state.options.isLoggedIn && state.options.localStoragePath && (
                  <p className="text-blue-600 font-medium">
                    {t('dialog.unsavedChanges.localStorageHint')}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleChoose('cancel')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {t('button.cancel')}
                </button>

                <button
                  onClick={() => handleChoose('discard')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                  {t('button.exitWithoutSaving')}
                </button>

              </div>
            </div>
          </div>,
          document.body,
        )}
    </ExitConfirmContext.Provider>
  );
}
