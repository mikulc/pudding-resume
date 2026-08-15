import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, FileJson, Pencil, Plus, Search,
  Trash2, Upload, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createAdminTemplate, createAdminTemplateCategory, deleteAdminTemplate, fetchAdminTemplateCategories, fetchAdminTemplates,
  importAdminTemplates, updateAdminTemplate,
} from '../../api/admin';
import { getThemeLibraries } from '../../api/templates';
import { useConfirm } from '../../components/common/ConfirmModal';
import { useToast } from '../../components/common/Toast';
import { invalidateResumeTemplateLibraryCache } from '../../components/template/ResumeTemplateLibrary';
import type { AdminCategory, AdminTemplateInput, AdminTemplateItem } from '../../types/admin';
import type { ResumeData, ThemeLibraryEntry } from '../../types/resume';
import { getErrorMessage } from '../../utils/errors';
import {
  AdminBadge, AdminButton, AdminCard, AdminFormDrawer, AdminFormModalBody,
  AdminFormModalFooter, AdminFormModalHeader, AdminIconButton, AdminInput,
  AdminPage, AdminPageHeader, AdminSelect,
} from './adminStyles';

type TemplateForm = Omit<AdminTemplateInput, 'content'> & {
  content: string;
};

const emptyResume: ResumeData = {
  personalInfo: { fullName: '', phone: '', email: '', photoUrl: '' },
  education: [], workExperience: [], projects: [], skills: '',
};

function newForm(themeId = ''): TemplateForm {
  return {
    name: '', category_ids: [],
    content: JSON.stringify(emptyResume, null, 2), default_theme_id: themeId,
    status: 'published', sort_order: 0,
  };
}

function formToPayload(form: TemplateForm): AdminTemplateInput {
  const content = JSON.parse(form.content) as ResumeData;
  if (!content || Array.isArray(content) || typeof content !== 'object') throw new Error('content');
  return {
    ...form,
    name: form.name.trim(), category_ids: form.category_ids,
    content, sort_order: Number(form.sort_order) || 0,
  };
}

function itemToForm(item: AdminTemplateItem): TemplateForm {
  return {
    name: item.name, category_ids: item.category_ids ?? [],
    content: JSON.stringify(item.content, null, 2), default_theme_id: item.default_theme_id,
    status: item.status, sort_order: item.sort_order,
  };
}

export default function AdminTemplatesPage() {
  const { t } = useTranslation('admin');
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<AdminTemplateItem[]>([]);
  const [themes, setThemes] = useState<ThemeLibraryEntry[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminTemplateItem | null | undefined>(undefined);
  const [form, setForm] = useState<TemplateForm>(() => newForm());
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminTemplates({ page, size: pageSize, search: search || undefined, status: status || undefined });
      setTemplates(result.templates ?? []);
      setTotal(result.total);
    } catch (error) {
      showToast(getErrorMessage(error, t('templatesAdmin.toast.loadFailed')), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, showToast, t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    getThemeLibraries().then((items) => {
      setThemes(items);
      setForm((current) => current.default_theme_id || !items[0]
        ? current : { ...current, default_theme_id: items[0].id });
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    fetchAdminTemplateCategories()
      .then(setCategories)
      .catch((error) => showToast(getErrorMessage(error, t('templatesAdmin.toast.categoryLoadFailed')), 'error'));
  }, [showToast, t]);

  const openCreate = () => {
    setForm(newForm(themes[0]?.id));
    setEditing(null);
  };
  const openEdit = (item: AdminTemplateItem) => {
    setForm(itemToForm(item));
    setEditing(item);
  };
  const closeForm = () => { if (!saving) setEditing(undefined); };

  const save = async () => {
    if (!form.name.trim() || !form.default_theme_id || form.category_ids.length === 0) {
      showToast(t('templatesAdmin.toast.required'), 'error');
      return;
    }
    let payload: AdminTemplateInput;
    try {
      payload = formToPayload(form);
    } catch {
      showToast(t('templatesAdmin.toast.invalidContent'), 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateAdminTemplate(editing.id, payload);
      else await createAdminTemplate(payload);
      showToast(t(editing ? 'templatesAdmin.toast.updated' : 'templatesAdmin.toast.created'), 'success');
      setEditing(undefined);
      invalidateResumeTemplateLibraryCache();
      await load();
    } catch (error) {
      showToast(getErrorMessage(error, t('templatesAdmin.toast.saveFailed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (name: string) => {
    try {
      const result = await createAdminTemplateCategory({ name, status: 'enabled', sort_order: categories.length });
      setCategories((current) => [...current, result.category]);
      setForm((current) => ({
        ...current,
        category_ids: [...new Set([...current.category_ids, result.category.id])],
      }));
      invalidateResumeTemplateLibraryCache();
      showToast(t('templatesAdmin.toast.categoryCreated'), 'success');
    } catch (error) {
      showToast(getErrorMessage(error, t('templatesAdmin.toast.categoryCreateFailed')), 'error');
    }
  };

  const remove = async (item: AdminTemplateItem) => {
    const accepted = await confirm({
      title: t('templatesAdmin.delete.title'),
      message: t('templatesAdmin.delete.message', { name: item.name }),
      confirmText: t('templatesAdmin.delete.confirm'), confirmVariant: 'danger',
    });
    if (!accepted) return;
    try {
      await deleteAdminTemplate(item.id);
      showToast(t('templatesAdmin.toast.deleted'), 'success');
      invalidateResumeTemplateLibraryCache();
      if (templates.length === 1 && page > 1) setPage((value) => value - 1);
      else await load();
    } catch (error) {
      showToast(getErrorMessage(error, t('templatesAdmin.toast.deleteFailed')), 'error');
    }
  };

  const handleImport = async (files?: FileList | null) => {
    if (!files?.length) return;
    try {
      const payloads = (await Promise.all(Array.from(files).map(async (file) => {
        const raw = JSON.parse(await file.text()) as unknown;
        const candidates = Array.isArray(raw)
          ? raw
          : raw && typeof raw === 'object' && 'templates' in raw
            ? (raw as { templates: unknown }).templates
            : [raw];
        if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('empty');
        const fileName = file.name.replace(/\.json$/i, '');
        return candidates.map((candidate, index) => normalizeImportedTemplate(
          candidate,
          themes,
          categories,
          candidates.length === 1 ? fileName : `${fileName}-${index + 1}`,
        ));
      }))).flat();
      const result = await importAdminTemplates(payloads);
      showToast(t('templatesAdmin.toast.imported', { count: result.count }), 'success');
      invalidateResumeTemplateLibraryCache();
      setPage(1);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error, t('templatesAdmin.toast.invalidFile')), 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const themeNames = useMemo(() => new Map(themes.map((theme) => [theme.id, theme.name])), [themes]);

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('templatesAdmin.title')}
        description={t('templatesAdmin.subtitle')}
        meta={<AdminBadge tone="brand">{t('templatesAdmin.count', { count: total })}</AdminBadge>}
        actions={<>
          <input ref={fileRef} type="file" accept="application/json,.json" multiple className="hidden" onChange={(event) => void handleImport(event.target.files)} />
          <AdminButton onClick={() => fileRef.current?.click()}><Upload size={16} />{t('templatesAdmin.import')}</AdminButton>
          <AdminButton variant="primary" onClick={openCreate}><Plus size={16} />{t('templatesAdmin.create')}</AdminButton>
        </>}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <AdminInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t('templatesAdmin.search')} className="w-full pl-9 pr-9" />
          {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={15} /></button>}
        </div>
        <AdminSelect
          value={status}
          options={[
            { value: '', label: t('templatesAdmin.status.all') },
            { value: 'published', label: t('templatesAdmin.status.published') },
            { value: 'draft', label: t('templatesAdmin.status.draft') },
          ]}
          onChange={(value) => { setStatus(value); setPage(1); }}
          ariaLabel={t('templatesAdmin.form.status')}
          className="w-full sm:w-[132px]"
        />
      </div>

      {loading ? (
        <AdminCard className="flex min-h-64 items-center justify-center text-sm text-slate-400">{t('templatesAdmin.loading')}</AdminCard>
      ) : templates.length === 0 ? (
        <AdminCard className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-400">
          <FileJson size={34} strokeWidth={1.5} /><p className="text-sm">{t('templatesAdmin.empty')}</p>
        </AdminCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {templates.map((item) => (
            <AdminCard key={item.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]"><FileJson size={21} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                    <AdminBadge tone={item.status === 'published' ? 'success' : 'neutral'}>{t(`templatesAdmin.status.${item.status}`)}</AdminBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.default_theme?.name || themeNames.get(item.default_theme_id) || '-'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{item.categories.map((tag) => <AdminBadge key={tag}>{tag}</AdminBadge>)}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <AdminIconButton tone="brand" onClick={() => openEdit(item)} aria-label={t('templatesAdmin.edit')}><Pencil size={16} /></AdminIconButton>
                  <AdminIconButton tone="danger" onClick={() => void remove(item)} aria-label={t('templatesAdmin.delete.confirm')}><Trash2 size={16} /></AdminIconButton>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {totalPages > 1 && <div className="flex items-center justify-end gap-2">
        <AdminIconButton disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></AdminIconButton>
        <span className="text-sm text-slate-500">{page} / {totalPages}</span>
        <AdminIconButton disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></AdminIconButton>
      </div>}

      <AdminFormDrawer open={editing !== undefined} onClose={closeForm} closeOnBackdrop={false}>
        <AdminFormModalHeader title={t(editing ? 'templatesAdmin.form.editTitle' : 'templatesAdmin.form.createTitle')} onClose={closeForm} />
        <AdminFormModalBody><TemplateFields form={form} themes={themes} categories={categories} onCreateCategory={addCategory} onChange={setForm} t={t} /></AdminFormModalBody>
        <AdminFormModalFooter><div className="flex justify-end gap-3"><AdminButton onClick={closeForm}>{t('templatesAdmin.form.cancel')}</AdminButton><AdminButton variant="primary" disabled={saving} onClick={() => void save()}>{saving ? t('templatesAdmin.form.saving') : t('templatesAdmin.form.save')}</AdminButton></div></AdminFormModalFooter>
      </AdminFormDrawer>
    </AdminPage>
  );
}

function normalizeImportedTemplate(value: unknown, themes: ThemeLibraryEntry[], categories: AdminCategory[], fallbackName: string): AdminTemplateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON 中存在无效模板');
  const item = value as Partial<AdminTemplateInput> & { defaultThemeId?: string; categories?: string[] };
  const rawContent = item.content && typeof item.content === 'object' ? item.content : value;
  const themeId = item.default_theme_id || item.defaultThemeId || themes[0]?.id || '';
  if (!themeId || !rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) throw new Error('模板缺少有效的 content 或 default_theme_id');
  const categoryIds = Array.isArray(item.category_ids) ? item.category_ids.map(String) : [];
  if (categoryIds.length === 0 && Array.isArray(item.categories)) {
    const byName = new Map(categories.map((category) => [category.name, category.id]));
    categoryIds.push(...item.categories.map((name) => byName.get(String(name)) ?? '').filter(Boolean));
  }
  if (categoryIds.length === 0) throw new Error('模板缺少有效的 category_ids');
  return {
    name: String(item.name || fallbackName), category_ids: categoryIds,
    content: rawContent as ResumeData, default_theme_id: themeId,
    status: item.status === 'draft' ? 'draft' : 'published', sort_order: Number(item.sort_order) || 0,
  };
}

function TemplateFields({ form, themes, categories, onCreateCategory, onChange, t }: {
  form: TemplateForm;
  themes: ThemeLibraryEntry[];
  categories: AdminCategory[];
  onCreateCategory: (name: string) => Promise<void>;
  onChange: (form: TemplateForm) => void;
  t: (key: string) => string;
}) {
  const update = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => onChange({ ...form, [key]: value });
  const fieldClass = 'w-full';
  const [categoryName, setCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const createCategory = async () => {
    const name = categoryName.trim();
    if (!name || creatingCategory) return;
    setCreatingCategory(true);
    try {
      await onCreateCategory(name);
      setCategoryName('');
    } finally {
      setCreatingCategory(false);
    }
  };
  const toggleCategory = (id: string) => {
    update('category_ids', form.category_ids.includes(id)
      ? form.category_ids.filter((categoryId) => categoryId !== id)
      : [...form.category_ids, id]);
  };
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Field label={t('templatesAdmin.form.name')}><AdminInput className={fieldClass} value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
    <Field label={t('templatesAdmin.form.theme')}><AdminSelect className="w-full" value={form.default_theme_id} options={themes.map((theme) => ({ value: theme.id, label: theme.name }))} onChange={(value) => update('default_theme_id', value)} /></Field>
    <div className="sm:col-span-2"><Field label={t('templatesAdmin.form.categories')} hint={t('templatesAdmin.form.categoriesHint')}>
      <div className="rounded-[12px] border border-[#E6EAF2] p-3 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          {categories.filter((category) => category.status === 'enabled').map((category) => {
            const checked = form.category_ids.includes(category.id);
            return <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className={`rounded-lg border px-3 py-1.5 text-xs transition ${checked ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'}`}>{category.name}</button>;
          })}
          {categories.length === 0 && <span className="text-xs text-slate-400">{t('templatesAdmin.form.noCategories')}</span>}
        </div>
        <div className="mt-3 flex gap-2">
          <AdminInput
            className="min-w-0 flex-1"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
              event.preventDefault();
              void createCategory();
            }}
            placeholder={t('templatesAdmin.form.newCategoryPlaceholder')}
          />
          <AdminButton disabled={!categoryName.trim() || creatingCategory} onClick={() => void createCategory()}>{t('templatesAdmin.form.addCategory')}</AdminButton>
        </div>
      </div>
    </Field></div>
    <div className="grid grid-cols-2 gap-3">
      <Field label={t('templatesAdmin.form.status')}><AdminSelect className="w-full" value={form.status} options={[{ value: 'published', label: t('templatesAdmin.status.published') }, { value: 'draft', label: t('templatesAdmin.status.draft') }]} onChange={(value) => update('status', value as TemplateForm['status'])} /></Field>
      <Field label={t('templatesAdmin.form.sortOrder')}><AdminInput type="number" className={fieldClass} value={form.sort_order} onChange={(e) => update('sort_order', Number(e.target.value))} /></Field>
    </div>
    <div className="sm:col-span-2"><Field label={t('templatesAdmin.form.content')} hint={t('templatesAdmin.form.contentHint')}><textarea spellCheck={false} value={form.content} onChange={(e) => update('content', e.target.value)} className="min-h-72 w-full resize-y rounded-[12px] border border-[#E6EAF2] bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700 outline-none transition focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent-soft)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" /></Field></div>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="block"><div className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</div>{children}{hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}</div>;
}
