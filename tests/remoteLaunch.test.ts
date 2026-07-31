import assert from "node:assert/strict";
import test from "node:test";

import {
  parseLegacyRemoteLaunchTarget,
  parseRemoteLaunchHash,
  remoteTerminalPath,
} from "../src/utils/remoteLaunch.ts";

test("keeps a remote launch target available across repeated terminal mounts", () => {
  const uuid = "node/a + b";
  const hash = new URL(`https://monitor.example${remoteTerminalPath(uuid)}`).hash;

  assert.equal(parseRemoteLaunchHash(hash), uuid);
  assert.equal(parseRemoteLaunchHash(hash), uuid);
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

test("accepts an unexpired legacy session-storage launch during upgrades", () => {
  const now = 1_000;
  const raw = JSON.stringify({ uuid: "legacy-node", expiresAt: now + 30_000 });

  assert.equal(parseLegacyRemoteLaunchTarget(raw, now), "legacy-node");
  assert.equal(parseLegacyRemoteLaunchTarget(raw, now + 30_001), null);
  assert.equal(parseLegacyRemoteLaunchTarget("not-json", now), null);
});
