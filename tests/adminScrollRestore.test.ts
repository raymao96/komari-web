import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  adminScrollStorageKey,
  readAdminScrollTop,
  shouldSkipAdminScrollRestore,
} from "../src/utils/adminScrollRestore.ts";

test("stores scroll against the admin path and query", () => {
  assert.equal(
    adminScrollStorageKey("/admin/return-route", "?tab=records"),
    "lite:admin:scroll:/admin/return-route?tab=records",
  );
  assert.equal(
    adminScrollStorageKey("/admin/billing", "years=2026"),
    "lite:admin:scroll:/admin/billing?years=2026",
  );
});

test("treats missing or invalid stored offsets as the top of the page", () => {
  assert.equal(readAdminScrollTop(null), 0);
  assert.equal(readAdminScrollTop("nope"), 0);
  assert.equal(readAdminScrollTop("-12"), 0);
  assert.equal(readAdminScrollTop("480.6"), 481);
});

test("lets the dashboard and in-page hashes keep their own restore", () => {
  assert.equal(shouldSkipAdminScrollRestore("/admin", ""), true);
  assert.equal(shouldSkipAdminScrollRestore("/admin/", ""), true);
  assert.equal(
    shouldSkipAdminScrollRestore("/admin/settings/reverse-proxy", "#certificate"),
    true,
  );
  assert.equal(
    shouldSkipAdminScrollRestore("/admin/return-route", ""),
    false,
  );
});

test("admin pages persist tabs in the URL and restore the shared scroll container", () => {
  const pages = [
    "src/pages/admin/returnRoute.tsx",
    "src/pages/admin/pingTask.tsx",
    "src/pages/admin/billing.tsx",
    "src/pages/admin/NodeDetailPage.tsx",
    "src/pages/admin/notification/load.tsx",
    "src/pages/admin/notification/ping_loss.tsx",
    "src/pages/admin/settings/account-security.tsx",
    "src/pages/admin/settings/reverse-proxy.tsx",
    "src/pages/admin/settings/metrics.tsx",
    "src/components/admin/ThemeConfigTabs.tsx",
  ];
  for (const file of pages) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /useAdminTabParam\(/, file);
  }

  const shell = readFileSync("src/components/admin/shell/AdminShell.tsx", "utf8");
  assert.match(shell, /useAdminScrollRestore\(scrollRef\)/);
  assert.match(shell, /ref=\{scrollRef\}/);
  assert.match(shell, /data-admin-scroll-container/);
});
