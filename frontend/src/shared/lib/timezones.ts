export const DEFAULT_TIMEZONE = 'UTC';

export function formatTimezoneUtcOffset(timeZone: string, date = new Date()): string {
  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;

  if (!offsetPart || offsetPart === 'GMT') {
    return '(+0)';
  }

  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offsetPart);
  if (!match) {
    return '';
  }

  const [, sign, hours, minutes] = match;
  const numericHours = String(Number(hours));
  return minutes === '00' ? `(${sign}${numericHours})` : `(${sign}${numericHours}:${minutes})`;
}

export const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Midway', label: 'Мидуэй (Pacific/Midway)' },
  { value: 'Pacific/Tahiti', label: 'Таити (Pacific/Tahiti)' },
  { value: 'Pacific/Gambier', label: 'Гамбье (Pacific/Gambier)' },
  { value: 'America/Anchorage', label: 'Анкоридж (America/Anchorage)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (America/Los_Angeles)' },
  { value: 'America/Mexico_City', label: 'Мехико (America/Mexico_City)' },
  { value: 'America/Jamaica', label: 'Ямайка (America/Jamaica)' },
  { value: 'America/New_York', label: 'Нью-Йорк (America/New_York)' },
  { value: 'America/Sao_Paulo', label: 'Сан-Паулу (America/Sao_Paulo)' },
  { value: 'Atlantic/South_Georgia', label: 'Южная Георгия (Atlantic/South_Georgia)' },
  { value: 'Atlantic/Cape_Verde', label: 'Кабо-Верде (Atlantic/Cape_Verde)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Лондон (Europe/London)' },
  { value: 'Europe/Paris', label: 'Париж (Europe/Paris)' },
  { value: 'Europe/Moscow', label: 'Москва, Санкт-Петербург (Europe/Moscow)' },
  { value: 'Asia/Dubai', label: 'Дубай (Asia/Dubai)' },
  { value: 'Asia/Almaty', label: 'Алматы (Asia/Almaty)' },
  { value: 'Asia/Omsk', label: 'Омск (Asia/Omsk)' },
  { value: 'Asia/Bangkok', label: 'Бангкок (Asia/Bangkok)' },
  { value: 'Asia/Hong_Kong', label: 'Гонконг (Asia/Hong_Kong)' },
  { value: 'Asia/Tokyo', label: 'Токио (Asia/Tokyo)' },
  { value: 'Australia/Sydney', label: 'Сидней (Australia/Sydney)' },
  { value: 'Asia/Sakhalin', label: 'Сахалин (Asia/Sakhalin)' },
  { value: 'Pacific/Fiji', label: 'Фиджи (Pacific/Fiji)' },
] as const;
