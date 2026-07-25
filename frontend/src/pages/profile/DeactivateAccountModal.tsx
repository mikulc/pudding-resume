import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export function DeactivateAccountModal({
  open,
  onClose,
  onDeactivated,
}: {
  open: boolean;
  onClose: () => void;
  onDeactivated: () => Promise<void>;
}) {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!password) {
      setError(t('profile.deactivatePasswordRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.del<{ message: string }>('/api/user/account', { password });
      await onDeactivated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('profile.deactivateFailed')));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} aria-label={t('profile.deactivateCancel')} />
      <div className="relative w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-2xl dark:border-red-500/20 dark:bg-slate-900">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X size={19} /></button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('profile.deactivateTitle')}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t('profile.deactivateDescription')}</p>
        <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {t('profile.oldPassword')}
          <input
            autoFocus
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700">{t('profile.deactivateCancel')}</button>
          <button disabled={submitting} onClick={submit} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {submitting ? t('profile.deactivating') : t('profile.deactivateConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
