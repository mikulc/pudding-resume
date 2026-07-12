import { useState, useRef, useEffect, useCallback, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useOutsideClick } from '../../hooks/useOutsideClick';

/* ===================== Color Conversion Utilities ===================== */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr: h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6; break;
      case gg: h = ((bb - rr) / d + 2) / 6; break;
      case bb: h = ((rr - gg) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const ss = s / 100, ll = l / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return rgbToHex(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255));
}

function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

function normalizeHex(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return `#${hex.toUpperCase()}`;
}

/* ===================== ColorPicker Props ===================== */

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

const POPOVER_WIDTH = 220;
const POPOVER_ESTIMATED_HEIGHT = 236;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* ===================== ColorPicker Component ===================== */

export function ColorPicker({ value, onChange, size = 'sm' }: ColorPickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, maxHeight: POPOVER_ESTIMATED_HEIGHT });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  const updatePopoverPosition = useCallback(() => {
    if (!containerRef.current) return;

    const triggerRect = containerRef.current.getBoundingClientRect();
    const popoverWidth = popoverRef.current?.offsetWidth || POPOVER_WIDTH;
    const popoverHeight = popoverRef.current?.offsetHeight || POPOVER_ESTIMATED_HEIGHT;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const enoughRight = triggerRect.left + popoverWidth + VIEWPORT_PADDING <= viewportWidth;
    const enoughLeft = triggerRect.right - popoverWidth >= VIEWPORT_PADDING;
    const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - popoverWidth - VIEWPORT_PADDING);
    const left = enoughRight
      ? triggerRect.left
      : enoughLeft
        ? triggerRect.right - popoverWidth
        : clamp(triggerRect.left, VIEWPORT_PADDING, maxLeft);

    const belowTop = triggerRect.bottom + POPOVER_GAP;
    const aboveTop = triggerRect.top - popoverHeight - POPOVER_GAP;
    const enoughBelow = belowTop + popoverHeight + VIEWPORT_PADDING <= viewportHeight;
    const enoughAbove = aboveTop >= VIEWPORT_PADDING;
    const maxTop = Math.max(VIEWPORT_PADDING, viewportHeight - popoverHeight - VIEWPORT_PADDING);
    const top = enoughBelow
      ? belowTop
      : enoughAbove
        ? aboveTop
        : clamp(belowTop, VIEWPORT_PADDING, maxTop);

    setPopoverPosition({
      left,
      top,
      maxHeight: Math.max(160, viewportHeight - (VIEWPORT_PADDING * 2)),
    });
  }, []);

  // Keep hex input in sync when value changes externally
  useEffect(() => {
    setHexInput(value);
  }, [value]);

  useOutsideClick({
    open,
    refs: [containerRef, popoverRef],
    onOutsideClick: () => setOpen(false),
  });

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  // Initialize from current value
  const initialHsl = hexToHsl(value);
  const [hue, setHue] = useState(initialHsl.h);
  const [saturation, setSaturation] = useState(initialHsl.s);
  const [lightness, setLightness] = useState(initialHsl.l);

  // Reset internal state when opening
  const handleOpen = useCallback(() => {
    const hsl = hexToHsl(value);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    setHexInput(value);
    updatePopoverPosition();
    setOpen(true);
  }, [updatePopoverPosition, value]);

  const commitColor = useCallback((h: number, s: number, l: number) => {
    const hex = hslToHex(h, s, l);
    onChange(hex);
    setHexInput(hex);
  }, [onChange]);

  // ---- Hue Slider interaction ----
  const hueRef = useRef<HTMLDivElement>(null);
  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    updateHueFromEvent(e);
    const onMove = (ev: MouseEvent) => { ev.preventDefault(); updateHueFromEvent(ev); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const updateHueFromEvent = (e: { clientX: number } | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const h = Math.round((x / rect.width) * 360);
    setHue(h);
    commitColor(h, saturation, lightness);
  };

  // ---- Saturation-Lightness Panel interaction ----
  const panelRef = useRef<HTMLDivElement>(null);
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    updatePanelFromEvent(e);
    const onMove = (ev: MouseEvent) => { ev.preventDefault(); updatePanelFromEvent(ev); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const updatePanelFromEvent = (e: { clientX: number; clientY: number } | React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const s = Math.round((x / rect.width) * 100);
    const l = Math.round(100 - (y / rect.height) * 100);
    setSaturation(s);
    setLightness(l);
    commitColor(hue, s, l);
  };

  // ---- HEX Input ----
  const handleHexSubmit = () => {
    let hex = hexInput.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (isValidHex(hex)) {
      const normalized = normalizeHex(hex);
      const hsl = hexToHsl(normalized);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      onChange(normalized);
      setHexInput(normalized);
    } else {
      setHexInput(value);
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHexSubmit();
    }
  };

  // Current preview color
  const currentColor = hslToHex(hue, saturation, lightness);
  const pureHue = hslToHex(hue, 100, 50);

  return (
    <div ref={containerRef} className="relative inline-block">

      {/* ---- Trigger Button ---- */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className={`${triggerSize} rounded-full bg-gradient-to-br from-red-400 via-purple-400 to-blue-400 border border-gray-300 hover:scale-110 transition-transform focus:outline-none relative`}
      >
        <span className="absolute inset-0 rounded-full"
          style={{ backgroundColor: currentColor, maskImage: 'radial-gradient(circle at 30% 30%, transparent 20%, black 21%)', WebkitMaskImage: 'radial-gradient(circle at 30% 30%, transparent 20%, black 21%)' }}
        />
      </button>

      {/* ---- Dropdown Panel ---- */}
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[10030] bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-[220px] overflow-y-auto"
          style={{
            left: popoverPosition.left,
            top: popoverPosition.top,
            maxHeight: popoverPosition.maxHeight,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Saturation-Lightness Panel */}
          <div
            ref={panelRef}
            onMouseDown={handlePanelMouseDown}
            className="relative w-full h-[140px] rounded-lg cursor-crosshair mb-2 overflow-hidden"
            style={{ background: pureHue }}
          >
            {/* White gradient (horizontal: white -> transparent) to control saturation */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, #fff, transparent)' }}
            />
            {/* Black gradient (vertical: transparent -> black) to control lightness */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, #000, transparent)' }}
            />
            {/* Cursor */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                backgroundColor: currentColor,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.3)',
              }}
            />
          </div>

          {/* Hue Slider */}
          <div
            ref={hueRef}
            onMouseDown={handleHueMouseDown}
            className="relative w-full h-3 rounded-full cursor-pointer mb-2.5"
            style={{
              background: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)',
            }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none"
              style={{
                left: `${(hue / 360) * 100}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
              }}
            />
          </div>

          {/* Preview + HEX Input */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md border border-gray-300 shadow-sm flex-shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <div className="flex-1 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">#</span>
              <input
                id={id}
                type="text"
                value={hexInput.replace('#', '')}
                onChange={(e) => setHexInput(e.target.value.toUpperCase())}
                onBlur={handleHexSubmit}
                onKeyDown={handleHexKeyDown}
                maxLength={6}
                className="w-full pl-5 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono uppercase"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
