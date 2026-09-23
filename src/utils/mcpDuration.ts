export const MCP_HARD_MAX_MINUTES = 1440;
export const MCP_MIN_MINUTES = 1;

export type DurationUnit = "minutes" | "hours";

export function parseDurationInput(raw: string, unit: DurationUnit, siteMax = MCP_HARD_MAX_MINUTES): {
  minutes: number | null;
  error: "empty" | "invalid" | "range" | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { minutes: null, error: "empty" };
  if (!/^\d+$/.test(trimmed)) return { minutes: null, error: "invalid" };
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(value) || value < 1) return { minutes: null, error: "invalid" };
  const minutes = unit === "hours" ? value * 60 : value;
  const max = Math.min(Math.max(siteMax, MCP_MIN_MINUTES), MCP_HARD_MAX_MINUTES);
  if (unit === "hours" && value > 24) return { minutes: null, error: "range" };
  if (minutes < MCP_MIN_MINUTES || minutes > max) return { minutes: null, error: "range" };
  return { minutes, error: null };
}

export function displayUnitForMinutes(minutes: number): DurationUnit {
  return minutes % 60 === 0 && minutes >= 60 ? "hours" : "minutes";
}

export function displayValueForMinutes(minutes: number, unit: DurationUnit): string {
  if (unit === "hours") return String(Math.floor(minutes / 60) || 1);
  return String(minutes);
}

export function formatDurationLabel(minutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

export const MCP_DURATION_PRESETS = [15, 30, 60, 1440] as const;
