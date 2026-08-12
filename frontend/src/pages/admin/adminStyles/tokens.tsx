
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}


export const adminTokens = {
  brand: 'var(--theme-accent)',
  brandHover: 'var(--primary-hover)',
  brandText: 'var(--theme-accent)',
  brandSoft: 'var(--theme-accent-soft)',
  pageBg: 'var(--bg-page)',
  border: 'var(--border-soft)',
  title: 'var(--text-primary)',
  body: 'var(--text-secondary)',
  muted: 'var(--text-secondary)',
  subtle: 'var(--text-muted)',
  hover: 'var(--bg-hover)',
  chartGrid: 'var(--border-soft)',
  chartAxis: 'var(--text-muted)',
  chartBlue: 'var(--theme-accent)',
  chartBlueSoft: 'var(--theme-accent)',
  chartPurpleSoft: 'var(--theme-accent)',
  chartBar: 'var(--theme-accent)',
};


export const adminCardClass =
  'rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-200 dark:border-white/[0.08] dark:bg-white/[0.045]';


export const adminInputClass =
  'h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-700 transition-colors duration-200 placeholder:text-[#98A2B3] focus:border-[var(--theme-accent)] focus:outline-none focus:ring-0 dark:border-white/[0.1] dark:bg-white/[0.045] dark:text-slate-200 dark:focus:border-[var(--theme-accent)] dark:focus:ring-0';


export const adminTableHeadClass =
  'bg-[#F9FAFB] text-xs font-semibold text-slate-500 dark:bg-white/[0.035] dark:text-slate-400';


export const adminTableRowClass =
  'transition-colors hover:bg-[var(--theme-accent-soft)] dark:hover:bg-white/[0.035]';
