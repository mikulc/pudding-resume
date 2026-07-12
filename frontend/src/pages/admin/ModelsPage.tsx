import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmModal';
import {
  fetchModelPools, createModelPool, updateModelPool, deleteModelPool,
} from '../../api/admin';
import type { AdminModelPoolItem } from '../../types/admin';
import { Plus, Edit3, Trash2, Power, PowerOff, X } from 'lucide-react';
import { AdminBadge, AdminButton, AdminCard, AdminInput, AdminModal, AdminPage, AdminPageHeader } from './adminStyles';

export default function ModelsPage() {
  const { isLoggedIn, role } = useAuth();
  const { t } = useTranslation('admin');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [models, setModels] = useState<AdminModelPoolItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminModelPoolItem | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', api_url: '', api_key: '', model: '', sort_order: 0, is_active: true });

  const load = async () => {
    try {
      const res = await fetchModelPools();
      setModels(res.models);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isLoggedIn && role === 'admin') load();
  }, [isLoggedIn, role]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', api_url: '', api_key: '', model: '', sort_order: 0, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (m: AdminModelPoolItem) => {
    setEditing(m);
    setForm({ name: m.name, api_url: m.api_url, api_key: '', model: m.model, sort_order: m.sort_order, is_active: m.is_active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.api_url || !form.api_key || !form.model) {
      showToast(t('models.toast.fillRequired'), 'error');
      return;
    }
    try {
      if (editing) {
        const data: any = { name: form.name, api_url: form.api_url, model: form.model, sort_order: form.sort_order, is_active: form.is_active };
        if (form.api_key) data.api_key = form.api_key;
        await updateModelPool(editing.id, data);
        showToast(t('models.toast.updated'), 'success');
      } else {
        await createModelPool(form);
        showToast(t('models.toast.created'), 'success');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      showToast(e.message || t('models.toast.failed'), 'error');
    }
  };

  const handleDelete = async (m: AdminModelPoolItem) => {
    if (m.user_count > 0) {
      showToast(t('models.toast.inUse', { count: m.user_count }), 'error');
      return;
    }
    const ok = await confirm({
      title: t('models.toast.deleteConfirmTitle'),
      message: t('models.toast.deleteConfirmMessage', { name: m.name }),
      confirmText: t('models.toast.deleteConfirm'),
      confirmVariant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteModelPool(m.id);
      showToast(t('models.toast.deleted'), 'success');
      load();
    } catch (e: any) {
      showToast(e.message || t('models.toast.deleteFailed'), 'error');
    }
  };

  const toggleActive = async (m: AdminModelPoolItem) => {
    try {
      await updateModelPool(m.id, { is_active: !m.is_active });
      showToast(m.is_active ? t('models.toast.disabled') : t('models.toast.enabled'), 'success');
      load();
    } catch (e: any) {
      showToast(e.message || t('models.toast.toggleFailed'), 'error');
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader title={t('models.title')} description={t('models.subtitle')} actions={<>
        <AdminButton variant="primary" onClick={openCreate}><Plus size={16} /> {t('models.addModel')}</AdminButton>
      </>} />

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map(m => (
          <AdminCard key={m.id} className={`p-5 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)] ${!m.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">{m.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{m.model}</p>
              </div>
              <AdminBadge tone={m.is_active ? 'success' : 'danger'}>
                {m.is_active ? t('models.active') : t('models.disabled')}
              </AdminBadge>
            </div>

            <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <p className="truncate">{t('models.api')}: {m.api_url}</p>
              <p>{t('models.balance')}: <span className={`font-mono font-medium ${m.balance < 1 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>¥{m.balance.toFixed(2)}</span></p>
              <p className="text-xs">{m.balance_updated_at ? t('models.balanceRefreshedAt', { time: m.balance_updated_at }) : t('models.balanceNotRefreshed')}</p>
              <p className="text-xs">{t('models.sortOrder')}: {m.sort_order} · {t('models.userCount')}: {m.user_count}</p>
              <p className="text-xs text-gray-400">{t('models.createdAt', { time: m.created_at })}</p>
            </div>

            <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => openEdit(m)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Edit3 size={13} /> {t('models.edit')}
              </button>
              <button onClick={() => toggleActive(m)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors">
                {m.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                {m.is_active ? t('models.toggleDisable') : t('models.toggleEnable')}
              </button>
              <button onClick={() => handleDelete(m)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ml-auto">
                <Trash2 size={13} /> {t('models.delete')}
              </button>
            </div>
          </AdminCard>
        ))}
        {models.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            {t('models.empty')}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} className="max-w-[520px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editing ? t('models.modal.edit') : t('models.modal.create')}</h3>
          <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <ModelField label={t('models.fields.name')} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder={t('models.fields.namePlaceholder')} />
          <ModelField label={t('models.fields.apiUrl')} value={form.api_url} onChange={v => setForm(p => ({ ...p, api_url: v }))} placeholder={t('models.fields.apiUrlPlaceholder')} />
          <ModelField label={t('models.fields.apiKey')} value={form.api_key} onChange={v => setForm(p => ({ ...p, api_key: v }))} placeholder={editing ? t('models.fields.apiKeyPlaceholderEdit') : t('models.fields.apiKeyPlaceholderCreate')} />
          <ModelField label={t('models.fields.model')} value={form.model} onChange={v => setForm(p => ({ ...p, model: v }))} placeholder={t('models.fields.modelPlaceholder')} />
          <ModelField label={t('models.fields.sortOrder')} value={String(form.sort_order)} onChange={v => setForm(p => ({ ...p, sort_order: Number(v) || 0 }))} placeholder="0" type="number" />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#3272FF] focus:ring-[#3272FF]/20" />
            {t('models.fields.enable')}
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <AdminButton onClick={() => setModalOpen(false)}>{t('models.modal.cancel')}</AdminButton>
          <AdminButton variant="primary" onClick={handleSave}>{editing ? t('models.modal.save') : t('models.modal.createSave')}</AdminButton>
        </div>
      </AdminModal>
    </AdminPage>
  );
}

function ModelField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
      <AdminInput
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}
