import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GITHUB_ALERT_LABELS,
  remarkGithubAlerts,
} from "../src/utils/githubMarkdown.ts";

test("github alerts become styled callouts instead of raw markers", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "[!IMPORTANT]\nLite 2.3.0 版本 目前仍处于管理页面UI焕新阶段。",
              },
            ],
          },
        ],
      },
    ],
  };
  remarkGithubAlerts()(tree);
  const quote = tree.children[0];
  assert.equal(quote.data?.hProperties?.["data-alert"], "important");
  assert.deepEqual(quote.data?.hProperties?.className, [
    "km-md-alert",
    "km-md-alert--important",
  ]);
  assert.equal(
    quote.children?.[0]?.children?.[0]?.value,
    "Lite 2.3.0 版本 目前仍处于管理页面UI焕新阶段。",
  );
  assert.equal(GITHUB_ALERT_LABELS.important, "Important");
});


const source = [
  "src/components/admin/shell/AdminShell.tsx",
  "src/components/admin/shell/AdminSidebar.tsx",
  "src/components/admin/shell/AdminTopbar.tsx",
  "src/components/admin/shell/UpdateReleaseDialog.tsx",
  "src/components/admin/shell/useAdminShell.ts",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const brandSource = readFileSync("src/components/LiteBrand.tsx", "utf8");
const globalStyles = readFileSync("src/global.css", "utf8");
const appSource = readFileSync("src/main.tsx", "utf8");

test("admin branding shows Lite in accent blue", () => {
  assert.match(source, /<LiteBrand size=\{isMobile \? "sm" : "md"\} \/>/);
  assert.match(brandSource, /color: LITE_BLUE/);
  assert.match(brandSource, /LITE_NAME/);
  assert.doesNotMatch(brandSource, /Komari</);
  assert.doesNotMatch(brandSource, /bg-\[var\(--green-a3\)\]/);
});

test("the version link is shared by the desktop and mobile sidebar", () => {
  assert.match(source, /data-testid="sidebar-version"/);
  assert.match(source, /<Github/);
  assert.match(source, /strokeWidth=\{1\.5\}/);
  assert.match(
    source,
    /github\.com\/nuomiiiii\/Lite\/releases\/tag\/\$\{encodeURIComponent\(currentVersion\)\}/,
  );
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.doesNotMatch(source, /\{!isMobile && currentVersion/);
  assert.doesNotMatch(source, /hidden=\{isMobile\}/);
});

test("snapshot versions use the compact wrapped layout on desktop and mobile", () => {
  assert.match(source, /const snapshot = version\.match\(\/\^snapshot-/);
  assert.match(source, /text-sm font-normal leading-5/);
  assert.match(source, /<span className="block">Snapshot<\/span>/);
  assert.match(source, /whitespace-nowrap text-base font-normal leading-5/);
  assert.doesNotMatch(
    source,
    /<SidebarVersionLabel[\s\S]{0,160}isMobile=\{isMobile\}/,
  );
});

test("mobile navigation uses a drawer without hiding the page chrome", () => {
  assert.match(source, /testId="mobile-sidebar-trigger"/);
  assert.match(source, /testId="mobile-sidebar-close"/);
  assert.match(
    source,
    /variant=\{isMobile \? "temporary" : "permanent"\}/,
  );
  assert.match(source, /onClose=\{\(\) => setSidebarOpen\(false\)\}/);
});

test("admin shell owns the viewport while the mobile drawer locks only main content", () => {
  assert.match(source, /height: "var\(--app-viewport-height, 100vh\)"/);
  assert.match(
    source,
    /width: "100%",\s+overflow: "hidden",\s+overscrollBehavior: "none"/,
  );
  assert.match(
    source,
    /data-admin-scroll-container[\s\S]*overflowY: isMobile && sidebarOpen \? "hidden" : "auto"/,
  );
  assert.match(globalStyles, /--app-viewport-height: 100vh/);
  assert.match(
    globalStyles,
    /@supports \(height: 100dvh\)[\s\S]*--app-viewport-height: 100dvh/,
  );
  assert.match(appSource, /minHeight: "var\(--app-viewport-height, 100vh\)"/);
});

test("mobile navigation label is localized in every admin language", () => {
  for (const locale of ["zh_CN", "zh_TW", "en", "ja_JP"]) {
    const messages = JSON.parse(
      readFileSync(`src/i18n/locales/${locale}.json`, "utf8"),
    );
    assert.equal(typeof messages.navigation.open, "string");
    assert.notEqual(messages.navigation.open.trim(), "");
  }
});

test("desktop update dialog gives release notes enough space", () => {
  assert.match(source, /data-testid="admin-update-button"/);
  assert.match(source, /data-testid="admin-update-dialog"/);
  assert.match(source, /min\(920px, calc\(100vw - 3rem\)\)/);
  assert.match(source, /maxHeight: "min\(86dvh, 760px\)"/);
  assert.match(source, /overflow: "auto !important"/);
  assert.match(source, /flexShrink: 0/);
});

test("account menu reserves the destructive treatment for logout", () => {
  assert.match(source, /data-testid="admin-user-menu-button"/);
  assert.match(source, /data-testid="admin-account-security-menu-item"/);
  assert.match(
    source,
    /data-testid="admin-logout-menu-item"[\s\S]*?bgcolor: "rgba\(255, 86, 48, 0\.14\)"[\s\S]*?<Logout/,
  );
  assert.doesNotMatch(
    source,
    /data-testid="admin-logout-menu-item"[\s\S]*?navigate\("\/admin\/settings\/account-security/,
  );
});

test("update chrome uses a red new-release chip instead of a download tray", () => {
  const topbar = readFileSync("src/components/admin/shell/AdminTopbar.tsx", "utf8");
  const dialog = readFileSync(
    "src/components/admin/shell/UpdateReleaseDialog.tsx",
    "utf8",
  );
  assert.match(topbar, /<Chip/);
  assert.match(topbar, /color="error"/);
  assert.match(topbar, /label=\{t\("common\.update_available"\)\}/);
  assert.doesNotMatch(topbar, /SystemUpdateAlt/);
  assert.doesNotMatch(topbar, /from "@mui\/icons-material\/Upgrade"/);
  assert.doesNotMatch(topbar, /from "@mui\/icons-material\/NewReleases"/);
  assert.doesNotMatch(dialog, /from "@mui\/icons-material\/NewReleases"/);
  assert.doesNotMatch(dialog, /from "@mui\/icons-material\/Upgrade"/);
  assert.doesNotMatch(dialog, /SystemUpdateAlt/);
  assert.doesNotMatch(dialog, /from "@mui\/icons-material\/Download"/);
});

test("update dialog keeps its title, release body, and actions separated", () => {
  assert.match(source, /<DialogTitle/);
  assert.match(source, /<DialogContent[\s\S]*?dividers/);
  assert.match(source, /<DialogActions/);
  assert.match(source, /data-testid="admin-update-release"/);
  assert.match(source, /<Divider/);
  assert.match(source, /<Chip/);
  assert.doesNotMatch(source, /className="divide-y/);
  assert.doesNotMatch(source, /--gray-11/);
});

test("release notes render GitHub-flavored Markdown without raw HTML", () => {
  assert.match(source, /<ReactMarkdown/);
  assert.match(source, /remarkGfm, remarkGithubAlerts/);
  assert.match(source, /skipHtml/);
  assert.match(source, /km-md-alert--/);
  assert.doesNotMatch(source, /whitespace-pre-wrap/);
  assert.match(source, /rel="noopener noreferrer"/);
});
