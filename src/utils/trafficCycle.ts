const BEIJING_TZ = "Asia/Shanghai";

export type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function cycleBoundary(year: number, month: number, resetDay: number): CalendarDay {
  const last = daysInMonth(year, month);
  return { year, month, day: resetDay > last ? last : resetDay };
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function beijingDay(now: Date): CalendarDay {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function isBeforeDay(left: CalendarDay, right: CalendarDay): boolean {
  if (left.year !== right.year) return left.year < right.year;
  if (left.month !== right.month) return left.month < right.month;
  return left.day < right.day;
}

export function normalizeTrafficResetDay(resetDay: number | null | undefined): number | null {
  const day = Number(resetDay);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  return day;
}

export function trafficResetCycleRange(
  resetDay: number | null | undefined,
  now: Date = new Date(),
): { start: CalendarDay; next: CalendarDay } | null {
  const day = normalizeTrafficResetDay(resetDay);
  if (day == null) return null;
  const today = beijingDay(now);
  let start = cycleBoundary(today.year, today.month, day);
  if (isBeforeDay(today, start)) {
    const previous = previousMonth(today.year, today.month);
    start = cycleBoundary(previous.year, previous.month, day);
  }
  const following = nextMonth(start.year, start.month);
  return { start, next: cycleBoundary(following.year, following.month, day) };
}

function formatMonthDay(value: CalendarDay): string {
  return `${value.month}月${value.day}日`;
}

export function formatTrafficResetRangeLabel(
  resetDay: number | null | undefined,
  now: Date = new Date(),
): string | null {
  const range = trafficResetCycleRange(resetDay, now);
  if (!range) return null;
  return `${formatMonthDay(range.start)} - ${formatMonthDay(range.next)}`;
}
