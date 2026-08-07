import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowPersistentMetricDots } from "../src/utils/chartDisplay.ts";

test("single visible series keeps persistent dots", () => {
  assert.equal(shouldShowPersistentMetricDots(1, 700), true);
});

test("dense multi-series charts hide persistent dots", () => {
  assert.equal(shouldShowPersistentMetricDots(20, 20), false);
});

test("sparse multi-series charts keep persistent dots", () => {
  assert.equal(shouldShowPersistentMetricDots(3, 8), true);
});
