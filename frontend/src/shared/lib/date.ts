export function formatDate(value?: string | Date | null): string {
  if (!value) {
    return '\u2014';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '\u2014';
  }
  return new Intl.DateTimeFormat('ru-RU').format(date);
}
