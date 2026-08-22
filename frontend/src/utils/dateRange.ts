export function formatDateRange(startDate: string, endDate: string): string {
  return [startDate, endDate]
    .map((date) => date.trim())
    .filter(Boolean)
    .join(' - ');
}
