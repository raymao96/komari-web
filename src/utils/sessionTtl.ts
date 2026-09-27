export const DEFAULT_SESSION_TTL_SECONDS = 86_400;
export const MIN_SESSION_TTL_SECONDS = 60;
export const MAX_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SessionTtlUnit = "minutes" | "hours" | "days";

export function clampSessionTtlSeconds(value: number) {
  if (!Number.isFinite(value) || value < MIN_SESSION_TTL_SECONDS) {
    return MIN_SESSION_TTL_SECONDS;
  }
  if (value > MAX_SESSION_TTL_SECONDS) return MAX_SESSION_TTL_SECONDS;
  return Math.floor(value);
}

export function splitSessionTtl(seconds: number): {
  amount: number;
  unit: SessionTtlUnit;
} {
  const value = clampSessionTtlSeconds(seconds || DEFAULT_SESSION_TTL_SECONDS);
  if (value === DEFAULT_SESSION_TTL_SECONDS) {
    return { amount: 24, unit: "hours" };
  }
  if (value % 86_400 === 0) {
    return { amount: value / 86_400, unit: "days" };
  }
  if (value % 3_600 === 0) {
    return { amount: value / 3_600, unit: "hours" };
  }
  return { amount: Math.max(1, Math.round(value / 60)), unit: "minutes" };
}

export function sessionTtlInputToSeconds(amount: number, unit: SessionTtlUnit) {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
    return null;
  }
  const seconds =
    unit === "days" ? amount * 86_400 : unit === "hours" ? amount * 3_600 : amount * 60;
  if (seconds < MIN_SESSION_TTL_SECONDS || seconds > MAX_SESSION_TTL_SECONDS) {
    return null;
  }
  return seconds;
}

const ACTIVITY_FLOOR_MS = Date.parse("2000-01-01T00:00:00Z");

function parseActivityMs(value?: string): number {
  const ms = Date.parse(value || "");
  if (!Number.isFinite(ms) || ms <= 0 || ms < ACTIVITY_FLOOR_MS) return Number.NaN;
  return ms;
}

/** Same clock as server idle logout: latest_online, else created_at. */
export function sessionLastActivityMs(session: {
  latest_online?: string;
  created_at?: string;
}): number {
  const latest = parseActivityMs(session.latest_online);
  if (Number.isFinite(latest)) return latest;
  return parseActivityMs(session.created_at);
}

/** Auto-logout instant: last activity + TTL, never later than stored expires or now+TTL. */
export function sessionLogoutAtMs(
  session: { latest_online?: string; created_at?: string; expires?: string },
  ttlSeconds: number,
  nowMs = Date.now(),
): number {
  const ttlMs =
    (Number.isFinite(ttlSeconds) && ttlSeconds > 0
      ? ttlSeconds
      : DEFAULT_SESSION_TTL_SECONDS) * 1000;
  let next = Date.parse(session.expires || "");
  if (!Number.isFinite(next)) next = nowMs + ttlMs;
  const capAt = nowMs + ttlMs;
  if (next > capAt) next = capAt;
  const last = sessionLastActivityMs(session);
  if (Number.isFinite(last)) {
    const idleCap = last + ttlMs;
    if (next > idleCap) next = idleCap;
  }
  return next;
}

export function formatSessionAge(deltaMs: number, t: (key: string) => string): string {
  const ms = Math.abs(deltaMs);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (!Number.isFinite(ms) || seconds < 60) {
    return t("just_now");
  }

  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days}${t("nodeCard.time_day")}${remainingHours}${t("nodeCard.time_hour")}${t("time.ago")}`;
    }
    return `${days}${t("nodeCard.time_day")} ${t("time.ago")}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours}${t("nodeCard.time_hour")}${remainingMinutes}${t("nodeCard.time_minute")}${t("time.ago")}`;
    }
    return `${hours}${t("nodeCard.time_hour")}${t("time.ago")}`;
  }

  return `${minutes}${t("nodeCard.time_minute")}${t("time.ago")}`;
}

export function remainingSessionLabel(
  expiresAtMs: number,
  serverNowMs: number,
  clientNowMs: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const alignedNow = expiresAtMs - (expiresAtMs - serverNowMs - (clientNowMs - serverNowMs));
  const remainMs = expiresAtMs - alignedNow;
  if (remainMs <= 0) return { expired: true, text: t("sessions.expired") };
  const totalMinutes = Math.max(1, Math.round(remainMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(t("sessions.remain_d", { count: days }));
  if (hours) parts.push(t("sessions.remain_h", { count: hours }));
  if (minutes || parts.length === 0) parts.push(t("sessions.remain_m", { count: minutes }));
  return { expired: false, text: parts.join("") };
}
