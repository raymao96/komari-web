import assert from "node:assert/strict";
import test from "node:test";

import {
  readDashboardSession,
  writeDashboardSession,
  type DashboardSessionStorage,
} from "../src/utils/dashboardSession.ts";

function memoryStorage(): DashboardSessionStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("dashboard session snapshots are isolated by administrator and request shape", () => {
  const storage = memoryStorage();
  writeDashboardSession("charts", "admin-a", "latency:5", { value: 1 }, { storage, now: 1000 });

  assert.deepEqual(
    readDashboardSession("charts", "admin-a", "latency:5", { storage, now: 1500 }),
    { value: 1 },
  );
  assert.equal(readDashboardSession("charts", "admin-b", "latency:5", { storage, now: 1500 }), null);
  assert.equal(readDashboardSession("charts", "admin-a", "latency:10", { storage, now: 1500 }), null);
});

test("dashboard session snapshots expire without blocking rendering", () => {
  const storage = memoryStorage();
  writeDashboardSession("summary", "admin-a", "servers:5", { online: 3 }, { storage, now: 1000 });

  assert.equal(readDashboardSession("summary", "admin-a", "servers:5", {
    storage,
    now: 3001,
    maxAgeMs: 2000,
  }), null);
});
