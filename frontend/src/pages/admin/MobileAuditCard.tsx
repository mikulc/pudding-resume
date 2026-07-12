import type { AuditLogItem } from '../../types/admin';
import { AdminBadge, cn } from './adminStyles';

// Friendly name fallbacks for actions not covered by i18n
const ACTION_FALLBACK: Record<string, string> = {
  model_balance_refresh: '刷新模型余额',
  'usage.audit.actions.model_balance_refresh': '刷新模型余额缓存',
};

interface MobileAuditCardProps {
  log: AuditLogItem;
  actionLabel: (action: string) => string;
  labelTarget: string;
  labelIp: string;
  labelOriginalAction: string;
}

function formatTime(iso: string): string {
  if (!iso) return '-';
  try {
    // Handle various ISO formats (with/without timezone, with T or space)
    const cleaned = iso.replace(' ', 'T');
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return iso.slice(0, 16);
    const y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${M}-${day} ${h}:${m}`;
  } catch {
    return iso.slice(0, 16);
  }
}

function resolveActionLabel(action: string, i18nLabel: string): { display: string; isRaw: boolean } {
  // If i18n returns the original key, try fallback map
  if (i18nLabel === action || i18nLabel.startsWith('usage.audit.actions.')) {
    // Try exact match first
    if (ACTION_FALLBACK[action]) {
      return { display: ACTION_FALLBACK[action], isRaw: false };
    }
    // Try with prefix
    const prefixed = `usage.audit.actions.${action}`;
    if (ACTION_FALLBACK[prefixed]) {
      return { display: ACTION_FALLBACK[prefixed], isRaw: false };
    }
    return { display: action, isRaw: true };
  }
  return { display: i18nLabel, isRaw: false };
}

export function MobileAuditCard({
  log,
  actionLabel,
  labelTarget,
  labelIp,
  labelOriginalAction,
}: MobileAuditCardProps) {
  const i18nLabel = actionLabel(log.action);
  const { display: actionDisplay, isRaw } = resolveActionLabel(log.action, i18nLabel);
  const targetDisplay = log.target_name || (log.target_id ? log.target_id.slice(0, 8) : '-');

  return (
    <div
      className={cn(
        'relative rounded-[16px] border border-[#E9EDF3] bg-white p-4 w-full min-w-0',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)]',
        'dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      {/* Row 1: Admin name + Time */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <h4 className="text-[16px] font-semibold text-slate-800 dark:text-slate-200 truncate min-w-0">
          {log.admin_name}
        </h4>
        <span className="text-[12px] text-[#64748B] dark:text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
          {formatTime(log.created_at)}
        </span>
      </div>

      {/* Row 2: Action badge */}
      <div className="mt-3 flex items-center gap-2 min-w-0">
        <AdminBadge tone="brand" className="text-[12px] leading-[22px]">
          {actionDisplay}
        </AdminBadge>
      </div>

      {/* Row 3: Target + IP info */}
      <div className="mt-3 pt-3 border-t border-[#F1F5F9] dark:border-slate-800">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          {/* Target */}
          <div className="min-w-0">
            <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mb-0.5">
              {labelTarget}
            </p>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">
              {targetDisplay}
            </p>
          </div>
          {/* IP */}
          <div className="min-w-0">
            <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mb-0.5">
              {labelIp}
            </p>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 font-mono truncate">
              {log.ip}
            </p>
          </div>
        </div>
      </div>

      {/* Row 4 (optional): Original action key */}
      {isRaw && (
        <div className="mt-2 pt-2 border-t border-[#F1F5F9] dark:border-slate-800">
          <p className="text-[11px] text-[#CBD5E1] dark:text-slate-600 truncate">
            {labelOriginalAction}: {log.action}
          </p>
        </div>
      )}
    </div>
  );
}
