export const HOME_PROBE_TASK_LIMIT = 4;

export function normalizeHomeProbeTaskIds(value: unknown): number[] {
  const list = Array.isArray(value) ? value : [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const item of list) {
    const id = typeof item === "number" ? item : Number(item);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= HOME_PROBE_TASK_LIMIT) break;
  }
  return ids;
}

export function parseHomeProbeTaskOverrides(value: unknown): Record<string, number[]> {
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const result: Record<string, number[]> = {};
  for (const [key, ids] of Object.entries(source as Record<string, unknown>)) {
    const uuid = String(key || "").trim();
    if (!uuid) continue;
    const normalized = normalizeHomeProbeTaskIds(ids);
    if (normalized.length > 0) result[uuid] = normalized;
  }
  return result;
}

export function orderHomeProbePickerTasks<T extends { id?: number }>(
  tasks: readonly T[],
  selectedIds: readonly string[],
): T[] {
  const selected = new Map(selectedIds.map((id, index) => [id, index]));
  return [...tasks].sort((left, right) => {
    const leftIndex = selected.get(String(left.id ?? ""));
    const rightIndex = selected.get(String(right.id ?? ""));
    if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex;
    if (leftIndex !== undefined) return -1;
    if (rightIndex !== undefined) return 1;
    return 0;
  });
}
