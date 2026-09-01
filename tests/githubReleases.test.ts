import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GITHUB_RELEASES_CACHE_KEY,
  GITHUB_RELEASES_CACHE_TTL_MS,
  GITHUB_RELEASES_IDLE_DELAY_MS,
  GITHUB_RELEASES_URL,
  readGithubReleasesCache,
  sanitizeGithubReleases,
  scheduleIdleGithubReleasesLoad,
  writeGithubReleasesCache,
} from "../src/utils/githubReleases.ts";

test("github release checks stay on the public Lite repo and skip private fields", () => {
  assert.equal(
    GITHUB_RELEASES_URL,
    "https://api.github.com/repos/nuomiiiii/Lite/releases?per_page=20",
  );
  assert.doesNotMatch(GITHUB_RELEASES_URL, /per_page=100/);
  const releases = sanitizeGithubReleases([
    {
      tag_name: "2.3.0",
      html_url: "https://github.com/nuomiiiii/Lite/releases/tag/2.3.0",
      body: "ok",
      token: "secret",
    },
    {
      tag_name: "bad",
      html_url: "https://evil.example/releases",
    },
  ]);
  assert.deepEqual(releases, [
    {
      tag_name: "2.3.0",
      html_url: "https://github.com/nuomiiiii/Lite/releases/tag/2.3.0",
      body: "ok",
    },
  ]);
});

test("cached github releases expire and ignore malformed payloads", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
  writeGithubReleasesCache(
    storage,
    [
      {
        tag_name: "2.3.0",
        html_url: "https://github.com/nuomiiiii/Lite/releases/tag/2.3.0",
      },
    ],
    1_000,
  );
  assert.ok(memory.get(GITHUB_RELEASES_CACHE_KEY));
  assert.equal(
    readGithubReleasesCache(storage, 1_000 + GITHUB_RELEASES_CACHE_TTL_MS + 1),
    null,
  );
  assert.equal(
    readGithubReleasesCache(storage, 1_000 + 60_000)?.[0]?.tag_name,
    "2.3.0",
  );
  memory.set(GITHUB_RELEASES_CACHE_KEY, "{not-json");
  assert.equal(readGithubReleasesCache(storage, 1_000), null);
});

test("github release fetch waits for idle time after the first paint", async () => {
  const loaded: number[] = [];
  const idleQueue: Array<() => void> = [];
  let startDelay: (() => void) | undefined;
  const stop = scheduleIdleGithubReleasesLoad({
    load: () => {
      loaded.push(1);
    },
    timers: {
      requestIdleCallback: (callback) => {
        idleQueue.push(callback);
        return idleQueue.length;
      },
      cancelIdleCallback: () => {
        idleQueue.length = 0;
      },
      setTimeout: (callback) => {
        startDelay = callback;
        return 1;
      },
      clearTimeout: () => {
        startDelay = undefined;
      },
    },
  });
  assert.equal(loaded.length, 0);
  startDelay?.();
  assert.equal(loaded.length, 0);
  idleQueue.shift()?.();
  assert.deepEqual(loaded, [1]);
  stop();
  assert.equal(GITHUB_RELEASES_IDLE_DELAY_MS, 2500);
});

test("admin shell loads github releases through the idle helper", () => {
  const source = readFileSync("src/components/admin/shell/useAdminShell.ts", "utf8");
  assert.match(source, /scheduleIdleGithubReleasesLoad/);
  assert.match(source, /readGithubReleasesCache/);
  assert.doesNotMatch(source, /per_page=100/);
  const helper = readFileSync("src/utils/githubReleases.ts", "utf8");
  assert.doesNotMatch(helper, /cache:\s*"no-cache"/);
});
