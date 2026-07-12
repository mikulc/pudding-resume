import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmModal';
import {
  fetchUsers, fetchUserDetail, updateUserQuota, updateUserRole,
  deleteUser, forceLogoutUser, resetUserPassword,
} from '../../api/admin';
import type { AdminUserItem, AdminUserDetail } from '../../types/admin';
import { Search, X } from 'lucide-react';
import {
  AdminBadge, AdminButton, AdminInput, AdminModal,
  AdminPage, AdminPageHeader, AdminSelect,
} from './adminStyles';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DesktopUserTable } from './DesktopUserTable';
import { MobileUserCardList } from './MobileUserCardList';
import { UserDetailDrawer } from './UserDetailDrawer';

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
  const [roleFilter, setRoleFilter] = useState('all');
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [quotaModal, setQuotaModal] = useState<{ id: string; username: string } | null>(null);
  const [quotaForm, setQuotaForm] = useState({ max_resumes: '', export_count: '', daily_limit: '', monthly_limit: '' });
  const [passwordModal, setPasswordModal] = useState<{ id: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const load = useCallback(async () => {
    try {
      const res = await fetchUsers({ page, size: pageSize, search: search || undefined, role: roleFilter });
      setUsers(res.users);
      setTotal(res.total);
    } catch { /* ignore */ }
  }, [page, search, roleFilter]);

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
      setDetailUser(null);
    } catch (e: any) {
      showToast(e.message || t('users.toast.deleteFailed'), 'error');
    }
  };

  const handleRoleChange = async (id: string, username: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const roleLabel = newRole === 'admin' ? t('users.roleAdmin') : t('users.roleUser');
    const ok = await confirm({
      title: t('users.confirm.roleTitle'),
      message: t('users.confirm.roleMessage', { username, role: roleLabel }),
      confirmText: t('users.confirm.roleConfirm'),
    });
    if (!ok) return;
    try {
      await updateUserRole(id, newRole);
      showToast(t('users.toast.roleUpdated'), 'success');
      load();
    } catch (e: any) {
      showToast(e.message || t('users.toast.roleFailed'), 'error');
    }
  };

  const handleForceLogout = async (id: string, username: string) => {
    const ok = await confirm({
      title: t('users.confirm.logoutTitle'),
      message: t('users.confirm.logoutMessage', { username }),
      confirmText: t('users.confirm.logoutConfirm'),
      confirmVariant: 'danger',
    });
    if (!ok) return;
    try {
      await forceLogoutUser(id);
      showToast(t('users.toast.forceLogout'), 'success');
    } catch (e: any) {
      showToast(e.message || t('users.toast.forceLogoutFailed'), 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchUserDetail(id);
      setDetailUser(d);
    } catch (e: any) {
      showToast(e.message || t('users.toast.detailFailed'), 'error');
    }
  };

  // Mobile: open detail from card tap
  const handleMobileOpenDetail = async (user: AdminUserItem) => {
    await openDetail(user.id);
  };

  // Mobile: action handler from card menu
  const handleMobileAction = (action: string, user: AdminUserItem) => {
    switch (action) {
      case 'detail':
        openDetail(user.id);
        break;
      case 'role':
        handleRoleChange(user.id, user.username, user.role);
        break;
      case 'quota':
        openQuotaModal(user);
        break;
      case 'password':
        setNewPassword('');
        setPasswordModal({ id: user.id, username: user.username });
        break;
      case 'logout':
        handleForceLogout(user.id, user.username);
        break;
      case 'delete':
        if (user.status !== 'deleted') {
          handleDelete(user.id, user.username);
        }
        break;
    }
  };

  const openQuotaModal = async (user: AdminUserItem) => {
    try {
      const d = await fetchUserDetail(user.id);
      setQuotaForm({
        max_resumes: String(d.max_resumes),
        export_count: String(d.export_count),
        daily_limit: String(d.daily_limit_tokens),
        monthly_limit: String(d.monthly_limit_tokens),
      });
      setQuotaModal({ id: user.id, username: user.username });
    } catch { /* fallback */ }
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
    } catch (e: any) {
      showToast(e.message || t('users.toast.quotaFailed'), 'error');
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
    } catch (e: any) {
      showToast(e.message || t('users.toast.passwordFailed'), 'error');
    }
  };

  const hasFilter = search !== '' || roleFilter !== 'all';

  // ---- i18n helpers ----
  const labelUser = t('users.table.user');
  const labelEmail = t('users.table.email');
  const labelRole = t('users.table.role');
  const labelResumes = t('users.table.resumes');
  const labelRegistered = t('users.table.registeredAt');
  const labelLastLogin = t('users.table.lastLogin');
  const labelActions = t('users.table.actions');
  const labelDeleted = t('users.deleted');
  const labelPagination = (opts: { page: number; totalPages: number; total: number }) =>
    t('users.pagination', opts);
  const labelEmpty = t('users.empty');

  return (
    <AdminPage>
      {/* ---- Page Header ---- */}
      <AdminPageHeader
        title={t('users.title')}
        description={isMobile ? undefined : t('users.subtitle')}
        meta={<AdminBadge tone="brand">{t('users.userCount', { count: total })}</AdminBadge>}
      />

      {/* Mobile subtitle */}
      {isMobile && (
        <p className="text-[14px] text-slate-500 dark:text-slate-400 -mt-3 mb-0">
          {t('users.subtitle')}
        </p>
      )}

      {/* ---- Toolbar ---- */}
      {isMobile ? (
        /* ---- Mobile Toolbar: 2-row layout ---- */
        <div className="space-y-3" style={{ marginTop: isMobile ? '20px' : undefined }}>
          {/* Row 1: Search */}
          <div className="relative">
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

          {/* Row 2: Role filter */}
          <div className="flex items-center gap-3">
            <AdminSelect
              value={roleFilter}
              onChange={value => { setRoleFilter(value); setPage(1); }}
              options={[
                { value: 'all', label: t('users.roleAll') },
                { value: 'user', label: t('users.roleUser') },
                { value: 'admin', label: t('users.roleAdmin') },
              ]}
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        /* ---- Desktop Toolbar ---- */
        <div className="flex flex-wrap items-center gap-3">
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
          <AdminSelect
            value={roleFilter}
            onChange={value => { setRoleFilter(value); setPage(1); }}
            options={[
              { value: 'all', label: t('users.roleAll') },
              { value: 'user', label: t('users.roleUser') },
              { value: 'admin', label: t('users.roleAdmin') },
            ]}
          />
        </div>
      )}

      {/* ---- User List ---- */}
      {isMobile ? (
        <MobileUserCardList
          users={users}
          loading={false}
          hasFilter={hasFilter}
          onOpenDetail={handleMobileOpenDetail}
          onAction={handleMobileAction}
          onClearFilter={() => { setSearch(''); setRoleFilter('all'); }}
          emptyText={labelEmpty}
          noResultText="没有匹配的用户"
          clearFilterText="清除筛选"
        />
      ) : (
        <DesktopUserTable
          users={users}
          total={total}
          page={page}
          totalPages={totalPages}
          onSetPage={handlePageChange}
          onOpenDetail={openDetail}
          onOpenQuota={openQuotaModal}
          onRoleChange={handleRoleChange}
          onForceLogout={handleForceLogout}
          onResetPassword={(id, username) => { setPasswordModal({ id, username }); setNewPassword(''); }}
          onDelete={handleDelete}
          labelUser={labelUser}
          labelEmail={labelEmail}
          labelRole={labelRole}
          labelResumes={labelResumes}
          labelRegistered={labelRegistered}
          labelLastLogin={labelLastLogin}
          labelActions={labelActions}
          labelDeleted={labelDeleted}
          labelPagination={labelPagination}
          labelEmpty={labelEmpty}
          tooltipDetail={t('users.tooltip.detail')}
          tooltipQuota={t('users.tooltip.quota')}
          tooltipRole={t('users.tooltip.role')}
          tooltipLogout={t('users.tooltip.forceLogout')}
          tooltipPassword={t('users.tooltip.resetPassword')}
          tooltipDelete={t('users.tooltip.delete')}
        />
      )}

      {/* ---- User Detail: Modal (desktop) / Drawer (mobile) ---- */}
      {isMobile ? (
        <UserDetailDrawer
          open={detailUser !== null}
          user={detailUser}
          onClose={() => setDetailUser(null)}
          t={t}
        />
      ) : (
        <AdminModal
          open={detailUser !== null}
          onClose={() => setDetailUser(null)}
          className="max-w-[480px] max-h-[85vh]"
        >
          {detailUser && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {t('users.detail.title')}
                </h3>
                <button
                  onClick={() => setDetailUser(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  {detailUser.avatar ? (
                    <img
                      src={detailUser.avatar}
                      className="w-12 h-12 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                      {detailUser.username.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {detailUser.username}
                    </p>
                    <p className="text-slate-500">{detailUser.email}</p>
                  </div>
                </div>
                <hr className="dark:border-slate-800" />
                <InfoRow label={t('users.detail.id')} value={detailUser.id} />
                <InfoRow label={t('users.detail.role')} value={detailUser.role} />
                <InfoRow
                  label={t('users.detail.status')}
                  value={
                    detailUser.status === 'active'
                      ? t('users.detail.statusActive')
                      : t('users.detail.statusDeleted')
                  }
                />
                <InfoRow
                  label={t('users.detail.registeredAt')}
                  value={detailUser.created_at}
                />
                <InfoRow
                  label={t('users.detail.lastLogin')}
                  value={detailUser.last_login_at || '-'}
                />
                <InfoRow
                  label={t('users.detail.lastActive')}
                  value={detailUser.last_active_at || '-'}
                />
                <InfoRow
                  label={t('users.detail.resumeCount')}
                  value={`${detailUser.resume_count} / ${detailUser.max_resumes}`}
                />
                <InfoRow
                  label={t('users.detail.totalResumes')}
                  value={String(detailUser.total_resumes_created)}
                />
                <InfoRow
                  label={t('users.detail.exportQuota')}
                  value={`${detailUser.export_count}`}
                />
                <InfoRow
                  label={t('users.detail.totalExports')}
                  value={String(detailUser.total_exports)}
                />
                <InfoRow
                  label={t('users.detail.editingTime')}
                  value={`${Math.floor(detailUser.total_editing_seconds / 3600)}h ${Math.floor((detailUser.total_editing_seconds % 3600) / 60)}m`}
                />
                <InfoRow
                  label={t('users.detail.dailyTokenLimit')}
                  value={
                    detailUser.daily_limit_tokens
                      ? detailUser.daily_limit_tokens.toLocaleString()
                      : t('users.notLimited')
                  }
                />
                <InfoRow
                  label={t('users.detail.monthlyTokenLimit')}
                  value={
                    detailUser.monthly_limit_tokens
                      ? detailUser.monthly_limit_tokens.toLocaleString()
                      : t('users.notLimited')
                  }
                />
              </div>
            </>
          )}
        </AdminModal>
      )}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-mono text-xs max-w-[250px] truncate">
        {value}
      </span>
    </div>
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
