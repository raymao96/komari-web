import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  isSafeRemoteNodeId,
  parseRemoteLaunchHash,
  remoteTerminalPath,
} from "../src/utils/remoteLaunch.ts";

const launchSource = readFileSync("src/utils/remoteLaunch.ts", "utf8");

test("keeps a remote launch target available across repeated terminal mounts", () => {
  const uuid = "6bd2f898-ef35-48ba-b5c0-ad1d6222dc84";
  const hash = new URL(`https://monitor.example${remoteTerminalPath(uuid)}`).hash;

  assert.equal(parseRemoteLaunchHash(hash), uuid);
  assert.equal(parseRemoteLaunchHash(hash), uuid);
});

test("rejects attacker-controlled node ids in the launch hash", () => {
  assert.equal(isSafeRemoteNodeId("6bd2f898-ef35-48ba-b5c0-ad1d6222dc84"), true);
  assert.equal(isSafeRemoteNodeId("node-a"), true);
  assert.equal(parseRemoteLaunchHash("#node=%3Cscript%3Ealert(1)%3C/script%3E"), null);
  assert.equal(parseRemoteLaunchHash("#node=../etc/passwd"), null);
  assert.equal(parseRemoteLaunchHash("#node=node/a%20%2B%20b"), null);
});

test("keeps consecutive remote launch targets independent", () => {
  const firstHash = new URL(`https://monitor.example${remoteTerminalPath("node-a")}`).hash;
  const secondHash = new URL(`https://monitor.example${remoteTerminalPath("node-b")}`).hash;

  assert.equal(parseRemoteLaunchHash(firstHash), "node-a");
  assert.equal(parseRemoteLaunchHash(secondHash), "node-b");
});

test("keeps the remote node target out of Cloudflare and server requests", () => {
  const target = new URL(`https://monitor.example${remoteTerminalPath("node-a")}`);

  assert.equal(target.pathname, "/terminal");
  assert.equal(target.search, "");
  assert.equal(target.hash, "#node=node-a");
});

test("does not keep a remote grant or launch target in browser storage", () => {
  assert.doesNotMatch(launchSource, /sessionStorage/);
  assert.doesNotMatch(launchSource, /localStorage/);
  assert.doesNotMatch(launchSource, /komari\.remote\.launch/);
  assert.doesNotMatch(launchSource, /lite\.remote\.launch/);
});

test("opens remote terminal in the same tab on compact viewports", () => {
  assert.match(launchSource, /max-width:599\.95px/);
  assert.match(launchSource, /window\.location\.assign\(path\)/);
  assert.match(launchSource, /window\.open\(path, "_blank"\)/);
});
