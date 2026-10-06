import {
  DEFAULT_EXPIRY_TIMEZONE,
  formatInstantInTimezone,
} from "../lib/expiryDateTime.ts";
import { isLongTermExpiry } from "./billing.ts";

export interface RenewalServer {
  uuid: string;
  name: string;
  expiredAt: string;
  expiryTimezone?: string;
  price?: number;
  billingCycle?: number;
  currency?: string;
}

export interface RenewalMonthCell {
  date: string | null;
  day: number | null;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function renewalDayKey(expiredAt: string, timezone?: string): string | null {
  if (isLongTermExpiry(expiredAt)) return null;
  return formatInstantInTimezone(expiredAt, timezone || DEFAULT_EXPIRY_TIMEZONE)?.date ?? null;
}

export function monthCells(year: number, month: number): RenewalMonthCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const leading = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: RenewalMonthCell[] = [];
  for (let index = 0; index < leading; index += 1) cells.push({ date: null, day: null });
  for (let day = 1; day <= days; day += 1) {
    cells.push({ date: `${year}-${pad(month)}-${pad(day)}`, day });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

export function expiriesByDate(servers: readonly RenewalServer[]): Map<string, RenewalServer[]> {
  const grouped = new Map<string, RenewalServer[]>();
  for (const server of servers) {
    const date = renewalDayKey(server.expiredAt, server.expiryTimezone);
    if (!date) continue;
    const current = grouped.get(date);
    if (current) current.push(server);
    else grouped.set(date, [server]);
  }
  for (const list of grouped.values()) {
    list.sort((left, right) => left.name.localeCompare(right.name));
  }
  return grouped;
}

export function monthExpiryGroups(
  grouped: ReadonlyMap<string, RenewalServer[]>,
  year: number,
  month: number,
): Array<{ date: string; servers: RenewalServer[] }> {
  const prefix = `${year}-${pad(month)}-`;
  return [...grouped.entries()]
    .filter(([date]) => date.startsWith(prefix))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, servers]) => ({ date, servers }));
}
