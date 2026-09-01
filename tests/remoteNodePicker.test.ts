import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  displayRemoteAddress,
  filterRemoteNodes,
  orderRemoteNodes,
  paginateRemoteNodes,
  remoteNodeSearchText,
  type RemoteNodePickerItem,
} from "../src/utils/remoteNodePicker.ts";

const nodes: RemoteNodePickerItem[] = [
  {
    uuid: "hk",
    name: "HK-Gateway",
    ipv4: "203.0.113.18",
    ipv6: "2001:db8:10::18",
    group: "Asia",
    region: "HK",
  },
  {
    uuid: "de",
    name: "Frankfurt-Storage",
    ipv4: "198.51.100.64",
    group: "Europe",
    region: "DE",
  },
];

const online = new Set(["hk"]);

test("searches remote nodes by name, IPv4, IPv6, group and tags", () => {
  assert.deepEqual(filterRemoteNodes(nodes, "gateway", "all", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "203.0.113", "all", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "db8:10", "all", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "euro", "all", online).map((node) => node.uuid), ["de"]);
  const tagged = { ...nodes[1], tags: "hetzner;cn2" };
  assert.deepEqual(filterRemoteNodes([tagged], "hetzner", "all", online).map((node) => node.uuid), ["de"]);
});

test("does not include the region field in remote node search", () => {
  assert.equal(remoteNodeSearchText(nodes[0]).includes("hk"), true);
  const renamed = { ...nodes[0], name: "Gateway", region: "JP" };
  assert.deepEqual(filterRemoteNodes([renamed], "jp", "all", online), []);
});

test("shows all servers by default and applies explicit status filters", () => {
  assert.deepEqual(filterRemoteNodes(nodes, "", "all", online).map((node) => node.uuid), ["hk", "de"]);
  assert.deepEqual(filterRemoteNodes(nodes, "", "online", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "", "offline", online).map((node) => node.uuid), ["de"]);
});

test("matches the server management order before filtering and pagination", () => {
  const unorderedNodes: RemoteNodePickerItem[] = [
    { uuid: "node-c", name: "Node C", weight: 20, created_at: "2026-08-01T00:00:00Z" },
    { uuid: "node-b", name: "Node B", weight: 10, created_at: "2026-08-01T00:01:00Z" },
    { uuid: "node-a", name: "Node A", weight: 10, created_at: "2026-08-01T00:00:00Z" },
  ];

  assert.deepEqual(
    orderRemoteNodes(unorderedNodes).map((node) => node.uuid),
    ["node-a", "node-b", "node-c"],
  );
});

test("normalizes missing addresses before rendering their unreported state", () => {
  assert.equal(displayRemoteAddress(" 2001:db8::1 "), "2001:db8::1");
  assert.equal(displayRemoteAddress(""), "");
  assert.equal(displayRemoteAddress(undefined), "");
});

test("uses independent page sizes and clamps stale page numbers", () => {
  const manyNodes = Array.from({ length: 35 }, (_, index) => ({
    uuid: `node-${index + 1}`,
    name: `Node ${index + 1}`,
  }));

  const portalPage = paginateRemoteNodes(manyNodes, 2, 16);
  assert.equal(portalPage.currentPage, 2);
  assert.equal(portalPage.totalPages, 3);
  assert.equal(portalPage.nodes.length, 16);

  const terminalPage = paginateRemoteNodes(manyNodes, 99, 6);
  assert.equal(terminalPage.currentPage, 6);
  assert.equal(terminalPage.totalPages, 6);
  assert.equal(terminalPage.nodes.length, 5);
});

test("keeps the terminal portal aligned with the dashboard visual language", () => {
  const terminalSource = readFileSync(new URL("../src/pages/terminal/index.tsx", import.meta.url), "utf8");
  const pickerSource = readFileSync(new URL("../src/components/remote/RemoteNodePicker.tsx", import.meta.url), "utf8");
  const terminalStyles = readFileSync(new URL("../src/pages/terminal/Terminal.css", import.meta.url), "utf8");

  assert.equal(pickerSource.includes('t("terminal.server_count"'), false);
  assert.match(pickerSource, /from "@mui\/material\/Paper"/);
  assert.match(pickerSource, /from "@mui\/material\/TextField"/);
  assert.equal(pickerSource.includes('t("terminal.ip_address")'), true);
  assert.equal(pickerSource.includes('t("terminal.address_unreported")'), true);
  assert.match(pickerSource, /\["IPv4", ipv4\][\s\S]*\["IPv6", ipv6\]/);
  assert.equal(pickerSource.includes('t("terminal.copy_address"'), false);
  assert.equal(pickerSource.includes('role="button"'), true);
  assert.equal(pickerSource.includes("if (knownOnline) onSelect(node)"), true);
  assert.equal(pickerSource.includes('event.key !== "Enter" && event.key !== " "'), true);
  assert.equal(terminalStyles.includes("width: min(94vw, 1040px)"), true);
  assert.equal(terminalStyles.includes("max-height: calc(100dvh - 24px)"), true);
  assert.equal(terminalStyles.includes("height: min(calc(100vh - 24px), 820px)"), false);
  assert.equal(terminalStyles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), true);
  assert.equal(terminalStyles.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"), false);
  assert.equal(terminalSource.includes('maxWidth="1040px"'), true);
  assert.equal(terminalSource.includes("pageSize={6}"), true);
  assert.equal(terminalSource.includes("columns={2}"), true);
  assert.match(terminalSource, /ThemeProvider theme=\{terminalMuiTheme\}/);
  assert.match(pickerSource, /gridTemplateColumns: "1fr 1fr"/);
  assert.match(pickerSource, /bgcolor: "background.paper"/);
  assert.doesNotMatch(pickerSource, /bgcolor: selected \? "action.hover"/);
  assert.match(pickerSource, /NODE_ONLINE/);
  assert.match(pickerSource, /NODE_OFFLINE/);
  assert.doesNotMatch(pickerSource, /RemoteNodePicker\.css/);
  assert.match(pickerSource, /common\.tags/);
  assert.match(pickerSource, /<CustomTags tags=\{node\.tags/);
  assert.doesNotMatch(pickerSource, /SquareTerminal/);
  assert.match(pickerSource, /remote-node-picker-results/);
  assert.match(pickerSource, /remote-node-picker-controls/);
  assert.match(pickerSource, /flex: \{ xs: "0 0 auto", sm: "1 1 280px" \}/);
  assert.doesNotMatch(pickerSource, /flex: "1 1 280px"/);
  assert.equal(terminalSource.includes("rowsPerPage={3}"), true);
  assert.match(terminalStyles, /overflow: hidden/);
  assert.match(terminalStyles, /\.remote-dialog-actions \{[\s\S]*flex: 0 0 auto/);
});
