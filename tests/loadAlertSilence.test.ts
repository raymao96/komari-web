import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/pages/admin/notification/load.tsx", import.meta.url),
  "utf8",
);
const contextSource = readFileSync(
  new URL("../src/contexts/LoadAlertContext.tsx", import.meta.url),
  "utf8",
);
const centerSource = readFileSync(
  new URL("../src/pages/admin/notification/center.tsx", import.meta.url),
  "utf8",
);

for (const locale of ["en", "ja_JP", "zh_CN", "zh_TW"]) {
  test(`${locale} includes load-alert silence copy used by alert center`, () => {
    const messages = JSON.parse(
      readFileSync(
        new URL(`../src/i18n/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ).notification.load;
    for (const key of [
      "current_alerts",
      "silence_24h",
      "silence_3d",
      "silence_7d",
      "silence_forever",
      "unsilence",
    ]) {
      assert.equal(typeof messages[key], "string", key);
      assert.notEqual(messages[key].trim(), "", key);
    }
  });
}

test("load notifications keep a searchable configuration list without a current-alert tab", () => {
  assert.match(pageSource, /normalizedSearch/);
  assert.match(pageSource, /<LoadListToolbar[\s\S]*<LoadConfigurationTable/);
  assert.match(pageSource, /<AdminListShell/);
  assert.doesNotMatch(pageSource, /value="current"/);
  assert.doesNotMatch(pageSource, /CurrentLoadAlertsTable/);
  assert.doesNotMatch(pageSource, /useHeldTab/);
  assert.doesNotMatch(pageSource, /\/api\/admin\/notification\/load\/silence/);
  assert.doesNotMatch(pageSource, /\/api\/admin\/notification\/load\/current/);
  assert.doesNotMatch(contextSource, /\/api\/admin\/notification\/load\/current/);
  assert.doesNotMatch(contextSource, /refreshCurrent/);
});

test("load alert silence stays on alert center", () => {
  assert.match(centerSource, /\/api\/admin\/notification\/center\/silence/);
  assert.match(centerSource, /"off" \| "24h" \| "3d" \| "7d" \| "forever"/);
  assert.match(centerSource, /notification\.load\.silence_24h/);
});
