import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { DatePicker } from './DatePicker';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';

// 编辑面板控件主题样式（className + style 双路径）
export interface EditorAccentResult {
  className: {
    addHover: string;
  };
  style: object;
}

export function useAccentStyle(): EditorAccentResult {
  // 编辑面板始终使用固定的蓝色主题，不随简历主题变化
  const className: EditorAccentResult['className'] = {
    addHover: 'hover:border-blue-400 hover:text-blue-500',
  };
  return { className, style: {} };
}

export function StyledInput({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  size = 'sm',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();

  return (
    <div className={`field-item ${className}`}>
      {label && <label htmlFor={id} className={`text-gray-500 font-medium mb-2 block ${size === 'md' ? 'text-sm' : 'text-xs'}`}>{label}</label>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
    </div>
  );
}

export function StyledDateInput({
  label,
  value,
  onChange,
  placeholder = 'yyyy.MM',
  className = '',
  size = 'sm',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`field-item ${className}`}>
      <span className={`text-gray-500 font-medium mb-2 block ${size === 'md' ? 'text-sm' : 'text-xs'}`}>{label}</span>
      <DatePicker value={value} onChange={onChange} placeholder={placeholder} size={size} />
    </div>
  );
}

export function StyledComboInput({
  label,
  value,
  onChange,
  options,
  placeholder = '',
  className = '',
  size = 'sm',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => { setInputVal(value); }, [value]);

  useDismissibleLayer({
    open,
    refs: [containerRef, dropdownRef],
    onDismiss: () => setOpen(false),
  });

  // After open, measure position for portal
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  useLayoutEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.querySelector('input')?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  const handleSelect = (opt: string) => {
    setInputVal(opt);
    onChange(opt);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setInputVal(val);
    onChange(val);
  };

  return (
    <div ref={containerRef} className={`field-item ${className}`}>
      {label && <label htmlFor={id} className={`text-gray-500 font-medium mb-2 block ${size === 'md' ? 'text-sm' : 'text-xs'}`}>{label}</label>}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="field-input field-input--icon"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          tabIndex={-1}
          className={`field-trigger absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all ${open ? 'rotate-180 text-gray-500 bg-gray-100' : ''}`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-[9999] animate-fadeIn"
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 py-1 mt-1 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 transition-colors ${size === 'md' ? 'text-sm' : 'text-xs'} ${
                  opt === inputVal
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
