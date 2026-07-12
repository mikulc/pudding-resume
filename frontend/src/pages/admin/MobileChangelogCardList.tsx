import { FileText } from 'lucide-react';
import type { ChangelogEntryItem } from '../../types/admin';
import { MobileChangelogCard } from './MobileChangelogCard';

interface MobileChangelogCardListProps {
  entries: ChangelogEntryItem[];
  onTogglePublish: (entry: ChangelogEntryItem) => void;
  onEdit: (entry: ChangelogEntryItem) => void;
  onDelete: (entry: ChangelogEntryItem) => void;
  labelPublished: string;
  labelDraft: string;
  labelPublish: string;
  labelUnpublish: string;
  labelEdit: string;
  labelDelete: string;
  labelEmpty: string;
}

export function MobileChangelogCardList({
  entries, onTogglePublish, onEdit, onDelete,
  labelPublished, labelDraft, labelPublish, labelUnpublish,
  labelEdit, labelDelete, labelEmpty,
}: MobileChangelogCardListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F7FB] dark:bg-slate-800 mb-4">
          <FileText size={28} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400">{labelEmpty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {entries.map(e => (
        <MobileChangelogCard
          key={e.id}
          entry={e}
          onTogglePublish={onTogglePublish}
          onEdit={onEdit}
          onDelete={onDelete}
          labelPublished={labelPublished}
          labelDraft={labelDraft}
          labelPublish={labelPublish}
          labelUnpublish={labelUnpublish}
          labelEdit={labelEdit}
          labelDelete={labelDelete}
        />
      ))}
    </div>
  );
}
