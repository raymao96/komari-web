import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardLocalStorageTotal,
  dashboardOnlinePercent,
  dashboardRuntimeStorageTotal,
  shortDashboardDay,
  type DashboardData,
} from "../src/utils/dashboard.ts";

const sample = {
  servers: { total: 4, online: 3, offline: 1, offline_nodes: [] },
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
