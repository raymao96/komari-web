import {
  formatTimezoneLabel,
  normalizeTrafficResetTimezone,
  TRAFFIC_RESET_TIMEZONES,
} from "../utils/trafficResetTimezones.ts";

const LOCAL_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export const DEFAULT_EXPIRY_TIMEZONE = "Asia/Shanghai";

export function normalizeExpiryTimezone(value: string | null | undefined): string {
  return normalizeTrafficResetTimezone(value || DEFAULT_EXPIRY_TIMEZONE);
}

export function probeDateForTimezoneOffset(date: string): Date {
  const match = DATE_PATTERN.exec(date.trim());
  if (!match) return new Date();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function expiryTimezoneOptions(date: string) {
  const probe = probeDateForTimezoneOffset(date);
  return TRAFFIC_RESET_TIMEZONES.map((zone) => ({
    value: zone.value,
    label: formatTimezoneLabel(zone.value, probe),
  }));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function padYear(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return digits.padStart(4, "0");
}

export function formatInstantInTimezone(
  value: string | number | Date | null | undefined,
  timeZone: string,
): { date: string; time: string } | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const zone = normalizeExpiryTimezone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || "";
    const yearRaw = read("year");
    const monthRaw = read("month");
    const dayRaw = read("day");
    if (!yearRaw || !monthRaw || !dayRaw) return null;
    const year = padYear(yearRaw);
    const month = pad(Number(monthRaw));
    const day = pad(Number(dayRaw));
    const hour = pad(Number(read("hour")) % 24);
    const minute = pad(Number(read("minute")));
    const second = pad(Number(read("second")));
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}:${second}`,
    };
  } catch {
    return formatInstantInTimezone(value, DEFAULT_EXPIRY_TIMEZONE);
  }
}

export function toExpiryLocalDateTime(date: string, time: string): string | null {
  const dateMatch = DATE_PATTERN.exec(date.trim());
  const timeMatch = TIME_PATTERN.exec(time.trim() || "00:00:00");
  if (!dateMatch || !timeMatch) return null;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function formatExpiryLocalDisplay(
  value: string | number | Date | null | undefined,
  timeZone?: string | null,
): string {
  const parts = formatInstantInTimezone(value, timeZone || DEFAULT_EXPIRY_TIMEZONE);
  if (!parts) return "";
  return `${parts.date} ${parts.time} ${normalizeExpiryTimezone(timeZone)}`;
}

export function expiryFieldsIfChanged(input: {
  timezone: string;
  localDateTime: string | null;
  openedTimezone: string;
  openedLocal: string;
}): { expiry_timezone: string; expiry_local_datetime: string } | "invalid" | null {
  const timezone = normalizeExpiryTimezone(input.timezone);
  const local = input.localDateTime || "";
  if (timezone === input.openedTimezone && local === input.openedLocal) {
    return null;
  }
  if (!input.localDateTime) return "invalid";
  return {
    expiry_timezone: timezone,
    expiry_local_datetime: input.localDateTime,
  };
}

export function billingSaveFollowUp(ok: boolean): {
  ok: boolean;
  close: boolean;
  refresh: boolean;
  toastSuccess: boolean;
} {
  return { ok, close: ok, refresh: ok, toastSuccess: ok };
}

export function earlyRenewPayload(expiredAt: string): {
  renew_expiry: true;
  _match_expired_at: string;
} {
  return { renew_expiry: true, _match_expired_at: expiredAt };
}

export function splitExpiryLocalDateTime(value: string): { date: string; time: string } | null {
  const match = LOCAL_DATETIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}:${match[6]}`,
  };
}
