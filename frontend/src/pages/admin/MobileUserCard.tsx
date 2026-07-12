import { useState, useRef, useCallback } from 'react';
import {
  MoreHorizontal, Eye, Shield, SlidersHorizontal,
  Key, LogOut, Trash2,
} from 'lucide-react';
import type { AdminUserItem } from '../../types/admin';
import { AdminBadge } from './adminStyles';
import { formatMobileTimeShort } from './userTimeFormat';
import { cn } from './adminStyles';

interface MobileUserCardProps {
  user: AdminUserItem;
  onOpenDetail: (user: AdminUserItem) => void;
  onAction: (action: string, user: AdminUserItem) => void;
}

export function MobileUserCard({
  user,
  onOpenDetail,
  onAction,
}: MobileUserCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(prev => !prev);
  }, []);

  const handleActionClick = useCallback((action: string) => {
    setMenuOpen(false);
    onAction(action, user);
  }, [onAction, user]);

  const roleLabel = user.role === 'admin' ? '管理员' : '普通用户';

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-[#E9EDF3] bg-white p-4 w-full min-w-0',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)]',
        'transition-[background-color] [transition-duration:140ms]',
        'dark:border-slate-800 dark:bg-slate-900',
      )}
      onClick={() => onOpenDetail(user)}
    >
      {/* Row 1: Avatar + Username + Role + More */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        {user.avatar ? (
          <img
            src={user.avatar}
            className="w-[42px] h-[42px] rounded-full object-cover shrink-0"
            alt=""
          />
        ) : (
          <div className="w-[42px] h-[42px] rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-500 shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Username + Role */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 truncate">
            {user.username}
          </span>
          <AdminBadge tone={user.role === 'admin' ? 'violet' : 'neutral'} className="shrink-0 text-[11px] leading-[22px]">
            {roleLabel}
          </AdminBadge>
          {user.status === 'deleted' && (
            <AdminBadge tone="danger" className="shrink-0 text-[11px]">已删除</AdminBadge>
          )}
        </div>

        {/* More button */}
        <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={handleToggleMenu}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] text-slate-400 hover:bg-slate-50 active:bg-[#EEF4FF] active:text-[#3272FF] dark:hover:bg-slate-800 dark:active:bg-blue-950/35 transition-colors duration-150"
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                <div
                  className="absolute right-0 top-full mt-1 z-40 w-44 rounded-[14px] border border-[#E9EDF3] bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem icon={<Eye size={15} />} label="查看详情" onClick={() => handleActionClick('detail')} />
                  <MenuItem icon={<Shield size={15} />} label="修改角色" onClick={() => handleActionClick('role')} />
                  <MenuItem icon={<SlidersHorizontal size={15} />} label="修改配额" onClick={() => handleActionClick('quota')} />
                  <MenuItem icon={<Key size={15} />} label="重置密码" onClick={() => handleActionClick('password')} />
                  <MenuItem icon={<LogOut size={15} />} label="强制下线" onClick={() => handleActionClick('logout')} />
                  <div className="my-1 border-t border-[#F1F5F9] dark:border-slate-800" />
                  <MenuItem
                    icon={<Trash2 size={15} />}
                    label="删除用户"
                    onClick={() => handleActionClick('delete')}
                    danger
                  />
                </div>
              </>
            )}
        </div>
      </div>

      {/* Row 2: Email */}
      <div className="mt-2 ml-0">
        <p
          className="text-[13px] text-slate-500 dark:text-slate-400 truncate min-w-0"
          title={user.email}
          style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          {user.email}
        </p>
      </div>

      {/* Row 3: Resume count + Last login */}
      <div className="mt-3 pt-3 border-t border-[#F1F5F9] dark:border-slate-800">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <SummaryItem
            label="简历"
            value={`${user.resume_count} / ${user.max_resumes}`}
          />
          <SummaryItem
            label="最近登录"
            value={formatMobileTimeShort(user.last_login_at)}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate">{value}</p>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/35'
          : 'text-slate-600 hover:bg-[#F5F7FB] dark:text-slate-300 dark:hover:bg-slate-800',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
