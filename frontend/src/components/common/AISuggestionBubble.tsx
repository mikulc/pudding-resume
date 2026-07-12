import React, { forwardRef, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AISuggestionBubbleProps {
  visible: boolean;
  title?: string;
  issueLabel?: string;
  description?: string;
  suggestion?: string;
  onIgnore?: () => void;
  onApply?: () => void;
  ignoreLabel?: string;
  applyLabel?: string;
  disabled?: boolean;
  /** CSS custom properties or position overrides */
  style?: CSSProperties;
  /** Arrow horizontal offset (px from left or CSS value) — overrides the --arrow-left CSS var in style */
  arrowLeft?: number | string;
  /** Extra class names */
  className?: string;
  /** Called on pointer enter (for hover persistence) */
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  /** Called on pointer leave */
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  /** Called on click (stop propagation) */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const accentColor = '#2563eb';

export const AISuggestionBubble = forwardRef<HTMLDivElement, AISuggestionBubbleProps>(({
  visible,
  title,
  issueLabel,
  description,
  suggestion,
  onIgnore,
  onApply,
  ignoreLabel,
  applyLabel,
  disabled = false,
  style,
  arrowLeft,
  className = '',
  onPointerEnter,
  onPointerLeave,
  onClick,
}, ref) => {
  const { t } = useTranslation('editor');
  const resolvedTitle = title ?? t('diagnosisPanel.popover.title');
  const resolvedIgnoreLabel = ignoreLabel ?? t('diagnosisPanel.popover.ignore');
  const resolvedApplyLabel = applyLabel ?? t('diagnosisPanel.popover.replace');
  const arrowStyle: CSSProperties = arrowLeft !== undefined
    ? { '--arrow-left': typeof arrowLeft === 'number' ? `${arrowLeft}px` : arrowLeft } as CSSProperties
    : {};

  const visibilityClass = visible ? 'ai-bubble-visible' : '';

  return (
    <div
      ref={ref}
      className={`ai-suggestion-bubble ${visibilityClass} ${className}`}
      style={{ ...style, ...arrowStyle }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      {/* Header: icon + title + issue label */}
      <div className="ai-bubble-header">
        <span className="ai-bubble-title">
          <Sparkles className="ai-bubble-title-icon" style={{ color: accentColor }} />
          {resolvedTitle}
        </span>
        {issueLabel && (
          <span className="ai-bubble-badge">{issueLabel}</span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="ai-bubble-desc">{description}</p>
      )}

      {/* Suggested rewrite */}
      {suggestion && (
        <p className="ai-bubble-suggestion">{suggestion}</p>
      )}

      {/* Actions */}
      <div className="ai-bubble-actions">
        {onIgnore && (
          <button
            type="button"
            className="ai-bubble-btn-ignore"
            onClick={(e) => {
              e.stopPropagation();
              onIgnore();
            }}
          >
            {resolvedIgnoreLabel}
          </button>
        )}
        {onApply && (
          <button
            type="button"
            className="ai-bubble-btn-apply"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
          >
            {resolvedApplyLabel}
          </button>
        )}
      </div>

      {/* Arrow */}
      <div className="ai-bubble-arrow" />
    </div>
  );
});

AISuggestionBubble.displayName = 'AISuggestionBubble';

export default AISuggestionBubble;
