import type {
  DashboardAlertItemsResponse,
  DashboardAlertKind,
  DashboardAlertLatest,
} from "@/utils/dashboard";

export const serverListAlertKinds = ["resource", "traffic", "billing"] as const;
export type ServerListAlertKind = (typeof serverListAlertKinds)[number];

export function parseServerListAlertKind(
  value: string | null | undefined,
): ServerListAlertKind | "" {
  return serverListAlertKinds.includes(value as ServerListAlertKind)
    ? (value as ServerListAlertKind)
    : "";
}

export function dashboardAlertNodeUuidSet(
  items: Array<{ node_uuid?: string }> | null | undefined,
): Set<string> {
  const uuids = new Set<string>();
  for (const item of items ?? []) {
    if (item.node_uuid) uuids.add(item.node_uuid);
  }
  return uuids;
}

export function dashboardAlertCategoryPath(kind: DashboardAlertKind): string {
  if (kind === "offline") return "/admin/servers?status=offline";
  if (kind === "resource" || kind === "traffic" || kind === "billing") {
    return `/admin/servers?alert=${kind}`;
  }
  if (kind === "latency_loss") return "/admin/notification/ping-loss?state=active";
  if (kind === "return_route") return "/admin/return-route?state=switched";
  return "/admin/servers";
}

export function dashboardAlertDetailPath(
  kind: DashboardAlertKind,
  alert?: DashboardAlertLatest,
): string {
  if (!alert) return dashboardAlertCategoryPath(kind);
  if (kind === "latency_loss" && alert.node_uuid && alert.task_id) {
    const params = new URLSearchParams({ node: alert.node_uuid, task: String(alert.task_id) });
    return `/admin/notification/ping-loss?${params}`;
  }
  if (kind === "return_route" && alert.task_id) {
    return `/admin/return-route?task=${encodeURIComponent(String(alert.task_id))}`;
  }
  if (alert.node_uuid) {
    const uuid = encodeURIComponent(alert.node_uuid);
    if (kind === "resource") return `/admin/servers/${uuid}?tab=metrics`;
    if (kind === "billing") return `/admin/servers/${uuid}?tab=billing`;
    if (kind === "traffic") return `/admin/servers/${uuid}?tab=overview`;
    return `/admin/servers/${uuid}`;
  }
  return dashboardAlertCategoryPath(kind);
}

const ALERT_ITEMS_CACHE_TTL_MS = 30_000;
const alertItemsCache = new Map<string, {
  expiresAt: number;
  response: DashboardAlertItemsResponse;
}>();
const pendingAlertItems = new Map<string, Promise<DashboardAlertItemsResponse>>();

function alertItemsCacheKey(kind: DashboardAlertKind, accountKey: string): string {
  return `${accountKey}:${kind}`;
}

export function getDashboardAlertItemsSnapshot(
  kind: DashboardAlertKind,
  accountKey = "authenticated",
): DashboardAlertItemsResponse | null {
  const key = alertItemsCacheKey(kind, accountKey);
  const cached = alertItemsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    alertItemsCache.delete(key);
    return null;
  }
  return cached.response;
}

export async function requestDashboardAlertItems(
  kind: DashboardAlertKind,
  signal?: AbortSignal,
  accountKey = "authenticated",
): Promise<DashboardAlertItemsResponse> {
  const cached = getDashboardAlertItemsSnapshot(kind, accountKey);
  if (cached) return cached;
  const params = new URLSearchParams({ kind });
  const response = await fetch(`/api/admin/dashboard/alerts?${params}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  const data = await response.json() as DashboardAlertItemsResponse;
  const normalized = { ...data, items: Array.isArray(data.items) ? data.items : [] };
  alertItemsCache.set(alertItemsCacheKey(kind, accountKey), {
    expiresAt: Date.now() + ALERT_ITEMS_CACHE_TTL_MS,
    response: normalized,
  });
  return normalized;
}

export function prefetchDashboardAlertItems(
  kind: DashboardAlertKind,
  accountKey = "authenticated",
): Promise<DashboardAlertItemsResponse> {
  const cached = getDashboardAlertItemsSnapshot(kind, accountKey);
  if (cached) return Promise.resolve(cached);
  const key = alertItemsCacheKey(kind, accountKey);
  const pending = pendingAlertItems.get(key);
  if (pending) return pending;
  const request = requestDashboardAlertItems(kind, undefined, accountKey)
    .finally(() => {
      if (pendingAlertItems.get(key) === request) pendingAlertItems.delete(key);
    });
  pendingAlertItems.set(key, request);
  return request;
}

export function formatBillingAlertStatus(
  dueAt: string | undefined,
  locale: string,
  now = Date.now(),
): string {
  if (!dueAt) return "";
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return "";
  const days = Math.ceil(Math.abs(due - now) / 86_400_000);
  if (due < now) return locale.startsWith("zh") ? `已到期 ${days} 天` : `Expired ${days}d`;
  return locale.startsWith("zh") ? `${days} 天后到期` : `Due in ${days}d`;
}
