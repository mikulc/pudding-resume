import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ErrorAccessPageProps {
  /** Overrides the auto-resolved title. If not set, derived from message content. */
  title?: string;
  message: string;
}

/**
 * Map raw backend/frontend error messages to friendly, user-facing copy.
 */
type ErrorAccessCopyKey = 'linkExpired' | 'notPublic' | 'deleted' | 'fallback';

const fromCodes = (codes: number[]) => String.fromCharCode(...codes);
const SHARE_LINK_FAILURE_TOKENS = [
  fromCodes([0x94fe, 0x63a5, 0x65e0, 0x6548]),
  fromCodes([0x94fe, 0x63a5, 0x5df2]),
  fromCodes([0x65e0, 0x6548, 0x7684, 0x5206, 0x4eab]),
  fromCodes([0x5206, 0x4eab, 0x94fe, 0x63a5]),
];
const NOT_PUBLIC_TOKENS = [
  fromCodes([0x672a, 0x516c, 0x5f00, 0x5206, 0x4eab]),
  fromCodes([0x672a, 0x516c, 0x5f00]),
];
const DELETED_TOKENS = [
  fromCodes([0x5df2, 0x5220, 0x9664]),
  fromCodes([0x5df2, 0x88ab, 0x5220, 0x9664]),
];

function includesAny(message: string, tokens: string[]) {
  return tokens.some((token) => message.includes(token));
}

function resolveCopyKey(message: string): ErrorAccessCopyKey {
  const m = message || '';

  // Link/share failures first — these take priority over "已删除" which
  // appears in messages like "该分享链接无效或已删除".
  if (includesAny(m, SHARE_LINK_FAILURE_TOKENS)) return 'linkExpired';

  if (includesAny(m, NOT_PUBLIC_TOKENS)) return 'notPublic';

  if (includesAny(m, DELETED_TOKENS)) return 'deleted';

  // Fallback: show the original message
  return 'fallback';
}

/**
 * Shared "access denied / not found" page used in ResumePage and SharedResumePage.
 * Clean, lightweight card design matching the project's white-card + blue-button style.
 */
export function ErrorAccessPage({ title, message }: ErrorAccessPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const copyKey = resolveCopyKey(message);
  const copy = {
    title: t(`errorAccess.${copyKey}.title`),
    body: copyKey === 'fallback' ? message : t(`errorAccess.${copyKey}.body`),
    helper: t(`errorAccess.${copyKey}.helper`),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div
        className="bg-white dark:bg-gray-900 rounded-[20px] p-8 w-[420px] max-w-[calc(100vw-32px)] text-center"
        style={{
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.6)',
          animation: 'fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400" />
        </div>

        {/* Title */}
        <h2 className="mb-1.5 text-lg font-semibold text-[#1f2937] dark:text-gray-100">
          {title ?? copy.title}
        </h2>

        {/* Body */}
        <p className="mb-1 text-sm text-[#8a94a6] dark:text-gray-400">
          {copy.body}
        </p>

        {/* Helper */}
        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">
          {copy.helper}
        </p>

        {/* Button */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-[10px] bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('button.backHome')}
        </button>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
