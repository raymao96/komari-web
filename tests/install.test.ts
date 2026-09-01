import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/pages/install.tsx", "utf8");
const shellSource = readFileSync(
  "src/components/install/InstallGuideShell.tsx",
  "utf8",
);
const appSource = readFileSync("src/main.tsx", "utf8");
const loadingSource = readFileSync("src/components/loading.tsx", "utf8");

test("completed installations never expose an actionable installer", () => {
  assert.match(source, /if \(ready === null\)[\s\S]*if \(ready === false\)/);
  assert.match(source, /window\.location\.replace\("\/"\)/);
  assert.match(source, /INSTALL_REDIRECT_DELAY_MS = 2500/);
  assert.match(source, /setReady\(false\)/);
  assert.doesNotMatch(source, /window\.location\.assign\("\/"\), 1200/);
});

test("completed installation messaging is localized", () => {
  for (const locale of ["zh_CN", "zh_TW", "en", "ja_JP"]) {
    const messages = JSON.parse(
      readFileSync(`src/i18n/locales/${locale}.json`, "utf8"),
    );
    assert.equal(typeof messages.install.completed_title, "string");
    assert.notEqual(messages.install.completed_title.trim(), "");
    assert.equal(typeof messages.install.completed, "string");
    assert.notEqual(messages.install.completed.trim(), "");
  }
});

test("completed installation reuses the MUI installation shell", () => {
  assert.match(source, /<InstallGuideShell/);
  assert.match(source, /completedSteps=\{ALL_STEPS_COMPLETED\}/);
  assert.match(source, /completed/);
  assert.match(source, /install\.guide\.enter_console/);
  assert.doesNotMatch(source, /@radix-ui\/themes/);
});

test("install restore uses staged progress and an explicit restart countdown", () => {
  assert.match(source, /phase_uploading/);
  assert.match(source, /phase_processing/);
  assert.match(source, /phase_restarting/);
  assert.match(source, /phase_completed/);
  assert.match(source, /setRestartCountdown\(5\)/);
  assert.match(source, /phase_redirect_countdown/);
  assert.doesNotMatch(source, /setRestoreProgress/);
});

test("restore entry is rendered only for the welcome step", () => {
  assert.match(shellSource, /!completed && step === 0 && onRestore/);
  assert.match(source, /step > 0 \? \(/);
  assert.match(source, /install\.guide\.restore_backup/);
  assert.doesNotMatch(source, /step > 0[\s\S]{0,200}setRestoreOpen\(true\)/);
});

test("installation shell uses the current Lite icon and explicit responsive ranges", () => {
  assert.match(
    shellSource,
    /assets\/logo\.png\?v=lite-icon-0e86dd/,
  );
  assert.doesNotMatch(shellSource, />L<\/Box>/);
  assert.match(shellSource, /min-width: 768px/);
  assert.match(shellSource, /min-width: 1200px/);
  assert.match(shellSource, /install-compact-summary/);
});

test("global route suspense uses the shared full-screen MUI loading state", () => {
  assert.match(appSource, /<Loading fullscreen \/>/);
  assert.match(loadingSource, /CircularProgress/);
  assert.match(loadingSource, /fullscreen \? "100dvh"/);
  assert.doesNotMatch(loadingSource, /showbox|className="loader"|Loading\.css/);
});

test("database modes preserve separate drafts and submit the existing API field", () => {
  assert.match(source, /sqliteDraft/);
  assert.match(source, /externalDraft/);
  assert.match(source, /metric_dsn: metricDSN/);
  assert.match(source, /isSQLiteDSN\(metricDSN\)/);
});

test("new installation guide copy exists in English and Simplified Chinese", () => {
  for (const locale of ["zh_CN", "en"]) {
    const messages = JSON.parse(
      readFileSync(`src/i18n/locales/${locale}.json`, "utf8"),
    );
    assert.equal(typeof messages.install.guide.start_setup, "string");
    assert.equal(typeof messages.install.guide.restore_backup, "string");
    assert.equal(typeof messages.install.guide.steps.confirm.title, "string");
    assert.equal(typeof messages.install.guide.completed_description, "string");
  }
});
