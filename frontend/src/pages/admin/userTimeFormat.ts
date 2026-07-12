/**
 * Mobile-friendly time formatting.
 * - Today → "今天 HH:mm"
 * - Yesterday → "昨天 HH:mm"
 * - This year → "M月D日 HH:mm"
 * - Older → "YYYY-MM-DD"
 */
export function formatMobileTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (targetDay.getTime() === today.getTime()) {
    return `今天 ${hm}`;
  }
  if (targetDay.getTime() === yesterday.getTime()) {
    return `昨天 ${hm}`;
  }
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Short display for card summaries (without seconds) */
export function formatMobileTimeShort(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (targetDay.getTime() === today.getTime()) {
    return hm;
  }
  if (targetDay.getTime() === yesterday.getTime()) {
    return `昨天 ${hm}`;
  }
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
