import { FileSearch } from 'lucide-react';
import type { AuditLogItem } from '../../types/admin';
import { MobileAuditCard } from './MobileAuditCard';

interface MobileAuditCardListProps {
  logs: AuditLogItem[];
  loading: boolean;
  hasFilter: boolean;
  actionLabel: (action: string) => string;
  labelTarget: string;
  labelIp: string;
  labelOriginalAction: string;
  emptyText: string;
  noResultText: string;
}

export function MobileAuditCardList({
  logs,
  loading,
  hasFilter,
  actionLabel,
  labelTarget,
  labelIp,
  labelOriginalAction,
  emptyText,
  noResultText,
}: MobileAuditCardListProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[16px] border border-[#E9EDF3] bg-white p-4 animate-pulse dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Row 1: name + time */}
            <div className="flex items-start justify-between gap-3">
              <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            {/* Row 2: badge */}
            <div className="mt-3">
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            {/* Row 3: target + ip */}
            <div className="mt-3 pt-3 border-t border-[#F1F5F9] dark:border-slate-800 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="h-3 w-8 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-1">
                <div className="h-3 w-6 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F7FB] dark:bg-slate-800 mb-4">
          <FileSearch size={28} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400">
          {hasFilter ? noResultText : emptyText}
        </p>
        <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">
          {hasFilter ? '当前筛选条件下没有匹配记录' : '暂无后台操作记录'}
        </p>
      </div>
    );
  }

  // Card list
  return (
    <div className="flex flex-col gap-3.5">
      {logs.map(l => (
        <MobileAuditCard
          key={l.id}
          log={l}
          actionLabel={actionLabel}
          labelTarget={labelTarget}
          labelIp={labelIp}
          labelOriginalAction={labelOriginalAction}
        />
      ))}
    </div>
  );
}
