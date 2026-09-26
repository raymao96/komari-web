import type { CSSProperties } from "react"

export const NODE_COLUMN_KEYS = [
  "name",
  "network",
  "agent",
  "group",
  "remark",
  "billing",
  "tags",
  "action",
] as const

export type NodeColumnKey = (typeof NODE_COLUMN_KEYS)[number]

export type NodeColumnWidths = Record<NodeColumnKey, number>

const STORAGE_KEY = "lite.admin.nodeList.columnWidths"
const COLUMN_MAX = 720

export const NODE_COLUMN_MIN: NodeColumnWidths = {
  name: 96,
  network: 128,
  agent: 64,
  group: 64,
  remark: 64,
  billing: 88,
  tags: 72,
  action: 268,
}

export const NODE_SORT_COLUMN_WIDTH = 44

/** Official column widths. Agent stays 64px until the user drags it. */
export const NODE_COLUMN_PREFERRED: NodeColumnWidths = {
  name: 170,
  network: 170,
  agent: 64,
  group: 64,
  remark: 64,
  billing: 80,
  tags: 116,
  action: 308,
}

export function clampNodeColumnWidth(key: NodeColumnKey, value: number): number {
  return Math.max(NODE_COLUMN_MIN[key], Math.min(COLUMN_MAX, Math.round(value)))
}

export function readNodeColumnWidths(): NodeColumnWidths | null {
  const layout = readNodeColumnLayout()
  return layout?.columns ?? null
}

export function readNodeColumnLayout(): { sort: number; columns: NodeColumnWidths } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const columns = {} as NodeColumnWidths
    for (const key of NODE_COLUMN_KEYS) {
      const value = parsed[key]
      if (typeof value !== "number" || !Number.isFinite(value)) return null
      columns[key] = clampNodeColumnWidth(key, value)
    }
    const sort = typeof parsed.sort === "number" && Number.isFinite(parsed.sort)
      ? Math.max(44, Math.min(80, Math.round(parsed.sort)))
      : NODE_SORT_COLUMN_WIDTH
    return { sort, columns }
  } catch {
    return null
  }
}

export function clearNodeColumnWidths() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore private-mode failures */
  }
}

export function writeNodeColumnWidths(widths: NodeColumnWidths, sort = NODE_SORT_COLUMN_WIDTH) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sort, ...widths }))
  } catch {
    /* ignore quota or private-mode failures */
  }
}

export function nodeColumnStyle(width: number | undefined): CSSProperties | undefined {
  if (!width) return undefined
  return { width, minWidth: width, maxWidth: width }
}

/** Match the desktop list width. A wider saved layout is scaled down so the table does not scroll while every column still fits. */
export function fitNodeColumnWidths(
  widths: NodeColumnWidths,
  containerWidth: number,
  sort = NODE_SORT_COLUMN_WIDTH,
  mins: NodeColumnWidths = NODE_COLUMN_MIN,
): NodeColumnWidths {
  const available = Math.round(containerWidth) - sort
  if (available <= 0) return widths
  const minSum = NODE_COLUMN_KEYS.reduce((sum, key) => sum + mins[key], 0)
  const target = Math.max(available, minSum)
  const current = NODE_COLUMN_KEYS.reduce((sum, key) => sum + widths[key], 0)
  const alreadyAtFloor = NODE_COLUMN_KEYS.every((key) => widths[key] >= mins[key])
  if (current === target && alreadyAtFloor) return widths
  const scale = target / current
  const next: NodeColumnWidths = { ...widths }
  let used = 0
  NODE_COLUMN_KEYS.forEach((key, index) => {
    if (index === NODE_COLUMN_KEYS.length - 1) {
      next[key] = Math.max(mins[key], Math.min(COLUMN_MAX, target - used))
      return
    }
    next[key] = Math.max(mins[key], Math.min(COLUMN_MAX, Math.round(widths[key] * scale)))
    used += next[key]
  })
  const unchanged = NODE_COLUMN_KEYS.every((key) => next[key] === widths[key])
  return unchanged ? widths : next
}

/** Default desktop layout. Agent stays at the official 64px; the other columns share the remaining width. */
export function defaultNodeColumnWidths(
  containerWidth: number,
  sort = NODE_SORT_COLUMN_WIDTH,
  mins: NodeColumnWidths = NODE_COLUMN_MIN,
): NodeColumnWidths {
  const available = Math.max(0, Math.round(containerWidth) - sort)
  const agent = NODE_COLUMN_PREFERRED.agent
  const others = NODE_COLUMN_KEYS.filter((key) => key !== "agent")
  const otherMin = others.reduce((sum, key) => sum + mins[key], 0)
  const rest = Math.max(available - agent, otherMin)
  const preferredSum = others.reduce((sum, key) => sum + NODE_COLUMN_PREFERRED[key], 0)
  const scale = preferredSum > 0 ? rest / preferredSum : 1
  const next = { ...NODE_COLUMN_PREFERRED, agent }
  let used = 0
  others.forEach((key, index) => {
    if (index === others.length - 1) {
      next[key] = Math.max(mins[key], rest - used)
      return
    }
    next[key] = Math.max(mins[key], Math.min(COLUMN_MAX, Math.round(NODE_COLUMN_PREFERRED[key] * scale)))
    used += next[key]
  })
  return next
}

export function sameNodeColumnWidths(left: NodeColumnWidths | null, right: NodeColumnWidths) {
  if (!left) return false
  return NODE_COLUMN_KEYS.every((key) => left[key] === right[key])
}
