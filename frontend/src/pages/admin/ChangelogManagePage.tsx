import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmModal';
import {
  fetchChangelogs, createChangelog, updateChangelog, deleteChangelog,
} from '../../api/admin';
import type { ChangelogEntryItem } from '../../types/admin';
import { Plus, X, GripVertical, Loader2 } from 'lucide-react';
import {
  AdminButton, AdminDatePicker,
  AdminInput, AdminPage, AdminPageHeader,
  AdminSwitch,
  AdminFormModal, AdminFormModalHeader, AdminFormModalBody, AdminFormModalFooter,
  AdminBottomSheet,
} from './adminStyles';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DesktopChangelogTable } from './DesktopChangelogTable';
import { MobileChangelogCardList } from './MobileChangelogCardList';

const TONE_VALUES = [
  { value: 'blue',    class: 'bg-blue-500', label: 'blue' },
  { value: 'emerald', class: 'bg-emerald-500', label: 'emerald' },
  { value: 'amber',   class: 'bg-amber-500', label: 'amber' },
];

export default function ChangelogManagePage() {
  const { isLoggedIn, role } = useAuth();
  const { t } = useTranslation('admin');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const isMobile = useMediaQuery('(max-width: 767px)');
  const isBottomSheet = useMediaQuery('(max-width: 639px)');

  const [entries, setEntries] = useState<ChangelogEntryItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChangelogEntryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form
  const [form, setForm] = useState({
    version: '', date: '', title: '', summary: '', items: [''],
    tone: 'blue', is_published: false, sort_order: 0,
  });

  const load = async () => {
    try {
      const res = await fetchChangelogs();
      setEntries(res.entries);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isLoggedIn && role === 'admin') load();
  }, [isLoggedIn, role]);

  const openCreate = () => {
    setEditing(null);
    setForm({ version: '', date: '', title: '', summary: '', items: [''], tone: 'blue', is_published: false, sort_order: 0 });
    setErrors({});
    setModalOpen(true);
    itemRefs.current = [];
  };

  const openEdit = (e: ChangelogEntryItem) => {
    setEditing(e);
    setForm({
      version: e.version, date: e.date, title: e.title,
      summary: e.summary, items: e.items.length > 0 ? e.items : [''],
      tone: e.tone, is_published: e.is_published, sort_order: e.sort_order,
    });
    setErrors({});
    setModalOpen(true);
    itemRefs.current = [];
  };

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    let valid = true;
    if (!form.version.trim()) { next.version = true; valid = false; }
    if (!form.date.trim()) { next.date = true; valid = false; }
    if (!form.title.trim()) { next.title = true; valid = false; }
    const filledItems = form.items.filter(i => i.trim());
    if (filledItems.length === 0) { next.items = true; valid = false; }
    setErrors(next);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) {
      // Scroll to first error
      setTimeout(() => {
        const first = Object.keys(errors)[0];
        if (first) {
          const el = document.querySelector(`[data-field="${first}"]`);
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 100);
      return;
    }
    const filteredItems = form.items.filter(i => i.trim() !== '');
    setSaving(true);
    try {
      if (editing) {
        await updateChangelog(editing.id, { ...form, items: filteredItems });
        showToast(t('changelog.toast.updated'), 'success');
      } else {
        await createChangelog({ ...form, items: filteredItems });
        showToast(t('changelog.toast.created'), 'success');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      showToast(e.message || t('changelog.toast.failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: ChangelogEntryItem) => {
    const ok = await confirm({
      title: t('changelog.toast.deleteConfirmTitle'),
      message: t('changelog.toast.deleteConfirmMessage', { title: e.title }),
      confirmText: t('changelog.toast.deleteConfirm'),
      confirmVariant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteChangelog(e.id);
      showToast(t('changelog.toast.deleted'), 'success');
      load();
    } catch (err: any) {
      showToast(err.message || t('changelog.toast.deleteFailed'), 'error');
    }
  };

  const togglePublish = async (e: ChangelogEntryItem) => {
    try {
      await updateChangelog(e.id, { is_published: !e.is_published });
      showToast(e.is_published ? t('changelog.toast.unpublished') : t('changelog.toast.published'), 'success');
      load();
    } catch (err: any) {
      showToast(err.message || t('changelog.toast.publishFailed'), 'error');
    }
  };

  const addItem = () => {
    setForm(p => ({ ...p, items: [...p.items, ''] }));
    // Focus new item after render
    setTimeout(() => {
      const idx = form.items.length;
      itemRefs.current[idx]?.focus();
    }, 50);
  };
  const removeItem = (idx: number) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, val: string) => {
    setForm(p => {
      const next = [...p.items];
      next[idx] = val;
      return { ...p, items: next };
    });
  };

  const blurField = (field: string) => {
    if (!errors[field]) return;
    const v = form[field as keyof typeof form];
    if (typeof v === 'string' && v.trim()) {
      setErrors(p => { const n = { ...p }; delete n[field]; return n; });
    }
  };

  // ---- i18n labels ----
  const labelPublished  = t('changelog.published');
  const labelDraft      = t('changelog.draft');
  const labelPublish    = t('changelog.togglePublish');
  const labelUnpublish  = t('changelog.toggleUnpublish');
  const labelEdit       = t('changelog.edit');
  const labelDelete     = t('changelog.delete');
  const labelEmpty      = t('changelog.empty');

  // ---- Form modal content ----
  const modalTitle = editing ? t('changelog.modal.edit') : t('changelog.modal.create');
  const saveLabel = editing ? t('changelog.modal.save') : t('changelog.modal.createSave');

  const formContent = (
    <>
      {/* Section: Basic Info */}
      <div className="mb-[18px]">
        <h4 className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
          {t('changelog.sections.basicInfo')}
        </h4>
        <div className="grid grid-cols-2 gap-3 max-[360px]:grid-cols-1 [&>*]:min-w-0">
          <FieldWrapper label={t('changelog.fields.version')} error={errors.version} errorMessage={t('changelog.validation.versionRequired')} data-field="version">
            <AdminInput
              type="text"
              value={form.version}
              onChange={e => { setForm(p => ({ ...p, version: e.target.value })); }}
              onBlur={() => blurField('version')}
              placeholder={t('changelog.fields.versionPlaceholder')}
              className={cnField(errors.version)}
            />
          </FieldWrapper>
          <FieldWrapper label={t('changelog.fields.date')} error={errors.date} errorMessage={t('changelog.validation.dateRequired')} data-field="date">
            <div className={cn('w-full min-w-0', errors.date && 'rounded-[12px] ring-1 ring-red-300/60')}>
              <AdminDatePicker value={form.date} onChange={v => { setForm(p => ({ ...p, date: v })); if (errors.date) setErrors(p => { const n = { ...p }; delete n.date; return n; }); }} />
            </div>
          </FieldWrapper>
        </div>
        <div className="mt-3">
          <FieldWrapper label={t('changelog.fields.title')} error={errors.title} errorMessage={t('changelog.validation.titleRequired')} data-field="title">
            <AdminInput
              type="text"
              value={form.title}
              onChange={e => { setForm(p => ({ ...p, title: e.target.value })); }}
              onBlur={() => blurField('title')}
              placeholder={t('changelog.fields.titlePlaceholder')}
              className={cnField(errors.title)}
            />
          </FieldWrapper>
        </div>
        <div className="mt-3">
          <FieldWrapper label={t('changelog.fields.summary')} data-field="summary">
            <AdminInput
              type="text"
              value={form.summary}
              onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
              placeholder={t('changelog.fields.summaryPlaceholder')}
            />
          </FieldWrapper>
        </div>
      </div>

      {/* Section: Changes */}
      <div className="mb-[18px]">
        <h4 className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
          {t('changelog.sections.changes')}
        </h4>
        <div className="space-y-2" data-field="items">
          {form.items.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2 rounded-[12px] border px-2 py-1.5 transition-shadow duration-150',
                errors.items && !item.trim()
                  ? 'border-red-300/60 bg-red-50/40 dark:border-red-800/40 dark:bg-red-950/20'
                  : 'border-transparent bg-slate-50/80 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800',
              )}
            >
              <GripVertical size={15} className="shrink-0 text-slate-300 dark:text-slate-600 cursor-grab" />
              <input
                ref={el => { itemRefs.current[idx] = el; }}
                type="text"
                value={item}
                onChange={e => { updateItem(idx, e.target.value); if (errors.items && e.target.value.trim()) setErrors(p => { const n = { ...p }; delete n.items; return n; }); }}
                placeholder={t('changelog.fields.itemPlaceholder', { index: idx + 1 })}
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-[#98A2B3] dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              {idx > 0 || form.items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                  aria-label="Remove item"
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="shrink-0 w-7" />
              )}
            </div>
          ))}
        </div>
        {errors.items && (
          <p className="mt-1.5 text-xs text-red-500">{t('changelog.toast.atLeastOneItem')}</p>
        )}
        <button
          type="button"
          onClick={addItem}
          className="mt-2 inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-[#3272FF] transition-colors hover:bg-[#EEF4FF] dark:text-blue-400 dark:hover:bg-blue-950/35"
        >
          <Plus size={14} />
          {t('changelog.fields.addItem')}
        </button>
      </div>

      {/* Section: Publish Settings */}
      <div>
        <h4 className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
          {t('changelog.sections.publishSettings')}
        </h4>

        {/* Tone + Sort Order */}
        <div className="grid grid-cols-[1fr_180px] gap-4 max-[480px]:grid-cols-1 max-[480px]:gap-4">
          {/* Tone */}
          <div>
            <label className="mb-[8px] block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('changelog.fields.tone')}
            </label>
            <div className="flex gap-2">
              {TONE_VALUES.map(tone => {
                const active = form.tone === tone.value;
                return (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, tone: tone.value }))}
                    aria-label={t(`changelog.toneOptions.${tone.label}`)}
                    title={t(`changelog.toneOptions.${tone.label}`)}
                    className={cn(
                      'relative h-9 w-9 rounded-full transition-[transform,opacity,box-shadow] duration-200',
                      tone.class,
                      active
                        ? 'scale-100 opacity-100 shadow-sm'
                        : 'opacity-55 hover:scale-105 hover:opacity-85',
                    )}
                  >
                    {active && (
                      <span className="absolute -inset-[3px] rounded-full border-2 border-[#3272FF] ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="mb-[8px] block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('changelog.fields.sortOrder')}
            </label>
            <AdminInput
              type="number"
              value={String(form.sort_order)}
              onChange={e => {
                const n = Number(e.target.value);
                if (!isNaN(n)) setForm(p => ({ ...p, sort_order: n }));
              }}
              placeholder="0"
              min={0}
              max={9999}
              className="w-full tabular-nums"
            />
          </div>
        </div>

        {/* Publish Switch */}
        <div
          className="mt-[18px] flex items-center justify-between gap-4 rounded-[12px] bg-slate-50/80 px-3.5 py-3 dark:bg-slate-800/50"
          onClick={() => setForm(p => ({ ...p, is_published: !p.is_published }))}
        >
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
              {t('changelog.fields.publishNow')}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
              {t('changelog.fields.publishNowDesc')}
            </p>
          </div>
          <AdminSwitch
            checked={form.is_published}
            onChange={v => setForm(p => ({ ...p, is_published: v }))}
          />
        </div>
      </div>
    </>
  );

  const formFooter = (
    <div className="flex justify-end gap-[10px] max-[639px]:*:flex-1">
      <AdminButton onClick={() => setModalOpen(false)}>
        {t('changelog.modal.cancel')}
      </AdminButton>
      <AdminButton variant="primary" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {!saving && saveLabel}
        {saving && saveLabel}
      </AdminButton>
    </div>
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('changelog.title')}
        description={isMobile ? undefined : t('changelog.subtitle')}
        actions={isMobile ? undefined : (
          <AdminButton variant="primary" onClick={openCreate}><Plus size={16} /> {t('changelog.addLog')}</AdminButton>
        )}
      />

      {/* Mobile subtitle */}
      {isMobile && (
        <p className="text-[14px] text-slate-500 dark:text-slate-400 -mt-3 mb-0">
          {t('changelog.subtitle')}
        </p>
      )}

      {/* Mobile action buttons */}
      {isMobile && (
        <div className="flex items-center gap-3" style={{ marginTop: isMobile ? '20px' : undefined }}>
          <AdminButton variant="primary" onClick={openCreate} className="flex-1 h-[44px]">
            <Plus size={16} /> {t('changelog.addLog')}
          </AdminButton>
        </div>
      )}

      {/* ---- Entry List ---- */}
      {isMobile ? (
        <MobileChangelogCardList
          entries={entries}
          onTogglePublish={togglePublish}
          onEdit={openEdit}
          onDelete={handleDelete}
          labelPublished={labelPublished}
          labelDraft={labelDraft}
          labelPublish={labelPublish}
          labelUnpublish={labelUnpublish}
          labelEdit={labelEdit}
          labelDelete={labelDelete}
          labelEmpty={labelEmpty}
        />
      ) : (
        <DesktopChangelogTable
          entries={entries}
          onTogglePublish={togglePublish}
          onEdit={openEdit}
          onDelete={handleDelete}
          labelVersion={t('changelog.table.version')}
          labelTitle={t('changelog.table.title')}
          labelTone={t('changelog.table.tone')}
          labelStatus={t('changelog.table.status')}
          labelSort={t('changelog.table.sort')}
          labelCreatedAt={t('changelog.table.createdAt')}
          labelActions={t('changelog.table.actions')}
          labelPublished={labelPublished}
          labelDraft={labelDraft}
          labelPublish={labelPublish}
          labelUnpublish={labelUnpublish}
          labelEdit={labelEdit}
          labelDelete={labelDelete}
          labelEmpty={labelEmpty}
        />
      )}

      {/* Create/Edit Modal - Desktop: centered dialog, Mobile: bottom sheet */}
      {isBottomSheet ? (
        <AdminBottomSheet open={modalOpen} onClose={() => setModalOpen(false)}>
          <AdminFormModalHeader title={modalTitle} onClose={() => setModalOpen(false)} showCloseButton={false} />
          <div data-sheet-scroll className="flex-1 overflow-y-auto px-[20px] py-[18px]">
            {formContent}
          </div>
          <div className="shrink-0 border-t border-[rgba(31,45,61,0.06)] px-[20px] pt-[14px] pb-[18px] dark:border-slate-800"
               style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))' }}>
            {formFooter}
          </div>
        </AdminBottomSheet>
      ) : (
        <AdminFormModal open={modalOpen} onClose={() => setModalOpen(false)}>
          <AdminFormModalHeader title={modalTitle} onClose={() => setModalOpen(false)} showCloseButton={false} />
          <AdminFormModalBody>
            {formContent}
          </AdminFormModalBody>
          <AdminFormModalFooter>
            {formFooter}
          </AdminFormModalFooter>
        </AdminFormModal>
      )}
    </AdminPage>
  );
}

// ── Helper: Field wrapper with label & error ──
function FieldWrapper({
  label, children, error, errorMessage, ...rest
}: {
  label: string;
  children: ReactNode;
  error?: boolean;
  errorMessage?: string;
  [key: string]: any;
}) {
  return (
    <div {...rest}>
      <label className="mb-[7px] block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
      {error && errorMessage && (
        <p className="mt-1.5 text-[12px] text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}

function cnField(error?: boolean) {
  return error
    ? '!border-red-300/60 !bg-red-50/40 dark:!border-red-800/40 dark:!bg-red-950/20'
    : '';
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
