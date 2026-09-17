import {
  type DashboardChartsData,
  type DashboardData,
  type DashboardTrafficDayResponse,
} from "@/utils/dashboard";
import { readDashboardSession, writeDashboardSession } from "@/utils/dashboardSession";

let dashboardSnapshot: { accountKey: string; key: string; data: DashboardData } | null = null;
let pendingDashboardRequest: { accountKey: string; key: string; request: Promise<DashboardData> } | null = null;
let dashboardChartsSnapshot: { accountKey: string; key: string; data: DashboardChartsData } | null = null;
let pendingDashboardChartsRequest: { accountKey: string; key: string; request: Promise<DashboardChartsData> } | null = null;

export async function requestDashboard(
  sections: string[],
  rankingLimit: number,
  accountKey = "authenticated",
): Promise<DashboardData> {
  const key = `${sections.join(",")}:${rankingLimit}`;
  if (pendingDashboardRequest?.accountKey === accountKey && pendingDashboardRequest.key === key) {
    return pendingDashboardRequest.request;
  }
  const params = new URLSearchParams({ sections: sections.join(","), limit: String(rankingLimit) });
  const request = fetch(`/api/admin/dashboard?${params}`, { cache: "no-store" })
    .then(async (response) => {
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
      return response.json() as Promise<DashboardData>;
    })
    .then((data) => {
      dashboardSnapshot = { accountKey, key, data };
      writeDashboardSession("summary", accountKey, key, data);
      return data;
    })
    .finally(() => {
      if (pendingDashboardRequest?.accountKey === accountKey && pendingDashboardRequest.key === key) {
        pendingDashboardRequest = null;
      }
    });
  pendingDashboardRequest = { accountKey, key, request };
  return request;
}

export async function requestDashboardCharts(
  sections: string[],
  rankingLimit: number,
  accountKey = "authenticated",
): Promise<DashboardChartsData> {
  const key = `${sections.join(",")}:${rankingLimit}`;
  if (pendingDashboardChartsRequest?.accountKey === accountKey && pendingDashboardChartsRequest.key === key) {
    return pendingDashboardChartsRequest.request;
  }
  const params = new URLSearchParams({ sections: sections.join(","), limit: String(rankingLimit) });
  const request = fetch(`/api/admin/dashboard/charts?${params}`, { cache: "no-store" })
    .then(async (response) => {
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
      return response.json() as Promise<DashboardChartsData>;
    })
    .then((data) => {
      dashboardChartsSnapshot = { accountKey, key, data };
      writeDashboardSession("charts", accountKey, key, data);
      return data;
    })
    .finally(() => {
      if (pendingDashboardChartsRequest?.accountKey === accountKey && pendingDashboardChartsRequest.key === key) {
        pendingDashboardChartsRequest = null;
      }
    });
  pendingDashboardChartsRequest = { accountKey, key, request };
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
    .then(async (response) => {
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
      return response.json() as Promise<DashboardTrafficDayResponse>;
    })
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
  if (dashboardSnapshot?.accountKey === accountKey && dashboardSnapshot.key === key) {
    return dashboardSnapshot.data;
  }
  const data = readDashboardSession<DashboardData>("summary", accountKey, key);
  if (data) dashboardSnapshot = { accountKey, key, data };
  return data;
}

export function getDashboardChartsSnapshot(key: string, accountKey = "authenticated"): DashboardChartsData | null {
  if (dashboardChartsSnapshot?.accountKey === accountKey && dashboardChartsSnapshot.key === key) {
    return dashboardChartsSnapshot.data;
  }
  const data = readDashboardSession<DashboardChartsData>("charts", accountKey, key);
  if (data) dashboardChartsSnapshot = { accountKey, key, data };
  return data;
}
