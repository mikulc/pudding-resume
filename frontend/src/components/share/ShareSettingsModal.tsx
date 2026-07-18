import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download, Eye, EyeOff, Globe, Shield, X } from 'lucide-react';
import { updateShareSettings, type ShareSettings } from '../../api/share';
import { useToast } from '../common/Toast';

interface ShareSettingsModalProps {
  open: boolean;
  resumeId: string | null;
  shareState: ShareSettings | null;
  onClose: () => void;
  onSaved: (updated: ShareSettings) => void;
}

interface OptionCardProps {
  id: string;
  name: string;
  value: string;
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onChange: () => void;
}

function PermissionOptionCard({ id, name, value, icon, title, description, selected, onChange }: OptionCardProps) {
  return (
    <label htmlFor={id} className={`share-permission-option ${selected ? 'is-selected' : ''}`}>
      <input id={id} className="sr-only" type="radio" name={name} value={value} checked={selected} onChange={onChange} />
      <span className="share-permission-icon" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="share-permission-option-title">{title}</span>
        <span className="share-permission-description">{description}</span>
      </span>
      <span className={`share-permission-check ${selected ? 'is-visible' : ''}`} aria-hidden="true">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </label>
  );
}

interface SettingRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function PermissionSettingRow({ icon, title, description, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="share-permission-setting-row" onClick={() => onCheckedChange(!checked)}>
      <span className={`share-permission-icon ${checked ? 'is-active' : ''}`} aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="share-permission-option-title">{title}</span>
        <span className="share-permission-description">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={(event) => {
          event.stopPropagation();
          onCheckedChange(!checked);
        }}
        className={`share-permission-switch ${checked ? 'is-checked' : ''}`}
      >
        <span />
      </button>
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="share-permission-section">
      <h4>{title}</h4>
      <div className="share-permission-section-content">{children}</div>
    </section>
  );
}

export function ShareSettingsModal({ open, resumeId, shareState, onClose, onSaved }: ShareSettingsModalProps) {
  const { showToast } = useToast();
  const { t } = useTranslation(['resume', 'common']);
  const [permission, setPermission] = useState<'self_only' | 'link_anyone'>('self_only');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const [canExport, setCanExport] = useState(false);
  const [desensitized, setDesensitized] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(saving);
  onCloseRef.current = onClose;
  savingRef.current = saving;

  useEffect(() => {
    if (!open) return;
    setPermission((shareState?.permission as 'self_only' | 'link_anyone') ?? 'self_only');
    setAccessLevel((shareState?.access_level as 'view' | 'edit') ?? 'view');
    setCanExport(shareState?.can_export ?? false);
    setDesensitized(shareState?.desensitized ?? false);
  }, [open, shareState]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) onCloseRef.current();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open || !resumeId) return null;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateShareSettings(resumeId, {
        permission,
        access_level: accessLevel,
        can_export: canExport,
        desensitized,
      });
      onSaved(res.share);
      showToast(t('share.settingsSaved'), 'success');
      onClose();
    } catch {
      showToast(t('share.settingsFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="share-permission-layer" role="presentation">
      <div className="share-permission-backdrop" onClick={() => !saving && onClose()} />
      <div ref={dialogRef} className="share-permission-dialog" role="dialog" aria-modal="true" aria-labelledby="share-permission-title">
        <div className="share-permission-drag-handle" aria-hidden="true"><span /></div>
        <header className="share-permission-header">
          <div className="min-w-0 pr-10">
            <h3 id="share-permission-title">{t('share.settingsTitle')}</h3>
            <p>{t('share.settingsDescription')}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="share-permission-close" onClick={onClose} aria-label={t('common:button.close')}>
            <X className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="share-permission-content">
          <ModalSection title={t('share.permission.title')}>
            <PermissionOptionCard id="perm-self-only" name="permission" value="self_only" icon={<Shield />} title={t('share.permission.selfOnly.title')} description={t('share.permission.selfOnly.description')} selected={permission === 'self_only'} onChange={() => setPermission('self_only')} />
            <PermissionOptionCard id="perm-link-anyone" name="permission" value="link_anyone" icon={<Globe />} title={t('share.permission.anyoneWithLink.title')} description={t('share.permission.anyoneWithLink.description')} selected={permission === 'link_anyone'} onChange={() => setPermission('link_anyone')} />
          </ModalSection>

          {permission === 'link_anyone' && (
            <div className="share-permission-link-options">
              <ModalSection title={t('share.access.title')}>
                <PermissionOptionCard id="access-view" name="access_level" value="view" icon={<Eye />} title={t('share.access.viewOnly.title')} description={t('share.access.viewOnly.description')} selected={accessLevel === 'view'} onChange={() => setAccessLevel('view')} />
                <PermissionOptionCard id="access-edit" name="access_level" value="edit" icon={<Copy />} title={t('share.access.editable.title')} description={t('share.access.editable.description')} selected={accessLevel === 'edit'} onChange={() => setAccessLevel('edit')} />
              </ModalSection>

              <ModalSection title={t('share.otherSettings.title')}>
                <div className="share-permission-settings-panel">
                  <PermissionSettingRow icon={<EyeOff />} title={t('share.desensitize.enabled.title')} description={t('share.desensitize.enabled.description')} checked={desensitized} onCheckedChange={setDesensitized} />
                  <PermissionSettingRow icon={<Download />} title={t('share.exportPermission.allowExport.title')} description={t('share.exportPermission.allowExport.description')} checked={canExport} onCheckedChange={setCanExport} />
                </div>
              </ModalSection>
            </div>
          )}
        </div>

        <footer className="share-permission-footer">
          <button type="button" className="share-permission-cancel" onClick={onClose} disabled={saving}>{t('common:button.cancel')}</button>
          <button type="button" className="share-permission-save" onClick={handleSave} disabled={saving}>
            <span className={saving ? 'invisible' : ''}>{t('share.saveSettings')}</span>
            {saving && <span className="share-permission-spinner" aria-label={t('common:saving')} />}
          </button>
        </footer>
      </div>

      <style>{`
        .share-permission-layer { position: fixed; inset: 0; z-index: 10040; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .share-permission-backdrop { position: absolute; inset: 0; background: rgba(15,23,42,.38); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); animation: share-backdrop-in 200ms ease-out; }
        .share-permission-dialog { position: relative; display: flex; width: min(520px, calc(100vw - 32px)); max-height: min(760px, calc(100dvh - 48px)); flex-direction: column; overflow: hidden; border: 1px solid rgba(15,23,42,.08); border-radius: 20px; background: #fff; box-shadow: 0 28px 80px rgba(15,23,42,.18), 0 8px 28px rgba(15,23,42,.08); color: #1f2937; animation: share-dialog-in 210ms cubic-bezier(.2,.8,.2,1); }
        .share-permission-drag-handle { display: none; }
        .share-permission-header { position: relative; flex: none; padding: 20px 22px 16px; border-bottom: 1px solid rgba(31,45,61,.06); }
        .share-permission-header h3 { font-size: 18px; line-height: 26px; font-weight: 600; letter-spacing: -.01em; }
        .share-permission-header p { margin-top: 4px; font-size: 13px; line-height: 20px; color: #7c8798; }
        .share-permission-close { position: absolute; top: 18px; right: 20px; display: grid; width: 32px; height: 32px; place-items: center; border-radius: 9px; color: #7c8798; transition: color 170ms, background-color 170ms; }
        .share-permission-close:hover { color: #374151; background: #f1f5f9; }
        .share-permission-content { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 18px 22px 22px; scrollbar-gutter: stable; }
        .share-permission-content::-webkit-scrollbar { width: 4px; }
        .share-permission-content::-webkit-scrollbar-track { background: transparent; }
        .share-permission-content::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(148,163,184,.32); }
        .share-permission-content::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,.5); }
        .share-permission-content::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }
        @-moz-document url-prefix() {
          .share-permission-content { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.35) transparent; }
        }
        .share-permission-section + .share-permission-section, .share-permission-link-options { margin-top: 22px; }
        .share-permission-link-options .share-permission-section + .share-permission-section { margin-top: 22px; }
        .share-permission-section h4 { margin: 0 0 8px; font-size: 13px; line-height: 19px; font-weight: 600; color: #475467; }
        .share-permission-section-content { display: grid; gap: 8px; }
        .share-permission-option { display: flex; min-height: 64px; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e8edf3; border-radius: 14px; background: #fff; cursor: pointer; transition: color 170ms, border-color 170ms, background-color 170ms; }
        .share-permission-option:hover { border-color: #dce3ec; background: #f8fafc; }
        .share-permission-option.is-selected { border-color: rgba(50,114,255,.30); background: rgba(50,114,255,.055); }
        .share-permission-icon { display: grid; width: 32px; height: 32px; flex: none; place-items: center; border-radius: 10px; background: #f3f6f9; color: #8994a5; transition: color 170ms, background-color 170ms; }
        .share-permission-icon svg { width: 16px; height: 16px; }
        .is-selected .share-permission-icon, .share-permission-icon.is-active { color: #3272ff; }
        .share-permission-option-title, .share-permission-description { display: block; }
        .share-permission-option-title { font-size: 14px; line-height: 20px; font-weight: 500; color: #263244; }
        .share-permission-description { display: -webkit-box; margin-top: 2px; overflow: hidden; font-size: 12px; line-height: 1.45; color: #98a2b3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .share-permission-check { display: grid; width: 18px; height: 18px; flex: none; place-items: center; border: 1px solid #d8e0e9; border-radius: 50%; color: transparent; transition: color 170ms, border-color 170ms, background-color 170ms; }
        .share-permission-check.is-visible { border-color: #3272ff; background: #3272ff; color: white; }
        .share-permission-settings-panel { overflow: hidden; border: 1px solid #e8edf3; border-radius: 14px; background: #fff; }
        .share-permission-setting-row { display: grid; min-height: 64px; grid-template-columns: 32px minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; transition: background-color 170ms; }
        .share-permission-setting-row + .share-permission-setting-row { border-top: 1px solid rgba(15,23,42,.06); }
        .share-permission-setting-row:hover { background: #f8fafc; }
        .share-permission-switch { position: relative; width: 42px; height: 24px; flex: none; border-radius: 999px; background: #dfe5ec; transition: background-color 180ms; }
        .share-permission-switch span { position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(15,23,42,.22); transition: transform 180ms; }
        .share-permission-switch.is-checked { background: #3272ff; }
        .share-permission-switch.is-checked span { transform: translateX(18px); }
        .share-permission-footer { display: flex; min-height: 68px; flex: none; justify-content: flex-end; gap: 10px; padding: 12px 20px calc(16px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(15,23,42,.06); background: rgba(255,255,255,.94); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
        .share-permission-footer button { position: relative; height: 40px; border-radius: 10px; padding: 0 16px; font-size: 14px; font-weight: 500; transition: background-color 170ms, color 170ms, transform 120ms; }
        .share-permission-cancel { border: 1px solid #e3e8ef; background: #fff; color: #596579; }
        .share-permission-cancel:hover { background: #eef2f6; color: #344054; }
        .share-permission-save { width: 104px; background: #3272ff; color: white; box-shadow: 0 4px 12px rgba(50,114,255,.18); }
        .share-permission-save:hover { background: #2866eb; }
        .share-permission-save:active { transform: scale(.985); }
        .share-permission-footer button:disabled { cursor: not-allowed; opacity: .68; }
        .share-permission-spinner { position: absolute; top: 50%; left: 50%; width: 16px; height: 16px; margin: -8px; border: 2px solid rgba(255,255,255,.45); border-top-color: white; border-radius: 50%; animation: share-spin .7s linear infinite; }
        .share-permission-dialog :focus-visible { outline: 3px solid rgba(50,114,255,.18); outline-offset: 2px; }
        .share-permission-option:has(input:focus-visible) { outline: 3px solid rgba(50,114,255,.18); outline-offset: 2px; }
        @keyframes share-dialog-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes share-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes share-spin { to { transform: rotate(360deg); } }
        .dark .share-permission-backdrop { background: rgba(3,7,18,.32); }
        .dark .share-permission-dialog { border-color: rgba(255,255,255,.08); background: rgba(20,24,32,.78); color: rgba(255,255,255,.9); box-shadow: 0 24px 64px rgba(0,0,0,.38), 0 4px 16px rgba(0,0,0,.22); -webkit-backdrop-filter: blur(20px) saturate(140%); backdrop-filter: blur(20px) saturate(140%); }
        .dark .share-permission-header, .dark .share-permission-footer { border-color: rgba(255,255,255,.07); }
        .dark .share-permission-header p, .dark .share-permission-description { color: rgba(255,255,255,.58); }
        .dark .share-permission-close { color: rgba(255,255,255,.52); }
        .dark .share-permission-close:hover, .dark .share-permission-cancel:hover { color: rgba(255,255,255,.9); background: rgba(255,255,255,.08); }
        .dark .share-permission-section h4 { color: rgba(255,255,255,.62); }
        .dark .share-permission-option, .dark .share-permission-settings-panel { border-color: rgba(255,255,255,.08); background: rgba(255,255,255,.035); }
        .dark .share-permission-option:hover, .dark .share-permission-setting-row:hover { border-color: rgba(255,255,255,.13); background: rgba(255,255,255,.06); }
        .dark .share-permission-option.is-selected { border-color: rgba(88,140,255,.34); background: rgba(50,114,255,.12); }
        .dark .share-permission-setting-row + .share-permission-setting-row { border-color: rgba(255,255,255,.07); }
        .dark .share-permission-icon { background: rgba(255,255,255,.055); color: rgba(255,255,255,.48); }
        .dark .is-selected .share-permission-icon, .dark .share-permission-icon.is-active { color: #69a0ff; background: rgba(50,114,255,.14); }
        .dark .share-permission-option-title { color: rgba(255,255,255,.9); }
        .dark .share-permission-check { border-color: rgba(255,255,255,.2); }
        .dark .share-permission-check.is-visible { border-color: #4e85ff; background: #4e85ff; }
        .dark .share-permission-switch { background: rgba(255,255,255,.16); }
        .dark .share-permission-switch.is-checked { background: #3272ff; }
        .dark .share-permission-footer { background: rgba(20,24,32,.72); }
        .dark .share-permission-cancel { border-color: rgba(255,255,255,.09); background: rgba(255,255,255,.045); color: rgba(255,255,255,.66); }
        @media (max-width: 639px) {
          .share-permission-layer { align-items: flex-end; padding: 12px 0 0; }
          .share-permission-dialog { width: 100%; max-height: calc(100dvh - 12px); border-width: 1px 1px 0; border-radius: 22px 22px 0 0; animation-name: share-sheet-in; }
          .share-permission-drag-handle { display: grid; height: 18px; flex: none; place-items: end center; }
          .share-permission-drag-handle span { width: 36px; height: 4px; border-radius: 999px; background: rgba(148,163,184,.48); }
          .share-permission-header { padding: 16px 18px 14px; }
          .share-permission-close { top: 14px; right: 16px; }
          .share-permission-content { padding: 18px; }
          .share-permission-footer { padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px)); }
          .share-permission-footer button { min-width: 0; flex: 1; }
          .share-permission-save { width: auto; }
        }
        @keyframes share-sheet-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .share-permission-backdrop, .share-permission-dialog, .share-permission-spinner { animation-duration: .01ms !important; } }
      `}</style>
    </div>,
    document.body,
  );
}
