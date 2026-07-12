import { Users, X } from 'lucide-react';
import type { AdminUserItem } from '../../types/admin';
import { MobileUserCard } from './MobileUserCard';

interface MobileUserCardListProps {
  users: AdminUserItem[];
  loading: boolean;
  hasFilter: boolean;
  onOpenDetail: (user: AdminUserItem) => void;
  onAction: (action: string, user: AdminUserItem) => void;
  onClearFilter: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyText: string;
  noResultText: string;
  clearFilterText: string;
}

export function MobileUserCardList({
  users,
  loading,
  hasFilter,
  onOpenDetail,
  onAction,
  onClearFilter,
  onLoadMore,
  hasMore,
  emptyText,
  noResultText,
  clearFilterText,
}: MobileUserCardListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E9EDF3] bg-white p-4 animate-pulse dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#F1F5F9] dark:border-slate-800 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="h-3 w-8 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-1">
                <div className="h-3 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F7FB] dark:bg-slate-800 mb-4">
          <Users size={28} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400">
          {hasFilter ? noResultText : emptyText}
        </p>
        <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">
          {hasFilter ? '当前没有符合筛选条件的用户' : '还没有任何注册用户'}
        </p>
        {hasFilter && (
          <button
            onClick={onClearFilter}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E6EAF2] bg-white px-4 text-[13px] text-slate-500 hover:bg-[#F8FAFF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
            {clearFilterText}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {users.map(u => (
          <MobileUserCard
            key={u.id}
            user={u}
            onOpenDetail={onOpenDetail}
            onAction={onAction}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onLoadMore}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E6EAF2] bg-white px-5 text-sm text-slate-500 hover:bg-[#F8FAFF] hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            加载更多
          </button>
        </div>
      )}
    </>
  );
}
