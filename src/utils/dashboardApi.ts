import {
  type DashboardChartsData,
  type DashboardData,
  type DashboardTrafficDayResponse,
} from "@/utils/dashboard";
import { readDashboardSession, writeDashboardSession } from "@/utils/dashboardSession";

const dashboardRequestCacheLimit = 8;

type KeyedRequestCache<T> = {
  pending: Map<string, Promise<T>>;
  snapshots: Map<string, T>;
};

const dashboardSummaryCache: KeyedRequestCache<DashboardData> = {
  pending: new Map(),
  snapshots: new Map(),
};
const dashboardChartsCache: KeyedRequestCache<DashboardChartsData> = {
  pending: new Map(),
  snapshots: new Map(),
};

function dashboardRequestId(accountKey: string, key: string): string {
  return `${accountKey}\n${key}`;
}

function rememberKeyedValue<T>(store: Map<string, T>, id: string, value: T) {
  if (store.has(id)) store.delete(id);
  store.set(id, value);
  while (store.size > dashboardRequestCacheLimit) {
    const oldest = store.keys().next().value;
    if (oldest === undefined || oldest === id) break;
    store.delete(oldest);
  }
}

function persistDashboardPayload(rankingLimit: number): boolean {
  return rankingLimit !== 0;
}

async function readDashboardResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) message = String(payload.message);
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function requestDashboard(
  sections: string[],
  rankingLimit: number,
  accountKey = "authenticated",
): Promise<DashboardData> {
  const key = `${sections.join(",")}:${rankingLimit}`;
  const id = dashboardRequestId(accountKey, key);
  const pending = dashboardSummaryCache.pending.get(id);
  if (pending) return pending;
  const params = new URLSearchParams({ sections: sections.join(","), limit: String(rankingLimit) });
  const request = fetch(`/api/admin/dashboard?${params}`, { cache: "no-store" })
    .then((response) => readDashboardResponse<DashboardData>(response))
    .then((data) => {
      rememberKeyedValue(dashboardSummaryCache.snapshots, id, data);
      if (persistDashboardPayload(rankingLimit)) {
        writeDashboardSession("summary", accountKey, key, data);
      }
      return data;
    })
    .finally(() => {
      dashboardSummaryCache.pending.delete(id);
    });
  dashboardSummaryCache.pending.set(id, request);
  return request;
}

export async function requestDashboardCharts(
  sections: string[],
  rankingLimit: number,
  accountKey = "authenticated",
): Promise<DashboardChartsData> {
  const key = `${sections.join(",")}:${rankingLimit}`;
  const id = dashboardRequestId(accountKey, key);
  const pending = dashboardChartsCache.pending.get(id);
  if (pending) return pending;
  const params = new URLSearchParams({ sections: sections.join(","), limit: String(rankingLimit) });
  const request = fetch(`/api/admin/dashboard/charts?${params}`, { cache: "no-store" })
    .then((response) => readDashboardResponse<DashboardChartsData>(response))
    .then((data) => {
      rememberKeyedValue(dashboardChartsCache.snapshots, id, data);
      if (persistDashboardPayload(rankingLimit)) {
        writeDashboardSession("charts", accountKey, key, data);
      }
      return data;
    })
    .finally(() => {
      dashboardChartsCache.pending.delete(id);
    });
  dashboardChartsCache.pending.set(id, request);
  return request;
}

const trafficDayCache = new Map<string, DashboardTrafficDayResponse>();
const trafficDayCacheLimit = 8;
let pendingTrafficDayRequest: { day: string; request: Promise<DashboardTrafficDayResponse> } | null = null;

export function getCachedDashboardTrafficDay(day: string): DashboardTrafficDayResponse | null {
  return trafficDayCache.get(day) ?? null;
}

export function prefetchDashboardTrafficDay(day: string) {
  if (!day || trafficDayCache.has(day)) return;
  void requestDashboardTrafficDay(day).catch(() => {
    // Hover prefetch is best-effort; clicking the bar still reports errors.
  });
}

export async function requestDashboardTrafficDay(day: string): Promise<DashboardTrafficDayResponse> {
  const cached = trafficDayCache.get(day);
  if (cached) return cached;
  if (pendingTrafficDayRequest?.day === day) {
    return pendingTrafficDayRequest.request;
  }
  const params = new URLSearchParams({ day });
  const request = fetch(`/api/admin/dashboard/traffic-day?${params}`, { cache: "no-store" })
    .then((response) => readDashboardResponse<DashboardTrafficDayResponse>(response))
    .then((data) => {
      trafficDayCache.set(day, data);
      if (trafficDayCache.size > trafficDayCacheLimit) {
        const oldest = trafficDayCache.keys().next().value;
        if (oldest) trafficDayCache.delete(oldest);
      }
      return data;
    })
    .finally(() => {
      if (pendingTrafficDayRequest?.day === day) {
        pendingTrafficDayRequest = null;
      }
    });
  pendingTrafficDayRequest = { day, request };
  return request;
}

export function getDashboardSnapshot(key: string, accountKey = "authenticated"): DashboardData | null {
  const id = dashboardRequestId(accountKey, key);
  const cached = dashboardSummaryCache.snapshots.get(id);
  if (cached) {
    rememberKeyedValue(dashboardSummaryCache.snapshots, id, cached);
    return cached;
  }
  const data = readDashboardSession<DashboardData>("summary", accountKey, key);
  if (data) rememberKeyedValue(dashboardSummaryCache.snapshots, id, data);
  return data;
}

export function getDashboardChartsSnapshot(key: string, accountKey = "authenticated"): DashboardChartsData | null {
  const id = dashboardRequestId(accountKey, key);
  const cached = dashboardChartsCache.snapshots.get(id);
  if (cached) {
    rememberKeyedValue(dashboardChartsCache.snapshots, id, cached);
    return cached;
  }
  const data = readDashboardSession<DashboardChartsData>("charts", accountKey, key);
  if (data) rememberKeyedValue(dashboardChartsCache.snapshots, id, data);
  return data;
}
