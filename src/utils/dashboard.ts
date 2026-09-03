import { formatBytes } from "./unitHelper.ts";

export interface DashboardOfflineNode {
  uuid: string;
  name: string;
  region: string;
  last_seen: string | null;
}

export interface DashboardTrafficDay {
  day: string;
  up: number;
  down: number;
  billable: number;
}

export interface DashboardTrafficHour {
  hour: string;
  up: number;
  down: number;
}

export interface DashboardTrafficRankItem {
  uuid: string;
  name: string;
  up: number;
  down: number;
  billable: number;
  detail_url?: string;
}

export interface DashboardDatabaseFiles {
  database: number;
  wal: number;
  shm: number;
}

export interface DashboardDatabaseStatus {
  driver: string;
  location: string;
  size: number | null;
  files?: DashboardDatabaseFiles;
  error?: string;
}

export interface DashboardReturnRouteEvent {
  id: number;
  task_name: string;
  node_name: string;
  expected_line: string;
  from_line: string;
  to_line: string;
  kind: string;
  occurred_at: string;
}

export interface DashboardReturnRouteStatus {
  tasks: number;
  active: number;
  healthy: number;
  switched: number;
  abnormal: number;
  suspected_blocked?: number;
  recent_events: number;
  latest_event?: DashboardReturnRouteEvent;
  error?: string;
}

export interface DashboardAlertLatest {
  title: string;
  node_name?: string;
  node_uuid?: string;
  task_id?: number;
  task_name?: string;
  occurred_at?: string;
  due_at?: string;
}

export type DashboardAlertKind =
  | "offline"
  | "resource"
  | "latency_loss"
  | "traffic"
  | "return_route"
  | "billing";

export interface DashboardAlertAffectedItem extends DashboardAlertLatest {
  kind: DashboardAlertKind;
}

export interface DashboardAlertItemsResponse {
  kind: DashboardAlertKind;
  items: DashboardAlertAffectedItem[];
  generated_at: string;
}

export interface DashboardAlertSummary {
  current: number;
  affected_nodes: number;
  recovered_today: number;
  latest_alert?: DashboardAlertLatest;
  error?: string;
}

export interface DashboardAlerts {
  resource: DashboardAlertSummary;
  offline: DashboardAlertSummary;
  latency_loss: DashboardAlertSummary;
  traffic: DashboardAlertSummary;
  return_route: DashboardAlertSummary;
  billing: DashboardAlertSummary;
}

export interface DashboardLatencyPoint {
  time: string;
  average: number;
}

export interface DashboardLatencySummary {
  average: number;
  targets: number;
  points: DashboardLatencyPoint[];
  ranking: DashboardLatencyRankItem[];
  jitter_ranking: DashboardLatencyJitterRankItem[];
  jitter_error?: string;
  error?: string;
}

export interface DashboardLatencyRankItem {
  uuid: string;
  name: string;
  average: number;
  detail_url?: string;
}

export interface DashboardLatencyJitterRankItem {
  uuid: string;
  name: string;
  previous: number;
  current: number;
  delta: number;
  detail_url?: string;
}

export interface DashboardPacketLossRankItem {
  uuid: string;
  name: string;
  task_id: number;
  task_name: string;
  loss_rate: number;
  lost: number;
  total: number;
  valid: number;
  detail_url?: string;
}

export interface DashboardResourceRankItem {
  uuid: string;
  name: string;
  cpu: number;
  memory: number;
  disk: number;
  detail_url?: string;
}

export interface DashboardResourceSummary {
  cpu: DashboardResourceRankItem[];
  memory: DashboardResourceRankItem[];
  disk: DashboardResourceRankItem[];
}

export interface DashboardData {
  servers: {
    total: number;
    online: number;
    offline: number;
    offline_nodes: DashboardOfflineNode[];
  };
  resources: DashboardResourceSummary;
  database: {
    type: string;
    size: number;
    main: DashboardDatabaseStatus;
    monitoring: DashboardDatabaseStatus;
    local_total: number | null;
  };
  storage: {
    database_files: number;
    wal: number;
    shm: number;
    retention_days: number;
    last_compacted_at: string | null;
  };
  return_route: DashboardReturnRouteStatus;
  alerts: DashboardAlerts;
  generated_at: string;
}

export interface DashboardChartsData {
  traffic: {
    today_up: number;
    today_down: number;
    today_billable: number;
    hourly: DashboardTrafficHour[];
    daily: DashboardTrafficDay[];
    ranking: DashboardTrafficRankItem[];
    history_ready: boolean;
    error?: string;
  };
  latency: DashboardLatencySummary;
  packet_loss: {
    window_minutes: number;
    ranking: DashboardPacketLossRankItem[];
    error?: string;
  };
  generated_at: string;
}

export function dashboardLocalStorageTotal(data: DashboardData): number | null {
  const measuredTotal = data.storage.database_files + data.storage.wal + data.storage.shm;
  if (typeof data.database.local_total === "number") {
    return measuredTotal;
  }
  if (data.database.main.location === "local") {
    return data.database.main.size;
  }
  return null;
}

export function dashboardRuntimeStorageTotal(data: DashboardData): number {
  return data.storage.wal + data.storage.shm;
}

export function dashboardOnlinePercent(data: DashboardData): number {
  if (data.servers.total <= 0) return 0;
  return Math.round((data.servers.online / data.servers.total) * 100);
}

export function shortDashboardDay(day: string, locale: string): string {
  const parsed = new Date(`${day}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(parsed);
}

export function dashboardTrafficAxisWidth(values: readonly number[]): number {
  const longestLabel = values.reduce((longest, value) => {
    if (!Number.isFinite(value)) return longest;
    const label = formatBytes(Math.max(0, value)).replace(" ", "");
    return Math.max(longest, label.length);
  }, 0);
  // Right-aligned ticks: extra width becomes a blank column to the left of the labels.
  return Math.min(76, Math.max(56, longestLabel * 7 + 12));
}

export const SUMMARY_FOOTER_CLASS = "km-summary-footer";
export const SUMMARY_FOOTER_STACK_CLASS = "km-summary-footer--stack";
export const SUMMARY_FOOTER_MEASURE_CLASS = "km-summary-footer--measure";

export function groupByVisualRow<T>(
  items: readonly T[],
  topOf: (item: T) => number,
  threshold = 8,
): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const top = topOf(item);
    const group = groups.find((candidate) => Math.abs(topOf(candidate[0]) - top) <= threshold);
    if (group) group.push(item);
    else groups.push([item]);
  }
  return groups;
}

export function summaryFooterNaturallyWraps(el: HTMLElement): boolean {
  el.classList.add(SUMMARY_FOOTER_MEASURE_CLASS);
  const kids = Array.from(el.children) as HTMLElement[];
  const wrapped = kids.length >= 2 && kids[1].offsetTop > kids[0].offsetTop + 1;
  el.classList.remove(SUMMARY_FOOTER_MEASURE_CLASS);
  return wrapped;
}

export function syncSummaryFooters(root: ParentNode): void {
  const footers = Array.from(root.querySelectorAll<HTMLElement>(`.${SUMMARY_FOOTER_CLASS}`));
  if (footers.length === 0) return;
  const groups = groupByVisualRow(footers, (el) => {
    const card = el.closest<HTMLElement>("[data-dashboard-module]");
    return (card ?? el).getBoundingClientRect().top;
  });
  for (const group of groups) {
    const shouldStack = group.some(summaryFooterNaturallyWraps);
    for (const el of group) {
      el.classList.toggle(SUMMARY_FOOTER_STACK_CLASS, shouldStack);
    }
  }
}
