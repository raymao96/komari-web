import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBandwidth } from "../src/utils/bandwidth.ts";

test("normalizeBandwidth inserts a single space between number and unit", () => {
  assert.equal(normalizeBandwidth("100M"), "100 M");
  assert.equal(normalizeBandwidth("200M"), "200 M");
  assert.equal(normalizeBandwidth("1.5Gbps"), "1.5 Gbps");
});

test("normalizeBandwidth collapses extra spaces to one", () => {
  assert.equal(normalizeBandwidth("100    M"), "100 M");
  assert.equal(normalizeBandwidth("  100   Mbps  "), "100 Mbps");
  assert.equal(normalizeBandwidth("1 Gbps"), "1 Gbps");
  assert.equal(normalizeBandwidth("10 G"), "10 G");
});

test("normalizeBandwidth keeps empty or number-only values", () => {
  assert.equal(normalizeBandwidth(""), "");
  assert.equal(normalizeBandwidth("   "), "");
  assert.equal(normalizeBandwidth("100"), "100");
});
