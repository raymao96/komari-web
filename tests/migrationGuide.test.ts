import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storageSource = readFileSync(
  new URL("../src/pages/admin/update_storage_v4.tsx", import.meta.url),
  "utf8",
);
const legacySource = readFileSync(
  new URL("../src/pages/admin/update_1_2_7.tsx", import.meta.url),
  "utf8",
);
const shellSource = readFileSync(
  new URL("../src/components/install/MigrationGuideShell.tsx", import.meta.url),
  "utf8",
);

test("migration pages use the shared MUI guide shell with progress", () => {
  for (const source of [storageSource, legacySource]) {
    assert.match(source, /<MigrationGuideShell/);
    assert.match(source, /progress=\{progress\}/);
    assert.doesNotMatch(source, /GuideHeader/);
    assert.doesNotMatch(source, /@radix-ui\/themes/);
    assert.doesNotMatch(source, /from "@\/components\/admin\/ui"/);
  }
  assert.match(shellSource, /data-testid="migration-guide"/);
  assert.match(shellSource, /LinearProgress/);
  assert.match(shellSource, /LanguageMenu/);
  assert.match(shellSource, /ThemeMenu/);
  assert.match(shellSource, /LITE_NAME/);
  assert.match(shellSource, /LITE_BLUE/);
  assert.match(shellSource, /textTransform: "none"/);
  assert.match(
    shellSource,
    /\{subtitle \? \([\s\S]*\{showProgress \? \([\s\S]*LinearProgress/,
  );
});

test("migration pages do not overlay a login dialog", () => {
  for (const source of [storageSource, legacySource]) {
    assert.doesNotMatch(source, /RestrictedLoginDialog/);
    assert.doesNotMatch(source, /logged_in/);
  }
});

test("1.2.7 upgrade keeps driver choice, cleanup, and start confirmation", () => {
  assert.match(legacySource, /ToggleButtonGroup/);
  assert.match(legacySource, /<Dialog/);
  assert.match(legacySource, /confirm_sqlite_risk/);
  assert.match(legacySource, /datetime-local/);
});

test("migration pages support URL preview without calling the real APIs", () => {
  for (const source of [storageSource, legacySource]) {
    assert.match(source, /isGuidePreview/);
    assert.match(source, /if \(preview\) return/);
  }
});
