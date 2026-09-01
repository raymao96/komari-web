import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const dialogSource = readFileSync("src/components/AppDialogContent.tsx", "utf8");
const themeSettingsSource = readFileSync("src/pages/admin/settings/theme.tsx", "utf8");
const themeManagedSource = readFileSync("src/pages/admin/theme_managed.tsx", "utf8");
const marketSource = readFileSync("src/pages/admin/market/themes.tsx", "utf8");
const uploadDialogSource = readFileSync("src/components/UploadDialog.tsx", "utf8");
const archiveUploadSource = readFileSync("src/utils/archiveUpload.ts", "utf8");
const globalStyles = readFileSync("src/global.css", "utf8");
const locales = [
  "en",
  "ja_JP",
  "zh_CN",
  "zh_TW",
].map((locale) =>
  JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, "utf8")),
);

test("theme management actions stay on one line on a two-column phone toolbar", () => {
  assert.match(themeSettingsSource, /grid w-full grid-cols-2/);
  assert.match(themeSettingsSource, /whitespace-nowrap/);
  assert.doesNotMatch(themeSettingsSource, /min-w-\[8rem\]/);
  assert.doesNotMatch(themeSettingsSource, /\$\{currentTheme\}设置/);
  assert.match(themeSettingsSource, /theme\.configure/);
  assert.match(themeManagedSource, /theme\.configure/);
  assert.doesNotMatch(themeManagedSource, /theme\.manage_with_name/);
  for (const locale of locales) {
    assert.equal(typeof locale.theme.configure, "string");
    assert.ok(locale.theme.configure.length > 0);
  }
});

test("theme pages share preview-image loading treatment", () => {
  assert.match(themeSettingsSource, /ThemePreviewImage/);
  assert.match(themeSettingsSource, /fetchThemeManifest\(/);
  assert.match(marketSource, /ThemePreviewImage/);
  assert.match(themeSettingsSource, /key=\{theme\.short\}/);
  assert.doesNotMatch(themeSettingsSource, /key=\{theme\.id\}/);
  assert.match(themeSettingsSource, /installedThemePreviewPath\(/);
  assert.match(themeSettingsSource, /themePreviewSrc\(/);
  assert.match(marketSource, /themePreviewSrc\(/);
  assert.match(
    readFileSync("src/lib/themeList.ts", "utf8"),
    /installedThemePreviewPath\(theme\)/,
  );
  assert.doesNotMatch(
    readFileSync("src/lib/themeList.ts", "utf8"),
    /warmupThemePreview\(theme\.preview\)/,
  );
  assert.match(themeSettingsSource, /loading="eager"/);
  assert.match(marketSource, /loading="eager"/);
  assert.doesNotMatch(themeSettingsSource, /style\.display = "none"/);
  assert.doesNotMatch(marketSource, /style\.display = "none"/);
  assert.match(marketSource, /data-admin-route-pending="true"/);
  assert.doesNotMatch(marketSource, /if \(loading\) return <Loading/);
  assert.match(themeSettingsSource, /data-admin-route-pending="true"/);
  assert.doesNotMatch(themeSettingsSource, /SettingsPageSkeleton/);
  assert.match(
    readFileSync("src/routes.ts", "utf8"),
    /prefetchThemeMarket/,
  );
  assert.match(
    readFileSync("src/routes.ts", "utf8"),
    /prefetchInstalledThemes/,
  );
  assert.match(globalStyles, /km-theme-preview-skeleton/);
  assert.match(globalStyles, /km-theme-preview-image\[data-loaded="true"\]/);
  assert.match(marketSource, /direction="column" gap="5"/);
  assert.match(globalStyles, /\.km-search-before-content \{\s*display: block;\s*margin-bottom: 20px;/);
});

test("theme and upload dialogs use shared dialog content and staged upload UI", () => {
  assert.match(themeSettingsSource, /AppDialogContent/);
  assert.match(marketSource, /AppDialogContent/);
  assert.match(dialogSource, /containsDialogDescription/);
  assert.match(dialogSource, /disabledDescriptionProps/);
  assert.match(
    dialogSource,
    /"aria-describedby": undefined,\s*}\s*as const/,
  );
  assert.match(uploadDialogSource, /normalizedState\.indeterminate/);
  assert.match(uploadDialogSource, /km-upload-indeterminate-bar/);
  assert.match(uploadDialogSource, /disabled=\{uploadActive\}/);
  assert.match(
    uploadDialogSource,
    /const showUploadPercent = normalizedState\?\.stage === "uploading"/,
  );
  assert.equal(
    uploadDialogSource.match(/state\.actionLabel/g)?.length,
    1,
    "non-cancelable copy must render in the status card only once",
  );
  assert.match(
    uploadDialogSource,
    /normalizedState\.stage !== "completed"[\s\S]*cancelUploadLabel \?\? closeLabel/,
  );
  assert.match(archiveUploadSource, /await delay\(UPLOAD_FINAL_PROGRESS_VISIBLE_MS\)/);
  assert.match(
    themeSettingsSource,
    /setUploadDialogOpen\(false\);\s*await delay\(UPLOAD_DIALOG_EXIT_MS\);\s*setTrackedUploadState\(null\)/,
  );
});

test("all application dialogs use the shared description contract", () => {
  const sourceFiles: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.name.endsWith(".tsx")) sourceFiles.push(fullPath);
    }
  };
  visit("src");

  const directDialogContentUsers = sourceFiles
    .filter((file) => readFileSync(file, "utf8").includes("<Dialog.Content"))
    .map((file) => file.replaceAll("\\", "/"));
  assert.deepEqual(directDialogContentUsers, ["src/components/AppDialogContent.tsx"]);
});

test("theme, site backup, and install staged-progress copy is present in every locale", () => {
  for (const locale of locales) {
    assert.equal(typeof locale.theme.preview_unavailable, "string");
    assert.equal(typeof locale.theme.preview_dialog_description, "string");
    assert.equal(typeof locale.theme.phase_preparing, "string");
    assert.equal(typeof locale.theme.phase_uploading, "string");
    assert.equal(typeof locale.theme.phase_processing, "string");
    assert.equal(typeof locale.theme.phase_completed, "string");
    assert.equal(typeof locale.theme.phase_non_cancelable, "string");

    assert.equal(typeof locale.settings.site.phase_preparing, "string");
    assert.equal(typeof locale.settings.site.phase_uploading, "string");
    assert.equal(typeof locale.settings.site.phase_processing, "string");
    assert.equal(typeof locale.settings.site.phase_restarting, "string");
    assert.equal(typeof locale.settings.site.phase_completed, "string");
    assert.equal(typeof locale.settings.site.phase_non_cancelable, "string");

    assert.equal(typeof locale.install.phase_preparing, "string");
    assert.equal(typeof locale.install.phase_uploading, "string");
    assert.equal(typeof locale.install.phase_processing, "string");
    assert.equal(typeof locale.install.phase_restarting, "string");
    assert.equal(typeof locale.install.phase_completed, "string");
    assert.equal(typeof locale.install.phase_non_cancelable, "string");
    assert.equal(typeof locale.install.phase_redirecting, "string");
    assert.equal(typeof locale.install.phase_redirect_countdown, "string");
  }
});
