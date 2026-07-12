import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { AdminUserDetail } from '../../types/admin';
import { AdminBadge } from './adminStyles';
import { formatMobileTime } from './userTimeFormat';

interface UserDetailDrawerProps {
  open: boolean;
  user: AdminUserDetail | null;
  onClose: () => void;
  t: (key: string, options?: Record<string, any>) => string;
}

export function UserDetailDrawer({ open, user, onClose, t }: UserDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // Touch drag to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 80) {
      onClose();
      startYRef.current = null;
    }
  }, [onClose]);

  const handleTouchEnd = useCallback(() => {
    startYRef.current = null;
  }, []);

  if (!open || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.28)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-[20px] border border-[#E6EAF2] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900 animate-[sheetUp_220ms_ease-out]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#D1D5DB] dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('users.detail.title')}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-5" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Avatar + Name + Email */}
          <div className="flex items-center gap-3 mb-5">
            {user.avatar ? (
              <img src={user.avatar} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{user.username}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Detail rows */}
          <div className="space-y-0">
            <DetailRow
              label={t('users.detail.id')}
              value={user.id}
              mono
              copyable
            />
            <DetailRow
              label={t('users.detail.role')}
              badge={user.role === 'admin' ? t('users.roleAdmin') : t('users.roleUser')}
              badgeTone={user.role === 'admin' ? 'violet' : 'neutral'}
            />
            <DetailRow
              label={t('users.detail.status')}
              badge={user.status === 'active' ? t('users.detail.statusActive') : t('users.detail.statusDeleted')}
              badgeTone={user.status === 'active' ? 'success' : 'danger'}
            />
            <DetailRow label={t('users.detail.registeredAt')} value={formatMobileTime(user.created_at)} />
            <DetailRow label={t('users.detail.lastLogin')} value={formatMobileTime(user.last_login_at)} />
            <DetailRow label={t('users.detail.lastActive')} value={formatMobileTime(user.last_active_at)} />
            <DetailRow label={t('users.detail.resumeCount')} value={`${user.resume_count} / ${user.max_resumes}`} numeric />
            <DetailRow label={t('users.detail.totalResumes')} value={String(user.total_resumes_created)} numeric />
            <DetailRow label={t('users.detail.exportQuota')} value={String(user.export_count)} numeric />
            <DetailRow label={t('users.detail.totalExports')} value={String(user.total_exports)} numeric />
            <DetailRow
              label={t('users.detail.editingTime')}
              value={`${Math.floor(user.total_editing_seconds / 3600)}h ${Math.floor((user.total_editing_seconds % 3600) / 60)}m`}
            />
            <DetailRow
              label={t('users.detail.dailyTokenLimit')}
              value={user.daily_limit_tokens ? user.daily_limit_tokens.toLocaleString() : t('users.notLimited')}
              numeric
            />
            <DetailRow
              label={t('users.detail.monthlyTokenLimit')}
              value={user.monthly_limit_tokens ? user.monthly_limit_tokens.toLocaleString() : t('users.notLimited')}
              numeric
            />
          </div>
        </div>
      </div>

      {/* Animation keyframes injected once */}
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function DetailRow({
  label,
  value,
  mono,
  copyable,
  numeric,
  badge,
  badgeTone,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  copyable?: boolean;
  numeric?: boolean;
  badge?: string;
  badgeTone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'violet';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9] dark:border-slate-800 last:border-b-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0 mr-4">{label}</span>
      <span className="flex items-center gap-1.5 text-right min-w-0 max-w-[60%]">
        {badge ? (
          <AdminBadge tone={badgeTone || 'neutral'} className="text-[11px]">{badge}</AdminBadge>
        ) : (
          <>
            <span
              className={`text-sm text-slate-800 dark:text-slate-200 truncate ${
                mono ? 'font-mono text-xs' : numeric ? 'font-normal tabular-nums' : ''
              }`}
              style={mono ? {} : numeric ? { fontVariantNumeric: 'tabular-nums' } : {}}
            >
              {value}
            </span>
            {copyable && value && (
              <button
                onClick={handleCopy}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            )}
          </>
        )}
      </span>
    </div>
  );
}
