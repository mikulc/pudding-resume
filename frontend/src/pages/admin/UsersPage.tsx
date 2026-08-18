import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmModal';
import {
  fetchUsers, updateUserQuota,
  deleteUser, resetUserPassword, restoreUser, permanentlyDeleteUser,
} from '../../api/admin';
import type { AdminUserItem } from '../../types/admin';
import { Search, X } from 'lucide-react';
import {
  AdminBadge, AdminButton, AdminInput, AdminModal,
  AdminPage,
} from './adminStyles';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DesktopUserTable } from './DesktopUserTable';
import { MobileUserCardList } from './MobileUserCardList';
import { getErrorMessage } from '../../utils/errors';
import { AppPagination } from '../../components/common/AppPagination';

export default function UsersPage() {
  const { isLoggedIn, role } = useAuth();
  const { t } = useTranslation('admin');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const isMobile = useMediaQuery('(max-width: 767px)');

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [quotaModal, setQuotaModal] = useState<{ id: string; username: string } | null>(null);
  const [quotaForm, setQuotaForm] = useState({ max_resumes: '', export_count: '', daily_limit: '', monthly_limit: '' });
  const [passwordModal, setPasswordModal] = useState<{ id: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const load = useCallback(async () => {
    try {
      const res = await fetchUsers({ page, size: pageSize, search: search || undefined });
      setUsers(res.users);
      setTotal(res.total);
    } catch { /* ignore */ }
  }, [page, search]);

  useEffect(() => {
    if (isLoggedIn && role === 'admin') load();
  }, [isLoggedIn, role, load]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  // ---- User operations ----
  const handleDelete = async (id: string, username: string) => {
    const ok = await confirm({
      title: t('users.confirm.deleteTitle'),
      message: t('users.confirm.deleteMessage', { username }),
      confirmText: t('users.confirm.deleteConfirm'),
      confirmVariant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteUser(id);
      showToast(t('users.toast.deleted'), 'success');
      load();
    } catch (e: unknown) {
      showToast(getErrorMessage(e, t('users.toast.deleteFailed')), 'error');
    }
  };

  const handleRestore = async (id: string, username: string) => {
    const ok = await confirm({
      title: t('users.confirm.restoreTitle'),
      message: t('users.confirm.restoreMessage', { username }),
      confirmText: t('users.confirm.restoreConfirm'),
    });
    if (!ok) return;
    try {
      await restoreUser(id);
      showToast(t('users.toast.restored'), 'success');
      load();
    } catch (e: unknown) {
      showToast(getErrorMessage(e, t('users.toast.restoreFailed')), 'error');
    }
  };

  const handlePermanentDelete = async (id: string, username: string) => {
    const ok = await confirm({
      title: t('users.confirm.permanentDeleteTitle'),
      message: t('users.confirm.permanentDeleteMessage', { username }),
      confirmText: t('users.confirm.permanentDeleteConfirm'),
      confirmVariant: 'danger',
    });
    if (!ok) return;
    try {
      await permanentlyDeleteUser(id);
      showToast(t('users.toast.permanentlyDeleted'), 'success');
      load();
    } catch (e: unknown) {
      showToast(getErrorMessage(e, t('users.toast.permanentDeleteFailed')), 'error');
    }
  };

  // Mobile: action handler from card menu
  const handleMobileAction = (action: string, user: AdminUserItem) => {
    switch (action) {
      case 'quota':
        openQuotaModal(user);
        break;
      case 'password':
        setNewPassword('');
        setPasswordModal({ id: user.id, username: user.username });
        break;
      case 'delete':
        if (user.status !== 'deleted') {
          handleDelete(user.id, user.username);
        }
        break;
      case 'restore':
        handleRestore(user.id, user.username);
        break;
      case 'permanent-delete':
        handlePermanentDelete(user.id, user.username);
        break;
    }
  };

  const openQuotaModal = (user: AdminUserItem) => {
    setQuotaForm({
      max_resumes: String(user.max_resumes),
      export_count: String(user.export_count),
      daily_limit: String(user.daily_limit_tokens),
      monthly_limit: String(user.monthly_limit_tokens),
    });
    setQuotaModal({ id: user.id, username: user.username });
  };

  const handleQuotaSave = async () => {
    if (!quotaModal) return;
    try {
      await updateUserQuota(quotaModal.id, {
        max_resumes: Number(quotaForm.max_resumes) || undefined,
        export_count: Number(quotaForm.export_count) || undefined,
        daily_limit_tokens: Number(quotaForm.daily_limit) || undefined,
        monthly_limit_tokens: Number(quotaForm.monthly_limit) || undefined,
      });
      showToast(t('users.toast.quotaUpdated'), 'success');
      setQuotaModal(null);
      load();
    } catch (e: unknown) {
      showToast(getErrorMessage(e, t('users.toast.quotaFailed')), 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!passwordModal || newPassword.length < 6) {
      showToast(t('users.toast.passwordTooShort'), 'error');
      return;
    }
    try {
      await resetUserPassword(passwordModal.id, newPassword);
      showToast(t('users.toast.passwordReset'), 'success');
      setPasswordModal(null);
      setNewPassword('');
    } catch (e: unknown) {
      showToast(getErrorMessage(e, t('users.toast.passwordFailed')), 'error');
    }
  };

  const hasFilter = search !== '';

  // ---- i18n helpers ----
  const labelUser = t('users.table.user');
  const labelEmail = t('users.table.email');
  const labelRole = t('users.table.role');
  const labelResumes = t('users.table.resumes');
  const labelRegistered = t('users.table.registeredAt');
  const labelLastLogin = t('users.table.lastLogin');
  const labelActions = t('users.table.actions');
  const labelDeleted = t('users.deleted');
  const labelEmpty = t('users.empty');

  return (
    <AdminPage>
      {/* ---- Toolbar ---- */}
      {isMobile ? (
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <AdminInput
              type="text"
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-9 h-[44px]"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={14} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <AdminBadge tone="brand" className="shrink-0">
            {t('users.userCount', { count: total })}
          </AdminBadge>
        </div>
      ) : (
        /* ---- Desktop Toolbar ---- */
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <AdminInput
              type="text"
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={14} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <AdminBadge tone="brand">{t('users.userCount', { count: total })}</AdminBadge>
        </div>
      )}

      {/* ---- User List ---- */}
      {isMobile ? (
        <MobileUserCardList
          users={users}
          loading={false}
          hasFilter={hasFilter}
          onAction={handleMobileAction}
          onClearFilter={() => setSearch('')}
          emptyText={labelEmpty}
          noResultText="没有匹配的用户"
          clearFilterText="清除筛选"
        />
      ) : (
        <DesktopUserTable
          users={users}
          onOpenQuota={openQuotaModal}
          onResetPassword={(id, username) => { setPasswordModal({ id, username }); setNewPassword(''); }}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          labelUser={labelUser}
          labelEmail={labelEmail}
          labelRole={labelRole}
          labelResumes={labelResumes}
          labelRegistered={labelRegistered}
          labelLastLogin={labelLastLogin}
          labelActions={labelActions}
          labelDeleted={labelDeleted}
          labelEmpty={labelEmpty}
          actionLabelQuota={t('users.actionLabels.quota')}
          actionLabelPassword={t('users.actionLabels.resetPassword')}
          actionLabelDelete={t('users.actionLabels.delete')}
          actionLabelRestore={t('users.actionLabels.restore')}
          actionLabelPermanentDelete={t('users.actionLabels.permanentDelete')}
        />
      )}

      <AppPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        previousLabel={t('users.pagination.previous')}
        nextLabel={t('users.pagination.next')}
        jumpLabel={t('users.pagination.label')}
        pageLabel={(targetPage) => t('users.pagination.pageAria', { page: targetPage })}
      />

      {/* ---- Quota Modal ---- */}
      <AdminModal
        open={quotaModal !== null}
        onClose={() => setQuotaModal(null)}
        className="max-w-[420px]"
      >
        {quotaModal && (
          <>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              {t('users.quota.title', { username: quotaModal.username })}
            </h3>
            <div className="space-y-3">
              <QuotaField
                label={t('users.quota.maxResumes')}
                value={quotaForm.max_resumes}
                onChange={v => setQuotaForm(p => ({ ...p, max_resumes: v }))}
              />
              <QuotaField
                label={t('users.quota.exportCount')}
                value={quotaForm.export_count}
                onChange={v => setQuotaForm(p => ({ ...p, export_count: v }))}
              />
              <QuotaField
                label={t('users.quota.dailyLimit')}
                value={quotaForm.daily_limit}
                onChange={v => setQuotaForm(p => ({ ...p, daily_limit: v }))}
              />
              <QuotaField
                label={t('users.quota.monthlyLimit')}
                value={quotaForm.monthly_limit}
                onChange={v => setQuotaForm(p => ({ ...p, monthly_limit: v }))}
              />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <AdminButton onClick={() => setQuotaModal(null)}>
                {t('users.quota.cancel')}
              </AdminButton>
              <AdminButton variant="primary" onClick={handleQuotaSave}>
                {t('users.quota.save')}
              </AdminButton>
            </div>
          </>
        )}
      </AdminModal>

      {/* ---- Password Reset Modal ---- */}
      <AdminModal
        open={passwordModal !== null}
        onClose={() => setPasswordModal(null)}
        className="max-w-[420px]"
      >
        {passwordModal && (
          <>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              {t('users.password.title', { username: passwordModal.username })}
            </h3>
            <AdminInput
              type="text"
              placeholder={t('users.password.placeholder')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1.5">{t('users.password.hint')}</p>
            <div className="flex justify-end gap-3 mt-4">
              <AdminButton onClick={() => setPasswordModal(null)}>
                {t('users.password.cancel')}
              </AdminButton>
              <AdminButton variant="primary" onClick={handleResetPassword}>
                {t('users.password.reset')}
              </AdminButton>
            </div>
          </>
        )}
      </AdminModal>
    </AdminPage>
  );
}

function QuotaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
        {label}
      </label>
      <AdminInput
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
}
