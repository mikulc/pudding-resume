import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileJson, FileText, FileCode2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import { importFromJSON, importFromPDF, importFromWord, importFromMarkdown } from '../../utils/importResume';
import { getAuthToken } from '../../utils/api';
import { createResume } from '../../api/resumes';
import { generateLocalId, saveResumeToLocal } from '../../utils/localStorage';
import { isLocalStorageEnabled } from '../../context/AuthContext';
import type { ImportResult } from '../../utils/importResume';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface ImportButtonProps {
  onImportComplete: () => void;
}

type ImportFormat = 'json' | 'pdf' | 'word' | 'markdown';

export function ImportButton({ onImportComplete }: ImportButtonProps) {
  const { showToast } = useToast();
  const { t } = useTranslation(['resume', 'common']);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);

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

  // Close dropdown when importing starts
  useEffect(() => {
    if (importing) setOpen(false);
  }, [importing]);

  /** Trigger file input for a given format */
  const handleSelectFormat = (format: ImportFormat) => {
    setOpen(false);
    if (format === 'json') jsonInputRef.current?.click();
    else if (format === 'pdf') pdfInputRef.current?.click();
    else if (format === 'word') wordInputRef.current?.click();
    else markdownInputRef.current?.click();
  };

  /** Parse and save the imported resume */
  const handleFile = async (file: File, format: ImportFormat) => {
    // 未登录且未配置本地存储：无法保存，提前拒绝避免浪费 AI 调用
    if (!getAuthToken() && !isLocalStorageEnabled()) {
      showToast(t('import.storageRequired'), 'info');
      return;
    }

    setImporting(true);
    setImportFormat(format);

    let result: ImportResult;
    try {
      if (format === 'json') {
        result = await importFromJSON(file);
      } else if (format === 'pdf') {
        result = await importFromPDF(file);
      } else if (format === 'word') {
        result = await importFromWord(file);
      } else {
        result = await importFromMarkdown(file);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('import.failedRetry');
      showToast(message, 'error');
      setImporting(false);
      setImportFormat(null);
      return;
    }

    try {
      // 辅助函数：导入成功回调
      const handleSuccess = (message: string) => {
        showToast(message, 'success');
        onImportComplete();
      };

      // JSON 导入：如果开启了本地存储，直接存本地（不存云端）
      if (format === 'json' && isLocalStorageEnabled()) {
        const localId = generateLocalId();
        await saveResumeToLocal({
          id: localId,
          name: result.resumeName,
          content: result.resumeData,
          settings: result.settings || undefined,
          updated_at: new Date().toISOString(),
          cloud_uuid: result.sourceUuid || undefined,
        });
        handleSuccess(t('import.savedLocal', { name: result.resumeName }));
        return;
      }

      // Try saving to cloud first (pass settings so preview + editor show the correct theme)
      await createResume(result.resumeData, result.resumeName, result.settings || undefined);

      // Also save locally if local storage is enabled
      if (isLocalStorageEnabled()) {
        const localId = generateLocalId();
        await saveResumeToLocal({
          id: localId,
          name: result.resumeName,
          content: result.resumeData,
          settings: result.settings || undefined,
          updated_at: new Date().toISOString(),
        }).catch(() => {
          // Local save is optional, don't fail the whole import
        });
      }

      handleSuccess(t('import.imported', { name: result.resumeName }));
    } catch (error) {
      // JSON 导入的本地保存失败，不重试
      if (format === 'json' && isLocalStorageEnabled()) {
        showToast(t('import.saveLocalFailed'), 'error');
        return;
      }

      // If cloud save fails, try local only
      if (isLocalStorageEnabled()) {
        try {
          const localId = generateLocalId();
          const ok = await saveResumeToLocal({
            id: localId,
            name: result.resumeName,
            content: result.resumeData,
            settings: result.settings || undefined,
            updated_at: new Date().toISOString(),
          });
          if (ok) {
            showToast(t('import.savedLocal', { name: result.resumeName }), 'success');
            onImportComplete();
          } else {
            throw new Error(t('import.saveFailed'));
          }
        } catch {
          const message = error instanceof Error ? error.message : t('import.saveFailedRetry');
          showToast(message, 'error');
        }
      } else {
        const message = error instanceof Error ? error.message : t('import.saveFailedRetry');
        showToast(message, 'error');
      }
    } finally {
      setImporting(false);
      setImportFormat(null);
    }
  };

  /** Format label for loading state */
  const formatLabel =
    importFormat === 'json' ? 'JSON' :
    importFormat === 'pdf' ? 'PDF' :
    importFormat === 'word' ? 'Word' : 'Markdown';

  return (
    <div ref={containerRef} className="relative flex w-full sm:inline-flex sm:w-auto">
      {/* Hidden file inputs */}
      <input
        id="import-json"
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, 'json');
          e.target.value = '';
        }}
      />
      <input
        id="import-pdf"
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, 'pdf');
          e.target.value = '';
        }}
      />
      <input
        id="import-word"
        ref={wordInputRef}
        type="file"
        accept=".doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, 'word');
          e.target.value = '';
        }}
      />
      <input
        id="import-markdown"
        ref={markdownInputRef}
        type="file"
        accept=".md,.markdown"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, 'markdown');
          e.target.value = '';
        }}
      />

      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={importing}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(50,114,255,0.14)] bg-[rgba(50,114,255,0.08)] px-4 text-sm font-medium text-[#3272ff] shadow-none transition-colors hover:border-[rgba(50,114,255,0.22)] hover:bg-[rgba(50,114,255,0.13)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {importing ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('import.parsingFormat', { format: formatLabel })}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>{t('import.button')}</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="resume-popover-enter absolute right-0 top-full mt-2 bg-white/95 border border-slate-200/70 rounded-[14px] shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl p-1.5 z-50 min-w-[178px] dark:bg-slate-950 dark:border-slate-800"
        >
          <button
            onClick={() => handleSelectFormat('pdf')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <FileText className="w-4 h-4 text-red-400 transition-colors group-hover/menu:text-red-500 dark:group-hover/menu:text-red-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('import.options.pdf.title')}</div>
            </div>
          </button>

          <button
            onClick={() => handleSelectFormat('json')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <FileJson className="w-4 h-4 text-amber-500 transition-colors group-hover/menu:text-amber-600 dark:group-hover/menu:text-amber-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('import.options.json.title')}</div>
            </div>
          </button>

          <button
            onClick={() => handleSelectFormat('word')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <svg className="w-4 h-4 text-blue-500 transition-colors group-hover/menu:text-blue-600 dark:group-hover/menu:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2v6h6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12l1.5 4l1.5-2.5l1.5 2.5L14 12" />
            </svg>
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('import.options.word.title')}</div>
            </div>
          </button>

          <button
            onClick={() => handleSelectFormat('markdown')}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <FileCode2 className="w-4 h-4 text-green-500 transition-colors group-hover/menu:text-green-600 dark:group-hover/menu:text-green-300" />
            <div className="text-left">
              <div className="font-medium whitespace-nowrap">{t('import.options.markdown.title')}</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
