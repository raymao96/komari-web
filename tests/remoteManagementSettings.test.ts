import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isAllowRemoteManagementEnabled,
  isRemoteManagementPath,
} from "../src/utils/allowRemoteManagement.ts";

const generalSource = readFileSync("src/pages/admin/settings/general.tsx", "utf8");
const gateSource = readFileSync(
  "src/components/admin/RemoteManagementGate.tsx",
  "utf8",
);
const sidebarSource = readFileSync(
  "src/components/admin/shell/AdminSidebar.tsx",
  "utf8",
);
const execSource = readFileSync("src/pages/admin/exec.tsx", "utf8");
const xtermSource = readFileSync("src/pages/admin/settings/xtermjs.tsx", "utf8");
const terminalSource = readFileSync("src/pages/terminal/index.tsx", "utf8");
const layoutSource = readFileSync("src/pages/admin/_layout.tsx", "utf8");
const serversSource = readFileSync("src/pages/admin/index.tsx", "utf8");
const nodeDetailSource = readFileSync("src/pages/admin/NodeDetailPage.tsx", "utf8");
const locales = {
  zhCN: JSON.parse(readFileSync("src/i18n/locales/zh_CN.json", "utf8")),
  zhTW: JSON.parse(readFileSync("src/i18n/locales/zh_TW.json", "utf8")),
  en: JSON.parse(readFileSync("src/i18n/locales/en.json", "utf8")),
  ja: JSON.parse(readFileSync("src/i18n/locales/ja_JP.json", "utf8")),
};

test("remote management sits beside GeoIP under general settings", () => {
  const remoteIndex = generalSource.indexOf('id="remote-management"');
  const pageSizeIndex = generalSource.indexOf(
    "settings.general.admin_default_page_size",
  );
  const geoipIndex = generalSource.indexOf("settings.geoip.title");
  assert.ok(remoteIndex > pageSizeIndex);
  assert.ok(geoipIndex > remoteIndex);
  assert.match(generalSource, /navigation\.remote_management/);
  assert.doesNotMatch(
    generalSource.slice(geoipIndex),
    /settings\.general\.allow_remote_management/,
  );
});

test("the remote switch writes back into settings so leaving the page keeps the new value", () => {
  assert.match(
    generalSource,
    /allow_remote_management: checked[\s\S]*setSettings\(\(current\) => \(\{[\s\S]*allow_remote_management: checked/,
  );
});

test("remote management pages and launchers require the site switch", () => {
  assert.match(layoutSource, /RemoteManagementGateProvider/);
  assert.match(execSource, /RequireAllowRemoteManagement/);
  assert.match(xtermSource, /RequireAllowRemoteManagement/);
  assert.match(terminalSource, /RequireAllowRemoteManagement/);
  assert.match(sidebarSource, /guardRemoteManagementNav/);
  assert.match(serversSource, /ensureEnabled\(\)/);
  assert.match(nodeDetailSource, /ensureEnabled\(\)/);
  assert.match(gateSource, /ALLOW_REMOTE_MANAGEMENT_SETTING_PATH/);
});

test("the remote-management required prompt is a dialog on every screen size", () => {
  assert.match(gateSource, /<Dialog/);
  assert.match(gateSource, /maxWidth="sm"/);
  assert.match(gateSource, /onDismiss/);
  assert.match(gateSource, /settings\.general\.allow_remote_management_go_enable/);
  assert.doesNotMatch(gateSource, /AuthStandAlonePage/);
  assert.doesNotMatch(gateSource, /fullScreen/);
  assert.doesNotMatch(gateSource, /createPortal/);
  assert.doesNotMatch(gateSource, /sx=\{\{ py: 6, maxWidth: 560 \}\}/);
});

test("site remote-management helper treats only true as enabled", () => {
  assert.equal(isAllowRemoteManagementEnabled({ allow_remote_management: true }), true);
  assert.equal(isAllowRemoteManagementEnabled({ allow_remote_management: false }), false);
  assert.equal(isAllowRemoteManagementEnabled({}), false);
  assert.equal(isRemoteManagementPath("/admin/exec"), true);
  assert.equal(isRemoteManagementPath("/admin/settings/xtermjs"), true);
  assert.equal(isRemoteManagementPath("/terminal"), true);
  assert.equal(isRemoteManagementPath("/admin/servers"), false);
});

test("remote management copy is shortened and present in every locale", () => {
  assert.equal(
    locales.zhCN.settings.general.allow_remote_management_description,
    "站点级开关。开启后仍需 Agent 本地启用远程控制。",
  );
  assert.equal(
    locales.zhCN.settings.general.allow_remote_management_required_description,
    "站点未启用远程管理，请先开启该功能。",
  );
  for (const locale of Object.values(locales)) {
    assert.equal(typeof locale.settings.general.allow_remote_management_go_enable, "string");
    assert.equal(
      typeof locale.settings.general.allow_remote_management_required_title,
      "string",
    );
    assert.equal(
      typeof locale.settings.general.allow_remote_management_required_description,
      "string",
    );
  }
});
