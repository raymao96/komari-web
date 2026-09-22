export type TrafficResetTimezoneOption = {
  value: string;
  label: string;
};

const PREFERRED_TIMEZONES = [
  "Asia/Shanghai",
  "UTC",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
] as const;

const CANONICAL_ALIASES = [
  "Asia/Kolkata",
  "Asia/Ho_Chi_Minh",
  "Europe/Kyiv",
] as const;

const UTC_ALIASES = new Set([
  "Etc/UTC",
  "Etc/GMT",
  "Etc/GMT0",
  "Etc/GMT+0",
  "Etc/GMT-0",
  "Etc/UCT",
  "Etc/Universal",
  "Etc/Zulu",
  "Etc/Greenwich",
  "GMT",
  "GMT+0",
  "GMT-0",
  "UCT",
  "Universal",
  "Zulu",
  "Greenwich",
]);

function formatTimezoneOffset(zone: string, now: Date): string {
  if (zone === "UTC" || UTC_ALIASES.has(zone)) {
    return "UTC";
  }
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value;
    if (!name) return "";
    const offset = name.replace(/^GMT/, "UTC");
    if (offset === "UTC" || offset === "UTC+0" || offset === "UTC-0") return "UTC+0";
    return offset;
  } catch {
    return "";
  }
}

export function formatTimezoneLabel(zone: string, now = new Date()): string {
  const offset = formatTimezoneOffset(zone, now);
  return offset ? `${zone} (${offset})` : zone;
}

function listSupportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  if (typeof intl.supportedValuesOf !== "function") return [];
  try {
    return intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

export function listTrafficResetTimezones(
  now = new Date(),
): TrafficResetTimezoneOption[] {
  const zones = new Set<string>(listSupportedTimeZones());
  for (const zone of PREFERRED_TIMEZONES) {
    zones.add(zone);
  }
  for (const zone of CANONICAL_ALIASES) {
    zones.add(zone);
  }
  for (const alias of UTC_ALIASES) {
    zones.delete(alias);
  }
  zones.add("UTC");

  const preferred = PREFERRED_TIMEZONES.filter((zone) => zones.has(zone));
  const preferredSet = new Set<string>(preferred);
  const rest = [...zones]
    .filter((zone) => !preferredSet.has(zone))
    .sort((left, right) => left.localeCompare(right));

  return [...preferred, ...rest].map((value) => ({
    value,
    label: formatTimezoneLabel(value, now),
  }));
}

export const TRAFFIC_RESET_TIMEZONES: TrafficResetTimezoneOption[] =
  listTrafficResetTimezones();

export function normalizeTrafficResetTime(value: string | null | undefined): string {
  const match = String(value || "00:00:00").trim().match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return "00:00:00";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) return "00:00:00";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export function normalizeTrafficResetTimezone(value: string | null | undefined): string {
  let timezone = String(value || "").trim();
  const labeled = timezone.match(/^(.*)\s+\((?:UTC|GMT)[^)]*\)$/);
  if (labeled?.[1]) timezone = labeled[1].trim();
  if (!timezone) return "Asia/Shanghai";
  return UTC_ALIASES.has(timezone) ? "UTC" : timezone;
}
