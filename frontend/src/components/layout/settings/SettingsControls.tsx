import { CheckCircle2,ChevronDown } from 'lucide-react';
import { useRef,useState } from 'react';
import type { SliderRange } from '../../../config/defaults';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { resolveLayout } from '../../../registry/layouts';
import { DEFAULT_CUSTOM_COLORS,ThemeSettings } from '../../../types/resume';


export function ThemeSignature({ theme }: { theme: ThemeSettings }) {
  const accent = (theme.customColors || DEFAULT_CUSTOM_COLORS).border;
  const signature = resolveLayout(theme.layoutId).signature;
  const isDoubleColumn = signature.layout === 'double-column';

  return (
    <div
      className="relative h-[56px] w-[44px] shrink-0 overflow-hidden rounded-[9px] border border-slate-200/90 bg-white shadow-[0_2px_7px_rgba(15,23,42,0.08)] dark:border-white/[0.10] dark:bg-slate-50"
      aria-hidden="true"
    >
      <svg className="h-full w-full" viewBox="0 0 44 56" fill="none">
        {signature.headerDecoration === 'solid-bar' && (
          <rect width="44" height="12" fill={accent} opacity="0.9" />
        )}
        {signature.headerDecoration === 'side-block' && (
          <rect width={isDoubleColumn ? 14 : 9} height="56" fill={accent} opacity="0.88" />
        )}
        {signature.headerDecoration === 'rings' && (
          <>
            <ellipse cx="5" cy="1" rx="25" ry="14" stroke={accent} strokeWidth="1.3" opacity="0.48" transform="rotate(-14 5 1)" />
            <ellipse cx="24" cy="0" rx="21" ry="11" stroke={accent} strokeWidth="1.2" opacity="0.3" transform="rotate(16 24 0)" />
          </>
        )}
        {signature.headerDecoration === 'wave' && (
          <path d="M0 0H44V8C35 15 17 14 0 8V0Z" fill={accent} opacity="0.9" />
        )}

        {isDoubleColumn && (
          <line x1="15" y1="17" x2="15" y2="50" stroke={accent} strokeWidth="0.8" opacity="0.35" />
        )}

        <g transform={`translate(${isDoubleColumn ? 19 : 6} ${signature.headerDecoration === 'solid-bar' || signature.headerDecoration === 'wave' ? 19 : 15})`}>
          {signature.sectionStyle === 'icon-line' && (
            <>
              <circle cx="2.5" cy="2.5" r="2.5" fill={accent} />
              <path d={`M7 2.5H${isDoubleColumn ? 18 : 30}`} stroke={accent} strokeWidth="1.2" />
              <circle cx="2.5" cy="16.5" r="2.5" fill={accent} />
              <path d={`M7 16.5H${isDoubleColumn ? 18 : 30}`} stroke={accent} strokeWidth="1.2" />
            </>
          )}
          {signature.sectionStyle === 'underline' && (
            <>
              <rect width={isDoubleColumn ? 10 : 14} height="3" rx="1.5" fill="#1E293B" />
              <path d={`M0 6H${isDoubleColumn ? 18 : 32}`} stroke={accent} strokeWidth="1.3" />
              <rect y="15" width={isDoubleColumn ? 9 : 12} height="3" rx="1.5" fill="#1E293B" />
              <path d={`M0 21H${isDoubleColumn ? 18 : 32}`} stroke={accent} strokeWidth="1.3" />
            </>
          )}
          {signature.sectionStyle === 'filled-title' && (
            <>
              <rect width={isDoubleColumn ? 18 : 32} height="6" rx="2" fill={accent} opacity="0.88" />
              <rect y="15" width={isDoubleColumn ? 18 : 32} height="6" rx="2" fill={accent} opacity="0.62" />
            </>
          )}
          {signature.sectionStyle === 'minimal' && (
            <>
              <rect width={isDoubleColumn ? 9 : 13} height="3" rx="1.5" fill="#0F172A" />
              <path d={`M0 6H${isDoubleColumn ? 18 : 32}`} stroke="#0F172A" strokeWidth="1" />
              <rect y="15" width={isDoubleColumn ? 8 : 11} height="3" rx="1.5" fill="#0F172A" />
              <path d={`M0 21H${isDoubleColumn ? 18 : 32}`} stroke="#0F172A" strokeWidth="1" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

// ---- Generic dropdown component replacing sliders ----
export function SettingDropdown({
  label,
  value,
  range,
  values,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  range: SliderRange;
  values?: number[];
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useOutsideClick({ open, refs: [containerRef], onOutsideClick: () => setOpen(false) });

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const estimatedHeight = 240; // rough max dropdown height in px
      const spaceBelow = window.innerHeight - rect.bottom;
      setAbove(spaceBelow < estimatedHeight);
    }
    setOpen(!open);
  };

  const items: number[] = values ?? Array.from(
    { length: Math.floor((range.max - range.min) / range.step) + 1 },
    (_, i) => range.min + i * range.step,
  );

  const menuPositionClass = above
    ? 'bottom-full mb-1 origin-bottom'
    : 'top-full mt-1 origin-top';

  return (
    <div>
      <span className="text-xs text-gray-500 mb-1.5 block">{label}</span>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white
                     hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent-soft)]
                     focus:outline-none
                     transition-colors"
        >
          <span>{formatValue(value)}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            className={`absolute left-0 right-0 ${menuPositionClass} bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 duration-150`}
            style={{ animation: 'fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out' }}
          >
            {items.map((v) => {
              const selected = Math.abs(value - v) < 0.001;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    selected
                      ? 'text-[var(--theme-accent)] bg-[var(--theme-accent-soft)] font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="w-4 flex-shrink-0 flex items-center justify-center">
                    {selected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--theme-accent)]" />}
                  </span>
                  {formatValue(v)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

