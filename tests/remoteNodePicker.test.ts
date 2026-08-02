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

test("searches remote nodes by name, IPv4, IPv6 and group", () => {
  assert.deepEqual(filterRemoteNodes(nodes, "gateway", "all", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "203.0.113", "all", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "db8:10", "all", online).map((node) => node.uuid), ["hk"]);
  assert.deepEqual(filterRemoteNodes(nodes, "euro", "all", online).map((node) => node.uuid), ["de"]);
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
  const portalSource = readFileSync(new URL("../src/pages/admin/terminal.tsx", import.meta.url), "utf8");
  const terminalSource = readFileSync(new URL("../src/pages/terminal/index.tsx", import.meta.url), "utf8");
  const pickerSource = readFileSync(new URL("../src/components/remote/RemoteNodePicker.tsx", import.meta.url), "utf8");
  const pickerStyles = readFileSync(new URL("../src/components/remote/RemoteNodePicker.css", import.meta.url), "utf8");
  const terminalStyles = readFileSync(new URL("../src/pages/terminal/Terminal.css", import.meta.url), "utf8");

  assert.equal(portalSource.includes("mx-auto"), false);
  assert.equal(portalSource.includes("max-w-[1440px]"), false);
  assert.equal(pickerSource.includes('t("terminal.server_count"'), false);
  assert.equal(pickerStyles.includes("box-shadow: var(--shadow-1)"), false);
  assert.equal(pickerStyles.includes("box-shadow: var(--shadow-3)"), false);
  assert.equal(pickerSource.includes('t("terminal.ip_address")'), true);
  assert.equal(pickerSource.includes('t("terminal.address_unreported")'), true);
  assert.equal(pickerSource.includes('type: "IPv4" as const'), true);
  assert.equal(pickerSource.includes('type: "IPv6" as const'), true);
  assert.equal(pickerSource.includes('t("terminal.copy_address"'), true);
  assert.equal(terminalStyles.includes("width: min(94vw, 1040px)"), true);
  assert.equal(terminalStyles.includes("max-height: calc(100dvh - 24px)"), true);
  assert.equal(terminalStyles.includes("height: min(calc(100vh - 24px), 820px)"), false);
  assert.equal(terminalStyles.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"), true);
  assert.equal(portalSource.includes("rowsPerPage={3}"), true);
  assert.equal(terminalSource.includes('maxWidth="1040px"'), true);
  assert.equal(terminalSource.includes("pageSize={6}"), true);
  assert.equal(pickerStyles.includes("min-height: 204px"), true);
  assert.equal(pickerStyles.includes("padding: 12px 14px 6px"), true);
  assert.equal(pickerStyles.includes("gap: 8px"), true);
});
