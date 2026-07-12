import { useState } from 'react';
import { MoreHorizontal, Eye, EyeOff, Edit3, Trash2 } from 'lucide-react';
import type { ChangelogEntryItem } from '../../types/admin';
import { AdminBadge, cn } from './adminStyles';

const TONE_CONFIG: Record<string, { class: string; label: string }> = {
  blue:    { class: 'bg-blue-500',   label: '蓝色' },
  emerald: { class: 'bg-emerald-500', label: '翠绿' },
  amber:   { class: 'bg-amber-500',  label: '琥珀' },
};

interface MobileChangelogCardProps {
  entry: ChangelogEntryItem;
  onTogglePublish: (entry: ChangelogEntryItem) => void;
  onEdit: (entry: ChangelogEntryItem) => void;
  onDelete: (entry: ChangelogEntryItem) => void;
  labelPublished: string;
  labelDraft: string;
  labelPublish: string;
  labelUnpublish: string;
  labelEdit: string;
  labelDelete: string;
}

export function MobileChangelogCard({
  entry,
  onTogglePublish,
  onEdit,
  onDelete,
  labelPublished,
  labelDraft,
  labelPublish,
  labelUnpublish,
  labelEdit,
  labelDelete,
}: MobileChangelogCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tone = TONE_CONFIG[entry.tone] || TONE_CONFIG.blue;

  return (
    <div
      className={cn(
        'relative rounded-[20px] border border-[#E9EDF3] bg-white p-4 w-full min-w-0',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)]',
        'dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      {/* Row 1: Title + Status badge */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <h4 className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 truncate min-w-0">
          {entry.title}
        </h4>
        <AdminBadge
          tone={entry.is_published ? 'success' : 'neutral'}
          className="shrink-0 text-[11px] leading-[22px]"
        >
          {entry.is_published ? labelPublished : labelDraft}
        </AdminBadge>
      </div>

      {/* Row 2: Version + Tone dot + More button */}
      <div className="flex items-center gap-2.5 mt-2 min-w-0">
        <span className="text-[13px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          {entry.version}
        </span>
        <span className="text-slate-300 dark:text-slate-600 shrink-0">·</span>
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${tone.class}`}
          title={tone.label}
        />

        {/* More button */}
        <div className="relative ml-auto shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
            className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] text-slate-400 hover:bg-slate-50 active:bg-[#EEF4FF] active:text-[#3272FF] dark:hover:bg-slate-800 dark:active:bg-blue-950/35 transition-colors duration-150"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div
                className="absolute right-0 top-full mt-1 z-40 w-40 rounded-[14px] border border-[#E9EDF3] bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                <CMenuItem
                  icon={entry.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  label={entry.is_published ? labelUnpublish : labelPublish}
                  onClick={() => { setMenuOpen(false); onTogglePublish(entry); }}
                  tone="success"
                />
                <CMenuItem
                  icon={<Edit3 size={15} />}
                  label={labelEdit}
                  onClick={() => { setMenuOpen(false); onEdit(entry); }}
                />
                <div className="my-1 border-t border-[#F1F5F9] dark:border-slate-800" />
                <CMenuItem
                  icon={<Trash2 size={15} />}
                  label={labelDelete}
                  onClick={() => { setMenuOpen(false); onDelete(entry); }}
                  danger
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Summary (if exists) */}
      {entry.summary && (
        <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 leading-[1.45] line-clamp-2">
          {entry.summary}
        </p>
      )}

      {/* Row 4: Created + Sort */}
      <div className="mt-3 pt-3 border-t border-[#F1F5F9] dark:border-slate-800">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">创建时间</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate font-mono text-xs">
              {entry.created_at}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">排序</p>
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {entry.sort_order}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CMenuItem({
  icon, label, onClick, danger, tone,
}: {
  icon: React.ReactNode; label: string; onClick: () => void;
  danger?: boolean; tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition-colors',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/35'
          : tone === 'success'
            ? 'text-slate-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950/30'
            : 'text-slate-600 hover:bg-[#F5F7FB] dark:text-slate-300 dark:hover:bg-slate-800',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
