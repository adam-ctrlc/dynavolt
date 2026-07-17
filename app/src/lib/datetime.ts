const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * "July 17, 2026 6:08 PM".
 *
 * Built by hand rather than with toLocaleString: on Android the locale data can
 * fall back to a numeric format like 17/7/2026 and a lowercase "pm".
 */
export function formatDateTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '--';

  const month = MONTHS[at.getMonth()];
  const day = at.getDate();
  const year = at.getFullYear();
  const { hour, meridiem } = twelveHour(at.getHours());
  const minute = String(at.getMinutes()).padStart(2, '0');

  return `${month} ${day}, ${year} ${hour}:${minute} ${meridiem}`;
}

/** "July 17, 6:08 PM" — same clock, no year, for dense rows. */
export function formatShortDateTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '--';

  const month = MONTHS[at.getMonth()];
  const day = at.getDate();
  const { hour, meridiem } = twelveHour(at.getHours());
  const minute = String(at.getMinutes()).padStart(2, '0');

  return `${month} ${day}, ${hour}:${minute} ${meridiem}`;
}

/** "Jul 17" — compact enough for a chart axis. */
export function formatDayLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '--';

  return `${MONTHS[at.getMonth()].slice(0, 3)} ${at.getDate()}`;
}

function twelveHour(hours: number) {
  const meridiem = hours < 12 ? 'AM' : 'PM';
  const hour = hours % 12 === 0 ? 12 : hours % 12;

  return { hour, meridiem };
}
