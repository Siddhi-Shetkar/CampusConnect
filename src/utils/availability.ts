export type AvailabilityMode = 'time' | 'flexible' | 'unset';

export interface TimePreset {
  label: string;
  start: string; // HH:MM (24-hour)
  end: string; // HH:MM (24-hour)
}

export const TIME_PRESETS: TimePreset[] = [
  { label: '6 AM – 8 AM', start: '06:00', end: '08:00' },
  { label: '4 PM – 6 PM', start: '16:00', end: '18:00' },
  { label: '6 PM – 8 PM', start: '18:00', end: '20:00' },
  { label: '7 PM – 9 PM', start: '19:00', end: '21:00' },
  { label: '8 PM – 10 PM', start: '20:00', end: '22:00' },
];

export const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const FULL_MONTHS = [
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
] as const;

export interface ParsedAvailability {
  mode: AvailabilityMode;
  date: string; // YYYY-MM-DD or ''
  startTime: string; // HH:MM (24-hour)
  endTime: string; // HH:MM (24-hour)
}

export function toLocalDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayISO(): string {
  return toLocalDateISO(new Date());
}

export function addDaysISO(baseISO: string, offsetDays: number): string {
  const parts = baseISO.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toLocalDateISO(d);
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + offsetDays);
  return toLocalDateISO(d);
}

export function isValidDateISO(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

export function formatDateISOToDisplay(dateISO: string): string {
  if (!isValidDateISO(dateISO)) return '';
  const [y, m, d] = dateISO.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

export function parseDateFromString(raw: string): string {
  if (!raw) return '';

  // Match "Nov 22, 2026" or "Nov 22 2026"
  const namedMatch = raw.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i
  );
  if (namedMatch) {
    const monthPrefix = namedMatch[1].slice(0, 3).toLowerCase();
    const monthIdx = SHORT_MONTHS.findIndex((m) => m.toLowerCase() === monthPrefix);
    if (monthIdx !== -1) {
      const year = Number(namedMatch[3]);
      const day = Number(namedMatch[2]);
      const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (isValidDateISO(iso)) return iso;
    }
  }

  // Match "2026-11-22"
  const isoMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch && isValidDateISO(isoMatch[1])) {
    return isoMatch[1];
  }

  return '';
}

export function time24ToMinutes(time24: string): number | null {
  const m = time24.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = time24ToMinutes(startTime);
  const end = time24ToMinutes(endTime);
  if (start === null || end === null) return false;
  // Allow midnight ("00:00") as end of day when starting in afternoon/evening
  const effectiveEnd = end === 0 && start > 0 ? 24 * 60 : end;
  return effectiveEnd > start;
}

export function formatTime24To12(time24: string): string {
  const m = time24.match(/^(\d{2}):(\d{2})$/);
  if (!m) return time24;
  const h24 = Number(m[1]);
  const min = Number(m[2]);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minPart = min === 0 ? '' : `:${String(min).padStart(2, '0')}`;
  return `${h12}${minPart} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  return `${formatTime24To12(startTime)} – ${formatTime24To12(endTime)}`;
}

export function buildAvailabilityString(
  mode: AvailabilityMode,
  date: string,
  startTime: string,
  endTime: string
): string {
  if (mode === 'unset') return '';
  if (mode === 'flexible') return 'Flexible';
  const range = formatTimeRange(startTime, endTime);
  if (!range) return '';
  const dateDisplay = date ? formatDateISOToDisplay(date) : '';
  if (dateDisplay) {
    return `${dateDisplay} · ${range}`;
  }
  return range;
}

function toHHMM(hourRaw: number, minRaw: number, period: string): string {
  let h = hourRaw;
  const p = period.toLowerCase();
  if (p === 'pm' && h < 12) h += 12;
  if (p === 'am' && h === 12) h = 0;
  h = Math.max(0, Math.min(23, h));
  const m = Math.max(0, Math.min(59, minRaw));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseAvailabilityString(
  raw: string,
  fallbackStart = '19:00',
  fallbackEnd = '21:00',
  fallbackDate = ''
): ParsedAvailability {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return {
      mode: 'unset',
      date: fallbackDate,
      startTime: fallbackStart,
      endTime: fallbackEnd,
    };
  }

  const date = parseDateFromString(trimmed);

  // Strip any ISO date before matching time ranges so YYYY-MM-DD hyphens don't confuse the time regex
  const withoutIsoDate = trimmed.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');

  const rangeMatch = withoutIsoDate.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );

  if (rangeMatch) {
    const startRaw = Number(rangeMatch[1]);
    const startMin = rangeMatch[2] ? Number(rangeMatch[2]) : 0;
    const endRaw = Number(rangeMatch[4]);
    const endMin = rangeMatch[5] ? Number(rangeMatch[5]) : 0;
    const endPeriod = (rangeMatch[6] || '').toLowerCase();
    const startPeriod = (rangeMatch[3] || endPeriod).toLowerCase();

    return {
      mode: 'time',
      date,
      startTime: toHHMM(startRaw, startMin, startPeriod),
      endTime: toHHMM(endRaw, endMin, endPeriod || startPeriod),
    };
  }

  if (date) {
    return {
      mode: 'time',
      date,
      startTime: fallbackStart,
      endTime: fallbackEnd,
    };
  }

  return {
    mode: 'flexible',
    date: '',
    startTime: fallbackStart,
    endTime: fallbackEnd,
  };
}
