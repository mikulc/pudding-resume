import {
  SlidersHorizontal,
  Key, Trash2, RotateCcw,
} from 'lucide-react';
import type { AdminUserItem } from '../../types/admin';
import {
  AdminBadge, AdminIconButton, AdminTableCard,
  adminTableHeadClass, adminTableRowClass,
} from './adminStyles';

interface DesktopUserTableProps {
  users: AdminUserItem[];
  onOpenQuota: (user: AdminUserItem) => void;
  onResetPassword: (id: string, username: string) => void;
  onDelete: (id: string, username: string) => void;
  onRestore: (id: string, username: string) => void;
  onPermanentDelete: (id: string, username: string) => void;
  labelUser: string;
  labelEmail: string;
  labelRole: string;
  labelResumes: string;
  labelRegistered: string;
  labelLastLogin: string;
  labelActions: string;
  labelDeleted: string;
  labelEmpty: string;
  actionLabelQuota: string;
  actionLabelPassword: string;
  actionLabelDelete: string;
  actionLabelRestore: string;
  actionLabelPermanentDelete: string;
}

export function DesktopUserTable({
  users,
  onOpenQuota,
  onResetPassword, onDelete, onRestore, onPermanentDelete,
  labelUser, labelEmail, labelRole, labelResumes,
  labelRegistered, labelLastLogin, labelActions,
  labelDeleted, labelEmpty,
  actionLabelQuota,
  actionLabelPassword, actionLabelDelete, actionLabelRestore, actionLabelPermanentDelete,
}: DesktopUserTableProps) {
  return (
    <AdminTableCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">{labelUser}</th>
              <th className="px-4 py-3 text-left font-medium max-w-[200px]">{labelEmail}</th>
              <th className="px-4 py-3 text-left font-medium">{labelRole}</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{labelResumes}</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{labelRegistered}</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{labelLastLogin}</th>
              <th className="px-4 py-3 text-right font-medium">{labelActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map(u => (
              <tr
                key={u.id}
                className={`${adminTableRowClass} ${u.status === 'deleted' ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {u.avatar ? (
                      <img src={u.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-500">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-slate-800 dark:text-slate-200">{u.username}</span>
                    {u.status === 'deleted' && <AdminBadge tone="danger">{labelDeleted}</AdminBadge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={u.email}>
                  {u.email}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={u.role === 'admin' ? 'brand' : 'neutral'}>
                    {u.role === 'admin' ? '管理员' : '普通用户'}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                  {u.resume_count}/{u.max_resumes}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                  {u.created_at}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                  {u.last_login_at || '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {u.status !== 'deleted' ? (
                      <>
                        <AdminIconButton tone="brand" onClick={() => onOpenQuota(u)} aria-label={actionLabelQuota}>
                          <SlidersHorizontal size={15} />
                        </AdminIconButton>
                        <AdminIconButton tone="brand" onClick={() => onResetPassword(u.id, u.username)} aria-label={actionLabelPassword}>
                          <Key size={15} />
                        </AdminIconButton>
                        <AdminIconButton tone="danger" onClick={() => onDelete(u.id, u.username)} aria-label={actionLabelDelete}>
                          <Trash2 size={15} />
                        </AdminIconButton>
                      </>
                    ) : (
                      <>
                        <AdminIconButton tone="success" onClick={() => onRestore(u.id, u.username)} aria-label={actionLabelRestore}>
                          <RotateCcw size={15} />
                        </AdminIconButton>
                        <AdminIconButton tone="danger" onClick={() => onPermanentDelete(u.id, u.username)} aria-label={actionLabelPermanentDelete}>
                          <Trash2 size={15} />
                        </AdminIconButton>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
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
