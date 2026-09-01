import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  dashboardLocalStorageTotal,
  dashboardOnlinePercent,
  dashboardRuntimeStorageTotal,
  dashboardTrafficAxisWidth,
  shortDashboardDay,
  type DashboardData,
} from "../src/utils/dashboard.ts";
import {
  dashboardAlertCategoryPath,
  dashboardAlertDetailPath,
  formatBillingAlertStatus,
} from "../src/utils/adminAlertFilters.ts";

const sample = {
  servers: { total: 4, online: 3, offline: 1, offline_nodes: [] },
  resources: { cpu: [], memory: [], disk: [] },
  traffic: {
    today_up: 1,
    today_down: 2,
    today_billable: 2,
    hourly: [],
    daily: [],
    history_ready: true,
  },
  database: {
    type: "sqlite",
    size: 10,
    main: { driver: "sqlite", location: "local", size: 10 },
    monitoring: { driver: "sqlite", location: "local", size: 20 },
    local_total: 30,
  },
  storage: {
    database_files: 20,
    wal: 8,
    shm: 2,
    retention_days: 30,
    last_compacted_at: null,
  },
  return_route: {
    tasks: 3,
    active: 2,
    healthy: 1,
    switched: 1,
    abnormal: 0,
    recent_events: 1,
  },
  generated_at: "2026-07-31T08:00:00Z",
} satisfies DashboardData;

test("derives dashboard totals without altering source values", () => {
  assert.equal(dashboardOnlinePercent(sample), 75);
  assert.equal(dashboardLocalStorageTotal(sample), 30);
  assert.equal(dashboardRuntimeStorageTotal(sample), 10);
  assert.equal(
    dashboardLocalStorageTotal(sample),
    sample.storage.database_files + dashboardRuntimeStorageTotal(sample),
  );
  assert.equal(dashboardOnlinePercent({ ...sample, servers: { ...sample.servers, total: 0 } }), 0);
});

test("uses the visible storage breakdown when a stale aggregate disagrees", () => {
  assert.equal(
    dashboardLocalStorageTotal({
      ...sample,
      database: { ...sample.database, local_total: 999 },
    }),
    30,
  );
});

test("falls back to the local main database when a combined size is unavailable", () => {
  assert.equal(
    dashboardLocalStorageTotal({
      ...sample,
      database: { ...sample.database, local_total: null },
    }),
    10,
  );
});

test("formats Beijing ledger day keys for chart labels", () => {
  assert.match(shortDashboardDay("2026-07-31", "zh-CN"), /7.*31/);
  assert.equal(shortDashboardDay("invalid", "zh-CN"), "invalid");
});

test("reserves enough chart space for complete traffic labels on desktop and mobile", () => {
  const value = 558.79 * 1024 ** 3;
  const sixDigitGigabytes = 1001.55 * 1024 ** 3;
  assert.ok(dashboardTrafficAxisWidth([value]) > 58);
  assert.equal(dashboardTrafficAxisWidth([]), 68);
  assert.ok(dashboardTrafficAxisWidth([sixDigitGigabytes]) >= 88);
  assert.ok(dashboardTrafficAxisWidth([Number.MAX_VALUE]) <= 104);
});

test("dashboard alert links reuse existing destination filters", () => {
  assert.equal(dashboardAlertCategoryPath("offline"), "/admin/servers?status=offline");
  assert.equal(dashboardAlertCategoryPath("resource"), "/admin/servers?alert=resource");
  assert.equal(dashboardAlertCategoryPath("traffic"), "/admin/servers?alert=traffic");
  assert.equal(dashboardAlertCategoryPath("billing"), "/admin/servers?alert=billing");
  assert.equal(
    dashboardAlertCategoryPath("latency_loss"),
    "/admin/notification/ping-loss?state=active",
  );
  assert.equal(
    dashboardAlertCategoryPath("return_route"),
    "/admin/return-route?state=switched",
  );
  assert.equal(
    dashboardAlertDetailPath("latency_loss", {
      title: "loss",
      node_uuid: "00000000-0000-4000-8000-000000000014",
      task_id: 7,
    }),
    "/admin/notification/ping-loss?node=00000000-0000-4000-8000-000000000014&task=7",
  );
  assert.equal(
    dashboardAlertDetailPath("return_route", { title: "route", task_id: 9 }),
    "/admin/return-route?task=9",
  );
  assert.equal(
    dashboardAlertDetailPath("resource", {
      title: "cpu",
      node_uuid: "00000000-0000-4000-8000-000000000001",
    }),
    "/admin/servers/00000000-0000-4000-8000-000000000001?tab=metrics",
  );
  assert.equal(
    dashboardAlertDetailPath("traffic", {
      title: "quota",
      node_uuid: "00000000-0000-4000-8000-000000000001",
    }),
    "/admin/servers/00000000-0000-4000-8000-000000000001?tab=overview",
  );
  assert.equal(
    dashboardAlertDetailPath("billing", {
      title: "due",
      node_uuid: "00000000-0000-4000-8000-000000000001",
    }),
    "/admin/servers/00000000-0000-4000-8000-000000000001?tab=billing",
  );
});

test("billing alert labels distinguish overdue and upcoming states", () => {
  const now = Date.parse("2026-08-08T00:00:00Z");
  assert.equal(formatBillingAlertStatus("2026-08-11T00:00:00Z", "zh-CN", now), "3 天后到期");
  assert.equal(formatBillingAlertStatus("2026-08-07T12:00:00Z", "zh-CN", now), "已到期 1 天");
});

test("today's billable summary always lists upload and download together", () => {
  const source = readFileSync(new URL("../src/pages/admin/dashboard.tsx", import.meta.url), "utf8");
  const block = source.match(/case "traffic_summary":[\s\S]*?case "storage_summary":/);
  assert.ok(block);
  assert.match(block[0], /admin_dashboard\.upload/);
  assert.match(block[0], /admin_dashboard\.download/);
  assert.match(block[0], /today_up/);
  assert.match(block[0], /today_down/);
});

test("daily traffic ranking keeps a blue download marker", () => {
  const source = readFileSync(
    new URL("../src/components/admin/DashboardPanels.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");
  assert.match(source, /bg-\[var\(--blue-9\)\]/);
  assert.match(source, /admin_dashboard\.download/);
  assert.match(css, /--blue-9: #0090ff;/);
});

test("dashboard ranking chips share the same pressed chip style", () => {
  const source = readFileSync(
    new URL("../src/components/admin/DashboardPanels.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");
  assert.match(source, /function DashboardChip/);
  assert.equal((source.match(/<DashboardChip/g) ?? []).length >= 6, true);
  assert.doesNotMatch(source, /rounded-full bg-\[var\(--accent-a3\)\] px-2\.5 py-1/);
  assert.match(css, /\.km-dashboard-chip/);
  assert.match(css, /html\.dark \[data-admin-shell\][\s\S]*--accent-a3: rgba\(59, 158, 255, 0\.24\)/);
  assert.match(css, /html\.dark \[data-admin-shell\][\s\S]*--accent-11: #70b8ff/);
});
