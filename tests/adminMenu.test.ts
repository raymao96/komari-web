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
const adminPanelSource = readFileSync(
  new URL("../src/components/admin/AdminPanelBar.tsx", import.meta.url),
  "utf8",
);
const routesSource = readFileSync(new URL("../src/routes.ts", import.meta.url), "utf8");
const zhCN = JSON.parse(
  readFileSync(new URL("../src/i18n/locales/zh_CN.json", import.meta.url), "utf8"),
);

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
      "/admin/settings/dashboard",
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

test("loads the active theme configuration into the sidebar", () => {
  assert.match(adminPanelSource, /buildAdminMenuItems\(baseMenuItems, extraMenuItems\)/);
  assert.match(adminPanelSource, /\/themes\/\$\{encodeURIComponent\(currentTheme\)\}\/komari-theme\.json/);
  assert.match(adminPanelSource, /itemPath = "\/admin\/theme_managed"/);
  assert.match(adminPanelSource, /itemPath = "\/admin\/theme_raw"/);
  assert.match(adminPanelSource, /normalizeThemeRedirectTarget\(configuration\.data\)/);
  assert.equal(zhCN.theme.manage_with_name, "{{name}} 设置");
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

test("does not create an implicit second grid column on mobile", () => {
  assert.match(adminPanelSource, /className="md:col-span-2"/);
  assert.doesNotMatch(adminPanelSource, /className="col-span-2"/);
  assert.match(adminPanelSource, /open: \{\s+x: 0,\s+opacity: 1,/);
  assert.match(adminPanelSource, /closed: \{\s+x: 0,\s+opacity: 1,/);
  assert.match(adminPanelSource, /sidebarOpen\s+\? `\$\{DESKTOP_SIDEBAR_WIDTH\}px`\s+: "0px"/);
});

test("registers the dashboard settings route", () => {
  assert.match(routesSource, /path:\s*["']dashboard["']/);
  assert.match(routesSource, /pages\/admin\/settings\/dashboard/);
});
