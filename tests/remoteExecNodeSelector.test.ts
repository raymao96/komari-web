import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  matchesRemoteExecNode,
  orderRemoteExecNodes,
  remoteExecNodeSearchText,
  type RemoteExecNodeSearchItem,
} from "../src/utils/remoteExecNodes.ts";

const selectorSource = readFileSync(
  new URL("../src/components/remote/RemoteExecNodeSelector.tsx", import.meta.url),
  "utf8",
);
const execPageSource = readFileSync(
  new URL("../src/pages/admin/exec.tsx", import.meta.url),
  "utf8",
);
const node: RemoteExecNodeSearchItem = {
  uuid: "node-hk",
  name: "Neburst_HK",
  ipv4: "74.52.12.4",
  ipv6: "2602:f732:1:59::a",
  group: "线路机",
  remark: "香港中转",
  price: 383.04,
  billing_cycle: 365,
  currency: "USD",
  expired_at: "2027-09-27T00:00:00Z",
  tags: "premium",
};

test("searches remote execution nodes across every displayed field", () => {
  assert.equal(matchesRemoteExecNode(node, "neburst"), true);
  assert.equal(matchesRemoteExecNode(node, "74.52"), true);
  assert.equal(matchesRemoteExecNode(node, "f732:1"), true);
  assert.equal(matchesRemoteExecNode(node, "线路"), true);
  assert.equal(matchesRemoteExecNode(node, "中转"), true);
  assert.equal(matchesRemoteExecNode(node, "383.04"), true);
  assert.equal(matchesRemoteExecNode(node, "usd"), true);
  assert.equal(matchesRemoteExecNode(node, "365"), true);
  assert.equal(matchesRemoteExecNode(node, "2027-09"), true);
  assert.equal(matchesRemoteExecNode(node, "premium"), true);
});

test("includes localized billing text in fuzzy search", () => {
  const billingTerms = ["$383.04/年", "余419天"];
  assert.equal(matchesRemoteExecNode(node, "年", billingTerms), true);
  assert.equal(matchesRemoteExecNode(node, "余419", billingTerms), true);
  assert.equal(remoteExecNodeSearchText(node, billingTerms).includes("$383.04/年"), true);
});

test("normalizes case and surrounding whitespace", () => {
  assert.equal(matchesRemoteExecNode(node, "  NEBURST  "), true);
  assert.equal(matchesRemoteExecNode(node, "not-present"), false);
});

test("keeps the same backend order as the node list", () => {
  const unordered: RemoteExecNodeSearchItem[] = [
    { uuid: "c", name: "C", weight: 20, created_at: "2026-08-01T00:00:00Z" },
    { uuid: "b", name: "B", weight: 10, created_at: "2026-08-01T00:01:00Z" },
    { uuid: "a", name: "A", weight: 10, created_at: "2026-08-01T00:00:00Z" },
  ];

  assert.deepEqual(orderRemoteExecNodes(unordered).map((item) => item.uuid), ["a", "b", "c"]);
});

test("does not expose address copy actions in remote execution", () => {
  assert.doesNotMatch(selectorSource, /navigator\.clipboard/);
  assert.doesNotMatch(selectorSource, /terminal\.copy_address/);
  assert.doesNotMatch(selectorSource, /<Copy\b/);
});

test("hides an unreported IPv6 row and vertically centers IPv4", () => {
  assert.match(selectorSource, /\["IPv4", node\.ipv4\?\.trim\(\)\][\s\S]{0,80}\["IPv6", node\.ipv6\?\.trim\(\)\]/);
  assert.match(selectorSource, /addresses\.length > 0 \? addresses\.map/);
  assert.doesNotMatch(selectorSource, /\["IPv[46]", node\.ipv[46] \|\| ""\]/);
  const selectorCss = readFileSync(
    new URL("../src/components/remote/RemoteExecNodeSelector.css", import.meta.url),
    "utf8",
  );
  assert.match(selectorCss, /\.remote-exec-node-addresses \{[\s\S]*height: 100%[\s\S]*justify-content: center/);
});

test("keeps one palette-aware select-all action without a redundant command shell", () => {
  const selectAllAction = selectorSource.match(
    /<Button\s+type="button"[\s\S]*?<\/Button>/,
  )?.[0] ?? "";

  assert.notEqual(selectAllAction, "");
  assert.match(selectAllAction, /<ListChecks size=\{16\} \/>/);
  assert.doesNotMatch(selectAllAction, /color="gray"/);
  assert.match(selectorSource, /<ListChecks size=\{16\} \/>/);
  assert.doesNotMatch(selectorSource, /selectAllState/);
  assert.match(execPageSource, /<SettingCardCollapse title=\{t\("exec\.selectNodes"\)\} defaultOpen>/);
  assert.doesNotMatch(execPageSource, /<Card className="p-4 sm:p-5">/);
});

test("collapses long selected-node summaries into an inspectable popover", () => {
  assert.match(execPageSource, /const SELECTED_NODE_PREVIEW_LIMIT = 15/);
  assert.match(execPageSource, /selectedNodeNames\.slice\(0, SELECTED_NODE_PREVIEW_LIMIT\)/);
  assert.match(execPageSource, /\+\{hiddenSelectedNodeCount\}/);
  assert.match(execPageSource, /<Popover\.Root>/);
  assert.match(execPageSource, /max-h-72/);
  assert.match(execPageSource, /selectedNodeNames\.map/);
});

test("keeps remote execution protected by account 2FA", () => {
  assert.match(execPageSource, /const \{ account \} = useAccount\(\)/);
  assert.match(execPageSource, /Boolean\(account\?\.\["2fa_enabled"\]\)/);
  assert.match(execPageSource, /placeholder=\{t\("admin\.nodeTable\.twoFactorCode"\)\}/);
  assert.match(execPageSource, /"2fa_code": twoFaCode/);
  assert.match(execPageSource, /twoFaEnabled && !twoFaCode\.trim\(\)/);
});
