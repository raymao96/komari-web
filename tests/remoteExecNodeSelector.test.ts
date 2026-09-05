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
  tags: "premium",
};

test("searches remote execution nodes across name, address, group, remark, and tags", () => {
  assert.equal(matchesRemoteExecNode(node, "neburst"), true);
  assert.equal(matchesRemoteExecNode(node, "74.52"), true);
  assert.equal(matchesRemoteExecNode(node, "f732:1"), true);
  assert.equal(matchesRemoteExecNode(node, "线路"), true);
  assert.equal(matchesRemoteExecNode(node, "中转"), true);
  assert.equal(matchesRemoteExecNode(node, "premium"), true);
  assert.equal(matchesRemoteExecNode(node, "383.04"), false);
  assert.equal(matchesRemoteExecNode(node, "usd"), false);
  assert.equal(matchesRemoteExecNode(node, "365"), false);
  assert.equal(matchesRemoteExecNode(node, "2027-09"), false);
});

test("does not include billing text in fuzzy search", () => {
  assert.equal(remoteExecNodeSearchText(node).includes("premium"), true);
  assert.equal(remoteExecNodeSearchText(node).includes("383"), false);
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
  assert.match(selectorCss, /\.remote-exec-node-status\.is-online \{\s*color: #22c55e;/);
  assert.match(selectorCss, /\.remote-exec-node-status\.is-offline \{\s*color: #ff5630;/);
  assert.doesNotMatch(selectorCss, /--green-10|--red-10/);
});

test("keeps node-list filters and a palette-aware select-all action", () => {
  assert.match(selectorSource, /<AdminListShell/);
  assert.match(selectorSource, /nodeOnlineState\(available, onlineSet, node\.uuid\)/);
  assert.match(selectorSource, /visibility: "hidden"/);
  assert.match(selectorSource, /<AdminNodeListFilters/);
  assert.match(selectorSource, /exec\.nodeSearchPlaceholder/);
  assert.match(selectorSource, /startIcon=\{<ListChecks size=\{16\} \/>\}/);
  assert.match(selectorSource, /toggleFiltered\(!allFilteredSelected\)/);
  assert.doesNotMatch(selectorSource, /selectAllState/);
  assert.doesNotMatch(selectorSource, /<PriceTags/);
  assert.match(selectorSource, /<CustomTags/);
  assert.match(selectorSource, /admin\.nodeTable\.tags/);
  assert.match(execPageSource, /\{t\("exec\.selectNodes"\)\}/);
  assert.doesNotMatch(execPageSource, /SettingCardCollapse/);
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

test("keeps remote execution behind a page grant", () => {
  assert.match(execPageSource, /const \{ account \} = useAccount\(\)/);
  assert.match(execPageSource, /Boolean\(account\?\.\["2fa_enabled"\]\)/);
  assert.match(execPageSource, /scope: "exec"/);
  assert.match(execPageSource, /page_id: pageInstanceIdRef\.current/);
  assert.match(execPageSource, /grant: usedGrant/);
  assert.match(execPageSource, /next_grant/);
  assert.match(execPageSource, /setPasswordInput\(""\)/);
  assert.doesNotMatch(execPageSource, /"2fa_code": twoFaCode/);
  const passwordCopied = execPageSource.indexOf("const password = passwordInput;");
  const passwordCleared = execPageSource.indexOf('setPasswordInput("");', passwordCopied);
  const authorizeFetch = execPageSource.indexOf(
    'await fetch("/api/admin/client/remote/authorize"',
  );
  assert.ok(passwordCopied >= 0 && passwordCleared > passwordCopied);
  assert.ok(authorizeFetch > passwordCleared);
});
