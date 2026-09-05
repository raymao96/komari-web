import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isPrivateApplicationPath,
  isThemeNavigationCacheName,
  serviceWorkerScopeCoversPrivileged,
} from "../src/utils/preparePrivateApplication.ts";

test("private application paths include admin, terminal, install, and manage", () => {
  assert.equal(isPrivateApplicationPath("/admin"), true);
  assert.equal(isPrivateApplicationPath("/admin/exec"), true);
  assert.equal(isPrivateApplicationPath("/terminal"), true);
  assert.equal(isPrivateApplicationPath("/install"), true);
  assert.equal(isPrivateApplicationPath("/manage"), true);
  assert.equal(isPrivateApplicationPath("/"), false);
  assert.equal(isPrivateApplicationPath("/assets/app.js"), false);
});

test("privileged service worker scopes cover admin, terminal, api, and site root", () => {
  const origin = "https://monitor.example";
  assert.equal(serviceWorkerScopeCoversPrivileged(`${origin}/`, origin), true);
  assert.equal(serviceWorkerScopeCoversPrivileged(`${origin}/admin/`, origin), true);
  assert.equal(serviceWorkerScopeCoversPrivileged(`${origin}/terminal`, origin), true);
  assert.equal(serviceWorkerScopeCoversPrivileged(`${origin}/api/`, origin), true);
  assert.equal(serviceWorkerScopeCoversPrivileged(`${origin}/themes/`, origin), false);
});

test("theme cache cleanup only deletes theme navigation caches", () => {
  assert.equal(isThemeNavigationCacheName("lite-theme-precache"), true);
  assert.equal(isThemeNavigationCacheName("workbox-precache-v2"), true);
  assert.equal(isThemeNavigationCacheName("account-settings"), false);
});

test("admin boot inspects all service worker registrations before credentials", () => {
  const source = readFileSync("src/utils/preparePrivateApplication.ts", "utf8");
  const main = readFileSync("src/main.tsx", "utf8");
  assert.match(source, /getRegistrations\(\)/);
  assert.match(source, /unregister\(\)/);
  assert.match(source, /location\.reload\(\)/);
  assert.match(main, /await preparePrivateApplication\(\)/);
  assert.match(main, /createRoot/);
});

test("admin index does not import unused useAccount", () => {
  const source = readFileSync("src/pages/admin/index.tsx", "utf8");
  assert.doesNotMatch(source, /useAccount/);
});
