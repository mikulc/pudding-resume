import type { SettingsPreferences } from '../useSettingsPreferences';
import { Command } from 'lucide-react';

interface ShortcutsSectionProps { settings: SettingsPreferences; }

export function ShortcutsSection({ settings }: ShortcutsSectionProps) {
  const {
    t,
  } = settings;

  return (
    <section id="shortcuts" className="scroll-mt-28">
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
          <Command className="w-5 h-5 text-gray-500" />
          {t('nav.shortcuts')}
        </h3>
        <p className="text-sm text-[#6b7280] mb-6">{t('shortcuts.desc')}</p>
        <div className="border-t border-gray-100 mb-4" />
        <div className="space-y-2">
          {[
            { key: '⌘ / Ctrl + S', desc: t('shortcuts.saveResume') },
            { key: '⌘ / Ctrl + Z', desc: t('shortcuts.undo') },
            { key: '⌘ / Ctrl + Shift + Z', desc: t('shortcuts.redo') },
            { key: '⌘ / Ctrl + P', desc: t('shortcuts.exportPdf') },
            { key: '⌘ / Ctrl + B', desc: t('shortcuts.bold') },
            { key: '⌘ / Ctrl + I', desc: t('shortcuts.italic') },
            { key: '⌘ / Ctrl + U', desc: t('shortcuts.underline') },
            { key: 'Space + 鼠标左键', desc: t('shortcuts.moveCanvas'), keyLabel: t('shortcuts.moveCanvasKey') },
            { key: 'Esc', desc: t('shortcuts.closeOrCancel') },
          ].map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-600">{shortcut.desc}</span>
              <kbd className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-mono text-gray-600 flex-shrink-0">
                {shortcut.keyLabel ?? shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
