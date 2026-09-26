const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function shiftCalendar(
  year: number,
  month: number,
  day: number,
  years: number,
  months: number,
  days: number,
): string {
  const shifted = new Date(Date.UTC(year + years, month - 1 + months, day + days));
  const nextYear = String(shifted.getUTCFullYear()).padStart(4, "0");
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(shifted.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

// advanceBillingExpiry matches Lite auto-renewal: preset cycles move by calendar
// month or year, and any other positive cycle adds that many days.
export function advanceBillingExpiry(baseDate: string, billingCycle: number): string | null {
  const match = DATE_INPUT_PATTERN.exec(baseDate.trim());
  if (!match || !(billingCycle > 0)) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  if (billingCycle >= 27 && billingCycle <= 32) {
    return shiftCalendar(year, month, day, 0, 1, 0);
  }
  if (billingCycle >= 87 && billingCycle <= 95) {
    return shiftCalendar(year, month, day, 0, 3, 0);
  }
  if (billingCycle >= 175 && billingCycle <= 185) {
    return shiftCalendar(year, month, day, 0, 6, 0);
  }
  if (billingCycle >= 360 && billingCycle <= 370) {
    return shiftCalendar(year, month, day, 1, 0, 0);
  }
  if (billingCycle >= 720 && billingCycle <= 750) {
    return shiftCalendar(year, month, day, 2, 0, 0);
  }
  if (billingCycle >= 1080 && billingCycle <= 1150) {
    return shiftCalendar(year, month, day, 3, 0, 0);
  }
  if (billingCycle >= 1800 && billingCycle <= 1850) {
    return shiftCalendar(year, month, day, 5, 0, 0);
  }
  return shiftCalendar(year, month, day, 0, 0, billingCycle);
}
