import assert from "node:assert/strict";
import test from "node:test";

import { advanceBillingExpiry } from "../src/lib/renewalDate.ts";

test("monthly renewal adds one calendar month", () => {
  assert.equal(advanceBillingExpiry("2026-10-06", 30), "2026-11-06");
  assert.equal(advanceBillingExpiry("2026-12-06", 30), "2027-01-06");
});

test("preset cycles add calendar quarters, half years, and years", () => {
  assert.equal(advanceBillingExpiry("2026-10-06", 92), "2027-01-06");
  assert.equal(advanceBillingExpiry("2026-10-06", 184), "2027-04-06");
  assert.equal(advanceBillingExpiry("2026-10-06", 365), "2027-10-06");
  assert.equal(advanceBillingExpiry("2026-10-06", 730), "2028-10-06");
  assert.equal(advanceBillingExpiry("2026-10-06", 1095), "2029-10-06");
  assert.equal(advanceBillingExpiry("2026-10-06", 1825), "2031-10-06");
});

test("a cycle outside the preset ranges still adds that many days", () => {
  assert.equal(advanceBillingExpiry("2026-10-06", 45), "2026-11-20");
});

test("one-time and empty cycles do not move the expiry", () => {
  assert.equal(advanceBillingExpiry("2026-10-06", -1), null);
  assert.equal(advanceBillingExpiry("2026-10-06", 0), null);
});
