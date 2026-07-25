import type { SettingsPreferences } from '../useSettingsPreferences';
import { Info } from 'lucide-react';

interface AboutSectionProps { settings: SettingsPreferences; }

export function AboutSection({ settings }: AboutSectionProps) {
  const {
    t,
  } = settings;

  return (
    <section id="about" className="scroll-mt-28">
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
          <Info className="w-5 h-5 text-gray-500" />
          {t('nav.about')}
        </h3>
        <p className="text-sm text-[#6b7280] mb-6">{t('about.desc')}</p>
        <div className="border-t border-gray-100 mb-6" />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('about.version')}</p>
              <p className="text-xs text-gray-400">{t('about.versionDesc')}</p>
            </div>
            <span className="text-sm text-gray-500 font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">v1.0.0</span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('about.techStack')}</p>
              <p className="text-xs text-gray-400">{t('about.techStackDesc')}</p>
            </div>
            <span className="text-xs text-gray-400">React + Go</span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('about.live2dModel')}</p>
              <p className="text-xs text-gray-400">{t('about.live2dModelDesc')}</p>
            </div>
            <span className="text-xs text-gray-400">live2d-widget</span>
          </div>
        </div>
      </div>
    </section>
  );
}
