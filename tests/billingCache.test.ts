import assert from "node:assert/strict";
import test from "node:test";

import {
  billingQuery,
  getBillingSnapshot,
  requestBillingCached,
  resetBillingCache,
} from "../src/utils/billing.ts";

const originalFetch = globalThis.fetch;

test("billing GET responses are reused so revisiting does not start empty", async () => {
  resetBillingCache();
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({ status: "success", data: { total: calls } }),
    } as Response;
  }) as typeof fetch;

  try {
    const url = billingQuery("/api/admin/billing/overview", {
      currency: "CNY",
      revision: 0,
    });
    const first = await requestBillingCached<{ total: number }>(url);
    assert.equal(first.total, 1);
    assert.deepEqual(getBillingSnapshot(url), first);
    assert.equal(getBillingSnapshot("/api/admin/billing/missing"), null);

    const inFlight = requestBillingCached<{ total: number }>(url);
    const joined = requestBillingCached<{ total: number }>(url);
    const [second, third] = await Promise.all([inFlight, joined]);
    assert.equal(second.total, 2);
    assert.equal(third.total, 2);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    resetBillingCache();
  }
});
