
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}


export const adminTokens = {
  brand: '#2248FF',
  brandHover: '#1D3FE8',
  brandText: '#2454FF',
  brandSoft: '#EEF4FF',
  pageBg: '#F5F7FB',
  border: '#E6EAF2',
  title: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  subtle: '#94A3B8',
  hover: '#F8FAFF',
  chartGrid: '#E6EAF2',
  chartAxis: '#94A3B8',
  chartBlue: '#2248FF',
  chartBlueSoft: '#5B78FF',
  chartPurpleSoft: '#8B7CFF',
  chartBar: '#6B84FF',
};


export const adminCardClass =
  'rounded-2xl border border-[#E9EDF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_18px_rgba(16,24,40,0.04)] transition-[transform,box-shadow] duration-200 dark:border-slate-800 dark:bg-slate-900';


export const adminInputClass =
  'h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-700 transition-colors duration-200 placeholder:text-[#98A2B3] focus:border-[#425AEF] focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-[#FFC848] dark:focus:ring-0';


export const adminTableHeadClass =
  'bg-[#F8FAFC] text-xs font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400';


export const adminTableRowClass =
  'transition-colors hover:bg-[#F8FAFF] dark:hover:bg-slate-800/40';
