import { useState, useRef, useEffect, useCallback, useLayoutEffect, useId } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { parse, isValid } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Check, Trash2, ChevronDown } from 'lucide-react';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';

// ── Types ──

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;  size?: 'sm' | 'md';
  mode?: 'month' | 'date';
}

// ── Constants ──

const INPUT_FORMATS = ['yyyy.MM', 'yyyy-MM', 'yyyy/MM', 'yyyyMM'];
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEAR_RANGE = { min: 1990, max: 2030 };
const YEARS_PER_PAGE = 12;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

type PickerView = 'calendar' | 'months' | 'years';

// ── Helpers ──

function parseDate(value: string, mode: 'month' | 'date' = 'month'): { year: number; month: number; day: number } | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const formats = mode === 'date' ? ['yyyy-MM-dd', 'yyyy.MM.dd', 'yyyy/MM/dd'] : INPUT_FORMATS;
  for (const fmt of formats) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        return { year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate() };
      }
    } catch {}
  }
  return null;
}

function prevMonth(year: number, month: number) {
  if (month === 1) return { year: Math.max(YEAR_RANGE.min, year - 1), month: 12 };
  return { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  if (month === 12) return { year: Math.min(YEAR_RANGE.max, year + 1), month: 1 };
  return { year, month: month + 1 };
}

function getYearPageStart(year: number) {
  const start = Math.floor((year - YEAR_RANGE.min) / YEARS_PER_PAGE) * YEARS_PER_PAGE + YEAR_RANGE.min;
  return Math.max(YEAR_RANGE.min, start);
}

// ── Component ──

export function DatePicker({ value, onChange, placeholder = 'yyyy.MM', disabled = false, mode = 'month' }: DatePickerProps) {
  const id = useId();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Picker internal state
  const parsed = parseDate(value, mode);
  const now = new Date();
  const [pickYear, setPickYear] = useState(parsed?.year ?? now.getFullYear());
  const [pickMonth, setPickMonth] = useState(parsed?.month ?? now.getMonth() + 1);
  const [pickDay, setPickDay] = useState(parsed?.day ?? now.getDate());

  // Sub-view state for the popover
  const [pickerView, setPickerView] = useState<PickerView>('calendar');
  const [yearPage, setYearPage] = useState(() => getYearPageStart(pickYear));

  useEffect(() => {
    if (mode !== 'date') return;
    const maximum = new Date(pickYear, pickMonth, 0).getDate();
    setPickDay(day => Math.min(day, maximum));
  }, [mode, pickMonth, pickYear]);

  // Reset picker state when opened
  useEffect(() => {
    if (open) {
      const p = parseDate(value, mode);
      const y = p?.year ?? now.getFullYear();
      setPickYear(y);
      setPickMonth(p?.month ?? now.getMonth() + 1);
      setPickDay(p?.day ?? now.getDate());
      setPickerView(mode === 'month' ? 'calendar' : 'calendar');
      setYearPage(getYearPageStart(y));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate fixed position via portal
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 270;
    const gap = 4;

    let left = rect.left;
    let top = rect.bottom + gap;
    let transformOrigin = 'top left';

    if (left + popoverWidth > window.innerWidth - 8) {
      left = rect.right - popoverWidth;
      transformOrigin = 'top right';
    }
    if (left < 8) left = 8;

    if (top + popoverHeight > window.innerHeight - 8) {
      top = rect.top - popoverHeight - gap;
      transformOrigin = transformOrigin === 'top left' ? 'bottom left' : 'bottom right';
    }

    setPopoverStyle({
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${left}px`,
      transformOrigin,
    });
  }, [open]);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useDismissibleLayer({
    open,
    refs: [containerRef, popoverRef],
    onDismiss: () => setOpen(false),
  });

  // Close when window narrows below editor auto-collapse threshold
  useEffect(() => {
    if (!open) return;
    const handler = () => {
      if (window.innerWidth < 1400) setOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [open]);

  // Keyboard navigation within popover
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerView !== 'calendar') {
          setPickerView('calendar');
        } else {
          setOpen(false);
        }
      }
      if (pickerView !== 'calendar') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const { year, month } = prevMonth(pickYear, pickMonth);
        setPickYear(year); setPickMonth(month);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const { year, month } = nextMonth(pickYear, pickMonth);
        setPickYear(year); setPickMonth(month);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, pickerView, pickYear, pickMonth]);

  const handleConfirm = useCallback(() => {
    const formatted = mode === 'date'
      ? `${pickYear}-${MONTHS[pickMonth - 1]}-${String(pickDay).padStart(2, '0')}`
      : `${pickYear}.${MONTHS[pickMonth - 1]}`;
    onChange(formatted);
    setInputValue(formatted);
    setOpen(false);
  }, [pickYear, pickMonth, pickDay, mode, onChange]);

  const handleInputBlur = useCallback(() => {
    const p = parseDate(inputValue, mode);
    if (p) {
      const formatted = mode === 'date'
        ? `${p.year}-${MONTHS[p.month - 1]}-${String(p.day).padStart(2, '0')}`
        : `${p.year}.${MONTHS[p.month - 1]}`;
      onChange(formatted);
      setInputValue(formatted);
    } else {
      onChange(inputValue.trim());
      setInputValue(inputValue.trim());
    }
  }, [inputValue, mode, onChange]);

  const handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  // Month navigation (cross-year aware)
  const goPrevMonth = () => {
    const { year, month } = prevMonth(pickYear, pickMonth);
    setPickYear(year); setPickMonth(month);
  };
  const goNextMonth = () => {
    const { year, month } = nextMonth(pickYear, pickMonth);
    setPickYear(year); setPickMonth(month);
  };

  // Year page navigation
  const goPrevYearPage = () => setYearPage(p => Math.max(YEAR_RANGE.min, p - YEARS_PER_PAGE));
  const goNextYearPage = () => setYearPage(p => Math.min(YEAR_RANGE.max - YEARS_PER_PAGE + 1, p + YEARS_PER_PAGE));

  // Select a month from the month picker → go back to calendar
  const selectMonth = (m: number) => {
    setPickMonth(m);
    setPickerView('calendar');
  };
  // Select a year from the year picker → go back to month picker
  const selectYear = (y: number) => {
    setPickYear(y);
    setPickerView('months');
  };

  // Open month/year picker from calendar
  const openMonthPicker = () => {
    if (mode === 'month') {
      // Month mode: go directly to year picker (months are already shown)
      setYearPage(getYearPageStart(pickYear));
      setPickerView('years');
    } else {
      setPickerView('months');
    }
  };

  const daysInMonth = new Date(pickYear, pickMonth, 0).getDate();
  const firstWeekday = new Date(pickYear, pickMonth - 1, 1).getDay();

  // ── Navigation button styles ──
  const navBtnClass = 'flex h-8 w-8 items-center justify-center rounded-[9px] text-gray-400 hover:bg-[#F5F7FB] hover:text-gray-600 active:bg-[#EEF4FF] dark:hover:bg-white/8 dark:hover:text-slate-300 transition-colors';
  const centerBtnClass = 'inline-flex items-center justify-center gap-1 min-w-[120px] h-9 px-2.5 rounded-[10px] bg-transparent text-[15px] font-semibold text-[#1f2937] hover:bg-[#F5F7FB] dark:text-slate-200 dark:hover:bg-white/8 whitespace-nowrap transition-colors';

  // ── Popover content ──
  const popover = (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className="z-[9999] field-more-menu-enter"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          if (pickerView !== 'calendar') setPickerView('calendar');
          else setOpen(false);
        }
      }}
    >
      <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-[0_12px_32px_rgba(15,23,42,0.10)] w-[200px] overflow-hidden">
        {/* ── Unified Navigation Header ── */}
        <div
          className="grid items-center px-2.5 pt-2.5 pb-2 border-b border-[#F1F5F9] dark:border-slate-800"
          style={{ gridTemplateColumns: '32px minmax(0,1fr) 32px' }}
        >
          {/* Left arrow */}
          <button
            type="button"
            aria-label={pickerView === 'years' ? '上一组年份' : '上个月'}
            onClick={() => {
              if (pickerView === 'years') goPrevYearPage();
              else goPrevMonth();
            }}
            className={navBtnClass}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Center: year-month label */}
          <button
            type="button"
            aria-label={mode === 'date' ? `选择年份和月份，当前为 ${pickYear} 年 ${pickMonth} 月` : `选择年份，当前为 ${pickYear} 年`}
            onClick={openMonthPicker}
            className={centerBtnClass}
          >
            <span>{t('date.yearLabel', { year: pickYear })}</span>
            {mode === 'date' && <span>{t('date.monthNumber', { month: pickMonth })}</span>}
            <ChevronDown size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
          </button>

          {/* Right arrow */}
          <button
            type="button"
            aria-label={pickerView === 'years' ? '下一组年份' : '下个月'}
            onClick={() => {
              if (pickerView === 'years') goNextYearPage();
              else goNextMonth();
            }}
            className={navBtnClass}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="p-3">
          {/* ── Calendar (main) view ── */}
          {pickerView === 'calendar' && (
            <>
              {mode === 'month' ? (
                /* Month grid for month-only mode */
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map((_, idx) => {
                    const m = idx + 1;
                    const selected = m === pickMonth;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setPickMonth(m); handleConfirm(); }}
                        className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/8'
                        }`}
                      >
                        {t('date.monthNumber', { month: m })}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Day grid for date mode */
                <>
                  <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-gray-400 dark:text-slate-500">
                    {WEEKDAYS.map(label => <span key={label}>{label}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: firstWeekday }).map((_, i) => <span key={`blank-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const selected = day === pickDay;
                      const today = pickYear === now.getFullYear() && pickMonth === now.getMonth() + 1 && day === now.getDate();
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setPickDay(day)}
                          className={`flex h-7 items-center justify-center rounded-lg text-[11px] font-medium transition-colors ${
                            selected ? 'bg-blue-500 text-white shadow-sm'
                            : today ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/35 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/8'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Month picker view ── */}
          {pickerView === 'months' && (
            <div>
              <button
                type="button"
                onClick={() => { setYearPage(getYearPageStart(pickYear)); setPickerView('years'); }}
                className="mb-3 inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[14px] font-semibold text-[#1f2937] hover:bg-[#F5F7FB] dark:text-slate-200 dark:hover:bg-white/8 transition-colors"
              >
                {t('date.yearLabel', { year: pickYear })}
                <ChevronDown size={13} className="text-gray-400 dark:text-slate-500" />
              </button>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((_, idx) => {
                  const m = idx + 1;
                  const selected = m === pickMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => selectMonth(m)}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        selected
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/8'
                      }`}
                    >
                      {t('date.monthNumber', { month: m })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Year picker view ── */}
          {pickerView === 'years' && (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
                const y = yearPage + i;
                if (y > YEAR_RANGE.max) return <span key={y} />;
                const selected = y === pickYear;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all tabular-nums ${
                      selected
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/8'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#F1F5F9] dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              const n = new Date();
              setPickYear(n.getFullYear());
              setPickMonth(n.getMonth() + 1);
              setPickDay(n.getDate());
              setPickerView('calendar');
            }}
            className="text-xs text-gray-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
          >
            {t('date.thisMonth')}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setInputValue('');
                setOpen(false);
              }}
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              {t('button.clear')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
            >
              <Check size={12} />
              {t('button.ok')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <div className="relative flex w-full min-w-0">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="field-input field-input--icon min-w-0 flex-1 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          tabIndex={-1}
          className="field-trigger absolute right-0 top-0 flex h-full w-10 shrink-0 items-center justify-center rounded-r-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500 disabled:opacity-50 dark:hover:bg-white/8"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && createPortal(popover, document.body)}
    </div>
  );
}
