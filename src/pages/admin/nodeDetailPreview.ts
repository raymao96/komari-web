import type { NodeDetail } from "@/contexts/NodeDetailsContext";

export const GB = 1024 ** 3;
export const EMPTY_DISPLAY = "—";

export type HoursRange = 1 | 24 | 168;

export type LoadRecord = {
  time: string;
  cpu?: number;
  ram?: number;
  ram_total?: number;
  disk?: number;
  disk_total?: number;
  net_in?: number;
  net_out?: number;
  net_total_up?: number;
  net_total_down?: number;
};

export function isEmptyValue(value: unknown) {
  if (value == null) return true;
  if (typeof value === "string" && !value.trim()) return true;
  if (typeof value === "number" && !Number.isFinite(value)) return true;
  if (typeof value === "number" && value === 0) return true;
  return false;
}

export function displayOrEmpty(value: unknown, format?: (value: any) => string): string {
  if (isEmptyValue(value)) return EMPTY_DISPLAY;
  return format ? format(value) : String(value);
}

export function configLabel(node: NodeDetail) {
  const cores = node.cpu_cores;
  const mem = node.mem_total;
  if (isEmptyValue(cores) && isEmptyValue(mem)) return EMPTY_DISPLAY;
  const memGb = Number(mem) ? Math.max(1, Math.round(Number(mem) / GB)) : 0;
  const coreCount = Number(cores) || 0;
  if (!coreCount && !memGb) return EMPTY_DISPLAY;
  return `${coreCount}C${memGb}G`;
}
