import { Eye, EyeOff, Edit3, Trash2 } from 'lucide-react';
import type { ChangelogEntryItem } from '../../types/admin';
import {
  AdminBadge, AdminIconButton, AdminTableCard,
  adminTableHeadClass, adminTableRowClass,
} from './adminStyles';

const TONE_VALUES = [
  { value: 'blue',    class: 'bg-blue-500' },
  { value: 'emerald', class: 'bg-emerald-500' },
  { value: 'amber',   class: 'bg-amber-500' },
];

interface DesktopChangelogTableProps {
  entries: ChangelogEntryItem[];
  onTogglePublish: (entry: ChangelogEntryItem) => void;
  onEdit: (entry: ChangelogEntryItem) => void;
  onDelete: (entry: ChangelogEntryItem) => void;
  labelVersion: string;
  labelTitle: string;
  labelTone: string;
  labelStatus: string;
  labelSort: string;
  labelCreatedAt: string;
  labelActions: string;
  labelPublished: string;
  labelDraft: string;
  labelPublish: string;
  labelUnpublish: string;
  labelEdit: string;
  labelDelete: string;
  labelEmpty: string;
}

export function DesktopChangelogTable({
  entries, onTogglePublish, onEdit, onDelete,
  labelVersion, labelTitle, labelTone, labelStatus, labelSort,
  labelCreatedAt, labelActions, labelPublished, labelDraft,
  labelPublish, labelUnpublish, labelEdit, labelDelete, labelEmpty,
}: DesktopChangelogTableProps) {
  return (
    <AdminTableCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">{labelVersion}</th>
              <th className="px-4 py-3 text-left font-medium">{labelTitle}</th>
              <th className="px-4 py-3 text-left font-medium">{labelTone}</th>
              <th className="px-4 py-3 text-left font-medium">{labelStatus}</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{labelSort}</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{labelCreatedAt}</th>
              <th className="px-4 py-3 text-right font-medium">{labelActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map(e => (
              <tr key={e.id} className={adminTableRowClass}>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{e.version}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{e.title}</p>
                    {e.summary && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{e.summary}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${TONE_VALUES.find(t => t.value === e.tone)?.class || 'bg-blue-500'}`} />
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={e.is_published ? 'success' : 'neutral'}>
                    {e.is_published ? labelPublished : labelDraft}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{e.sort_order}</td>
                <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">{e.created_at}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <AdminIconButton
                      tone="success"
                      onClick={() => onTogglePublish(e)}
                      title={e.is_published ? labelUnpublish : labelPublish}
                    >
                      {e.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                    </AdminIconButton>
                    <AdminIconButton tone="brand" onClick={() => onEdit(e)} title={labelEdit}>
                      <Edit3 size={15} />
                    </AdminIconButton>
                    <AdminIconButton tone="danger" onClick={() => onDelete(e)} title={labelDelete}>
                      <Trash2 size={15} />
                    </AdminIconButton>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {labelEmpty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminTableCard>
  );
}
