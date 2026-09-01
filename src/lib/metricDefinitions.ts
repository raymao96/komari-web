import { sameOriginApiPath, sameOriginFetchInit } from "@/utils/security";
import type { I18nText } from "@/utils/i18nText";

export interface MetricDefinition {
  name: string;
  description?: I18nText | null;
  type: string;
  unit?: string;
  retention_days: number;
  metadata?: Record<string, string>;
}

let metricDefinitionsSnapshot: MetricDefinition[] | null = null;
let metricDefinitionsPending: Promise<MetricDefinition[]> | null = null;

export function getMetricDefinitionsSnapshot(): MetricDefinition[] | null {
  return metricDefinitionsSnapshot;
}

export function rememberMetricDefinitions(
  metrics: MetricDefinition[],
): MetricDefinition[] {
  const list = Array.isArray(metrics) ? metrics : [];
  metricDefinitionsSnapshot = list;
  return list;
}

async function fetchMetricDefinitions(): Promise<MetricDefinition[]> {
  const response = await fetch(
    sameOriginApiPath("/api/rpc2"),
    sameOriginFetchInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "admin:listMetricDefinitions",
        params: {},
        id: 1,
      }),
    }),
  );
  const payload = (await response.json().catch(() => null)) as
    | { result?: MetricDefinition[]; error?: { message?: string } }
    | null;
  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  }
  return rememberMetricDefinitions(
    Array.isArray(payload.result) ? payload.result : [],
  );
}

export async function prefetchMetricDefinitions(): Promise<MetricDefinition[]> {
  if (metricDefinitionsSnapshot) return metricDefinitionsSnapshot;
  if (!metricDefinitionsPending) {
    metricDefinitionsPending = fetchMetricDefinitions().finally(() => {
      metricDefinitionsPending = null;
    });
  }
  return metricDefinitionsPending;
}
