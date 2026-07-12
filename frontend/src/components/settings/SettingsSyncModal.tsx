import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface SettingsSyncModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 同步确认弹窗
 * 当登录后检测到 localStorage 与云端设置不一致时弹出
 */
export function SettingsSyncModal({ open, onConfirm, onCancel }: SettingsSyncModalProps) {
  const { t } = useTranslation('settings');
  // 按 Escape 取消
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  // 禁止背景滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 w-[420px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modal-dialog-enter 0.2s ease-out' }}
      >
        <style>{`
          @keyframes modal-dialog-enter {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes modal-backdrop-enter {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-amber-50">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {t('sync.title')}
        </h3>

        {/* Message */}
        <div className="text-sm text-gray-500 text-center leading-relaxed mb-2">
          <p>
            {t('sync.message')}
          </p>
        </div>



        {/* Description */}
        <p className="text-xs text-gray-400 text-center mb-6">
          {t('sync.description')}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('sync.useLocal')}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors dark:bg-[#fbbf24] dark:text-[#17191d] dark:hover:bg-[#f59e0b]"
          >
            {t('sync.useCloud')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
