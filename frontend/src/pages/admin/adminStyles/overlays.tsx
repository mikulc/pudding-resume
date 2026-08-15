import { X } from 'lucide-react';
import type { MouseEvent,ReactNode,TouchEvent as ReactTouchEvent } from 'react';
import { useCallback,useEffect,useRef } from 'react';
import { createPortal } from 'react-dom';
import { AdminIconButton } from './primitives';
import { cn } from './tokens';

export function AdminModal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.34)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* Content */}
      <AdminModalShell className={cn('relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[adminModalIn_200ms_ease-out]', className)} onClick={event => event.stopPropagation()}>
        {children}
      </AdminModalShell>
    </div>,
    document.body,
  );
}


export function AdminModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      <AdminIconButton onClick={onClose} aria-label="Close"><X size={18} /></AdminIconButton>
    </div>
  );
}


export function AdminModalShell({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-[#E6EAF2] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}


// ── AdminFormModal (desktop: centered dialog with fixed header/footer) ──
export function AdminFormModal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.30)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full animate-[adminModalIn_200ms_ease-out]',
          'flex flex-col overflow-hidden',
          'rounded-[20px] border border-[rgba(31,45,61,0.08)] bg-white',
          'shadow-[0_24px_70px_rgba(15,23,42,0.16)]',
          'dark:border-slate-800 dark:bg-slate-900',
          className,
        )}
        style={{
          width: 'min(560px, calc(100vw - 40px))',
          maxHeight: 'min(760px, calc(100dvh - 48px))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Right-side drawer for long admin forms. Header/footer remain fixed while the
// form body scrolls independently, leaving the underlying list as context.
export function AdminFormDrawer({
  open,
  onClose,
  closeOnBackdrop = true,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-end"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.26)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex h-full w-full flex-col overflow-hidden bg-white',
          'border-l border-[rgba(31,45,61,0.08)] shadow-[-20px_0_60px_rgba(15,23,42,0.14)]',
          'animate-[adminDrawerIn_260ms_cubic-bezier(0.22,1,0.36,1)]',
          'dark:border-slate-800 dark:bg-slate-900',
          'sm:max-w-[680px]',
          className,
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}


export function AdminFormModalHeader({
  title,
  onClose,
  showCloseButton = true,
}: {
  title: string;
  onClose: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between px-[22px] pt-[20px] pb-[16px]">
        <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">
          {title}
        </h3>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-slate-400',
              'transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600',
              'dark:hover:bg-slate-800 dark:hover:text-slate-300',
            )}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="mx-[22px] border-b border-[rgba(31,45,61,0.06)] dark:border-slate-800" />
    </div>
  );
}


export function AdminFormModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-[22px] py-[18px]', className)}>
      {children}
    </div>
  );
}


export function AdminFormModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-[rgba(31,45,61,0.06)] bg-white/95 px-[22px] pt-[14px] pb-[18px] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      {children}
    </div>
  );
}


// ── AdminBottomSheet (mobile bottom sheet) ──
export function AdminBottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    // Only dismiss when dragging the header/handle area or when at scroll top
    const scrollable = sheetRef.current?.querySelector('[data-sheet-scroll]');
    if (scrollable && scrollable.scrollTop > 0) return;
    dragging.current = true;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    const diff = currentY.current - startY.current;
    sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.32,0.72,0,1)';
    if (diff > 80) {
      onClose();
    } else {
      sheetRef.current.style.transform = '';
    }
  }, [onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.30)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <div
        ref={sheetRef}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden',
          'rounded-t-[22px] border border-b-0 border-[rgba(31,45,61,0.08)] bg-white',
          'shadow-[0_-8px_40px_rgba(15,23,42,0.12)]',
          'dark:border-slate-800 dark:bg-slate-900',
          'animate-[adminSheetUp_280ms_cubic-bezier(0.32,0.72,0,1)]',
        )}
        style={{
          maxHeight: 'calc(100dvh - 16px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
