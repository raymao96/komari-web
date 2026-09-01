import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { nodeTrafficType, trafficUsed } from "../src/utils/trafficAccounting.ts";

test("trafficUsed follows each server's accounting mode", () => {
  assert.equal(trafficUsed("up", 10, 20), 10);
  assert.equal(trafficUsed("down", 10, 20), 20);
  assert.equal(trafficUsed("sum", 10, 20), 30);
  assert.equal(trafficUsed("min", 10, 20), 10);
  assert.equal(trafficUsed("max", 10, 20), 20);
  assert.equal(trafficUsed("", 10, 20), 30);
  assert.equal(trafficUsed("unknown", 10, 20), 30);
  assert.equal(nodeTrafficType({ traffic_limit_type: "up" }), "up");
  assert.equal(nodeTrafficType({ traffic_limit_type: "down" }), "down");
  assert.equal(nodeTrafficType({ traffic_limit_type: "sum" }), "sum");
  assert.equal(nodeTrafficType({ traffic_limit_type: "max" }), "max");
  assert.equal(
    nodeTrafficType({ effective_traffic_type: "down", traffic_limit_type: "sum" }),
    "down",
  );
});

test("usage stats read the per-server type instead of a fixed sum", () => {
  const usageSource = readFileSync("src/pages/admin/NodeUsageStats.tsx", "utf8");
  const helperSource = readFileSync("src/utils/trafficAccounting.ts", "utf8");
  assert.match(usageSource, /nodeTrafficType\(node\)/);
  assert.doesNotMatch(usageSource, /Math\.max\(inbound/);
  assert.doesNotMatch(usageSource, /effective_traffic_type \|\| "sum"/);
  assert.doesNotMatch(helperSource, /return null/);
  assert.doesNotMatch(helperSource, /default:\s*return Math\.max/);
  assert.match(helperSource, /effective_traffic_type \|\| node\.traffic_limit_type/);
});

test("selector table stays full width without a compact row override", () => {
  const selector = readFileSync("src/components/Selector.tsx", "utf8");
  const nodeSelector = readFileSync("src/components/NodeSelectorDialog.tsx", "utf8");
  const pingSelector = readFileSync("src/components/PingTaskSelectorDialog.tsx", "utf8");
  const globalCss = readFileSync("src/global.css", "utf8");
  assert.doesNotMatch(selector, /w-fit max-w-full/);
  assert.doesNotMatch(selector, /className="w-auto"/);
  assert.doesNotMatch(nodeSelector, /maxWidth="360px"/);
  assert.doesNotMatch(pingSelector, /maxWidth="360px"/);
  assert.doesNotMatch(globalCss, /\.selector \.km-table td[\s\S]*height: 36px/);
  assert.doesNotMatch(selector, /w-8 px-1/);
});
