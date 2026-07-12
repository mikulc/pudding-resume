import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';

interface LongTextFieldEntryProps {
  label: string;
  value: string;
  isActive: boolean;
  onOpen: (triggerRect: DOMRect) => void;
  emptyText?: string;
  /** 用于锚点追踪的唯一标识，设置到按钮的 data-floating-editor-anchor 属性 */
  anchorKey?: string;
}

function getContentLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripPreviewMarkdown(value: string) {
  return value
    .replace(/^\s*(?:[-*]\s+|\d+\.\s+)/gm, '')
    .replace(/\*\*\*|\*\*|\*|__/g, '')
    .trim();
}

export function LongTextFieldEntry({
  label,
  value,
  isActive,
  onOpen,
  emptyText,
  anchorKey,
}: LongTextFieldEntryProps) {
  const { t } = useTranslation('editor');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lines = getContentLines(value);
  const hasContent = lines.length > 0;
  const preview = hasContent ? stripPreviewMarkdown(value) : (emptyText ?? t('longTextEntry.emptyAction'));
  const statusText = isActive
    ? t('longTextEntry.editing')
    : hasContent
      ? t('longTextEntry.filledLines', { count: lines.length })
      : t('longTextEntry.empty');

  const handleClick = () => {
    if (buttonRef.current) {
      onOpen(buttonRef.current.getBoundingClientRect());
    } else {
      // Fallback: pass a zero rect if ref isn't available
      onOpen(new DOMRect());
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      data-long-text-editor-trigger
      data-long-text-editor-active={isActive ? 'true' : undefined}
      data-floating-editor-anchor={anchorKey}
      onClick={handleClick}
      className={[
        'long-text-field-entry group relative w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-[22px] border p-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200',
        isActive
          ? 'long-text-field-entry-active border-blue-300 bg-blue-50/70 ring-1 ring-blue-200'
          : 'border-gray-200 bg-slate-50/60 hover:border-blue-200 hover:bg-blue-50/40',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 max-w-full overflow-hidden">
          <div className="long-text-field-entry-label text-sm font-medium text-gray-600">{label}</div>
          <div className={`long-text-field-entry-status ${isActive ? 'mt-1 text-xs font-medium text-blue-600' : 'mt-1 text-xs text-gray-400'}`}>
            {statusText}
          </div>
        </div>
        <span
          data-long-text-editor-trigger
          className={[
            'long-text-field-entry-action',
            'inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors',
            isActive
              ? 'bg-white text-blue-600 ring-1 ring-blue-200'
              : 'text-blue-500 hover:text-blue-600',
          ].join(' ')}
        >
          <Maximize2 className="h-3 w-3" />
          {isActive ? t('longTextEntry.editing') : t('longTextEntry.open')}
        </span>
      </div>

      <p
        className={[
          'long-text-field-entry-preview',
          'mt-2 w-full min-w-0 max-w-full text-xs leading-5 break-words [overflow-wrap:anywhere]',
          hasContent ? 'whitespace-pre-wrap text-gray-600' : 'text-gray-400',
        ].join(' ')}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {preview}
      </p>
    </button>
  );
}
