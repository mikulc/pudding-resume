import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Image, FileCode2, FileJson } from 'lucide-react';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface ExportDropdownProps {
  isExportingPDF: boolean;
  isExportingPNG: boolean;
  isExportingMD: boolean;
  isExportingJSON: boolean;
  onExportPDF: () => void;
  onExportPNG: () => void;
  onExportMD: () => void;
  onExportJSON: () => void;
  compact?: boolean;
}

export function ExportDropdown({ isExportingPDF, isExportingPNG, isExportingMD, isExportingJSON, onExportPDF, onExportPNG, onExportMD, onExportJSON, compact = false }: ExportDropdownProps) {
  const { t } = useTranslation('editor');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExporting = isExportingPDF || isExportingPNG || isExportingMD || isExportingJSON;

  useOutsideClick({ open, refs: [containerRef], onOutsideClick: () => setOpen(false) });

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Close dropdown when export starts
  useEffect(() => {
    if (isExporting) setOpen(false);
  }, [isExporting]);

  const handleOption = (format: 'pdf' | 'png' | 'md' | 'json') => {
    setOpen(false);
    if (format === 'pdf') onExportPDF();
    else if (format === 'png') onExportPNG();
    else if (format === 'md') onExportMD();
    else onExportJSON();
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={isExporting}
        data-export-pdf
        aria-label={t('export.action')}
        className={[
          'editor-action-button editor-action-button--primary',
          compact ? 'editor-action-button--compact' : '',
        ].join(' ')}
      >
        {isExporting ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {!compact && t('export.action')}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!compact && (
              <span className="editor-action-button__label-with-chevron">
                <span>{t('export.action')}</span>
                <svg className="editor-action-button__chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            )}
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-[14px] shadow-[0_10px_28px_rgba(15,23,42,0.10)] p-1.5 z-50 min-w-[188px] dark:bg-slate-950 dark:border-slate-800"
          style={{ animation: 'dropdown-appear 0.15s ease-out' }}
        >
          <style>{`
            @keyframes dropdown-appear {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <button
            onClick={() => handleOption('pdf')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <FileText className="w-4 h-4 text-red-400 transition-colors group-hover/menu:text-red-500 dark:group-hover/menu:text-red-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('export.pdf')}</div>
            </div>
          </button>

          <button
            onClick={() => handleOption('png')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <Image className="w-4 h-4 text-purple-400 transition-colors group-hover/menu:text-purple-500 dark:group-hover/menu:text-purple-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('export.png')}</div>
            </div>
          </button>

          <button
            onClick={() => handleOption('md')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <FileCode2 className="w-4 h-4 text-green-500 transition-colors group-hover/menu:text-green-600 dark:group-hover/menu:text-green-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('export.markdown')}</div>
            </div>
          </button>

          <button
            onClick={() => handleOption('json')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <FileJson className="w-4 h-4 text-amber-500 transition-colors group-hover/menu:text-amber-600 dark:group-hover/menu:text-amber-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('export.json')}</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
