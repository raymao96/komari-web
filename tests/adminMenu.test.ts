import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APPEARANCE_MENU_PATH,
  buildAdminMenuItems,
  toggleSingleSubMenu,
} from "../src/utils/adminMenu.ts";
import type { MenuItem } from "../src/types/menu.ts";

const menuConfig = JSON.parse(
  readFileSync(new URL("../src/config/menuConfig.json", import.meta.url), "utf8"),
) as { menu: MenuItem[]; footer: MenuItem[] };

function allPaths(items: MenuItem[]): string[] {
  return items.flatMap((item) => [item.path, ...allPaths(item.children ?? [])]);
}

test("keeps the admin navigation in the intended groups", () => {
  assert.deepEqual(
    menuConfig.menu.map((item) => item.path),
    [
      "/admin",
      "/admin/servers",
      "/admin/monitoring",
      "/admin/remote-management",
      "/admin/notifications",
      "/admin/appearance",
      "/admin/settings",
    ],
  );

  const systemSettings = menuConfig.menu.find(
    (item) => item.path === "/admin/settings",
  );
  assert.deepEqual(
    systemSettings?.children?.map((item) => item.path),
    [
      "/admin/settings/site",
      "/admin/settings/reverse-proxy",
      "/admin/settings/metrics",
      "/admin/settings/account-security",
      "/admin/settings/general",
    ],
  );

  const paths = allPaths(menuConfig.menu);
  assert.equal(paths.includes("/"), false);
  assert.equal(
    paths.filter((path) => path === "/admin/settings/metrics").length,
    1,
  );
  assert.equal(paths.includes("/admin/account-security"), false);

  const notifications = menuConfig.menu.find(
    (item) => item.path === "/admin/notifications",
  );
  assert.ok(
    notifications?.children?.some(
      (item) => item.path === "/admin/settings/notification",
    ),
  );

  const remoteManagement = menuConfig.menu.find(
    (item) => item.path === "/admin/remote-management",
  );
  assert.deepEqual(
    remoteManagement?.children?.map((item) => item.path),
    [
      "/admin/exec",
      "/admin/terminal",
      "/admin/settings/xtermjs",
    ],
  );

  assert.deepEqual(
    menuConfig.footer.map((item) => item.path),
    [
      "/admin/logs",
      "https://nuomiiiii.github.io/komari-document/",
    ],
  );
  assert.equal(allPaths(menuConfig.footer).includes("/admin/about"), false);
});

test("places dynamic theme configuration inside the appearance group", () => {
  const dynamicTheme: MenuItem = {
    labelKey: "Current theme settings",
    rawLabel: "Current theme settings",
    path: "/admin/theme-settings",
    icon: "Palette",
  };
  const result = buildAdminMenuItems(menuConfig.menu, [dynamicTheme]);
  const appearance = result.find((item) => item.path === APPEARANCE_MENU_PATH);

  assert.equal(result.some((item) => item.path === dynamicTheme.path), false);
  assert.equal(
    appearance?.children?.at(-1)?.path,
    dynamicTheme.path,
  );
});

test("keeps only one sidebar group expanded", () => {
  assert.deepEqual(
    toggleSingleSubMenu({ "/admin/monitoring": true }, "/admin/settings"),
    { "/admin/settings": true },
  );
  assert.deepEqual(
    toggleSingleSubMenu({ "/admin/settings": true }, "/admin/settings"),
    {},
  );
});
