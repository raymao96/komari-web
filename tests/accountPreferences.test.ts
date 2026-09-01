import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeAccountPreferenceColor,
  normalizeAccountPreferenceLanguage,
  saveAccountPreferences,
} from "../src/utils/adminAuth.ts";

test("administrator language menu keeps Simplified, Traditional, English, then Japanese", () => {
  const languageSource = readFileSync("src/utils/language.ts", "utf8");
  const chromeSource = readFileSync(
    "src/components/admin/shell/ChromeActions.tsx",
    "utf8",
  );
  const switchSource = readFileSync("src/components/Language.tsx", "utf8");
  const i18nSource = readFileSync("src/i18n/config.ts", "utf8");
  const mainSource = readFileSync("src/main.tsx", "utf8");
  const syncSource = readFileSync(
    "src/components/AccountPreferenceSync.tsx",
    "utf8",
  );
  assert.match(
    languageSource,
    /ADMIN_UI_LANGUAGES = \[[\s\S]*"zh-CN"[\s\S]*"zh-TW"[\s\S]*"en-US"[\s\S]*"ja-JP"/,
  );
  assert.match(chromeSource, /ADMIN_UI_LANGUAGES/);
  assert.match(switchSource, /ADMIN_UI_LANGUAGES/);
  assert.doesNotMatch(chromeSource, /Bahasa Indonesia/);
  assert.doesNotMatch(switchSource, /Bahasa Indonesia/);
  assert.doesNotMatch(
    i18nSource,
    /import en from ["']\.\/locales\/en\.json["']/,
  );
  assert.match(i18nSource, /import\("\.\/locales\/en\.json"\)/);
  assert.match(i18nSource, /import\("\.\/locales\/zh_CN\.json"\)/);
  assert.match(i18nSource, /export function preloadUiLocales/);
  assert.match(i18nSource, /export async function changeUiLanguage/);
  assert.match(mainSource, /i18nReady/);
  assert.match(chromeSource, /preloadUiLocales\(\)/);
  assert.match(chromeSource, /changeUiLanguage\(lang\.code\)/);
  assert.match(switchSource, /preloadUiLocales\(\)/);
  assert.match(switchSource, /changeUiLanguage\(lang\.code\)/);
  assert.match(syncSource, /changeUiLanguage\(savedLanguage\)/);
});

test("normalizes supported administrator language and ignores leftover accent colors", () => {
  assert.equal(normalizeAccountPreferenceLanguage("zh_HK"), "zh-TW");
  assert.equal(normalizeAccountPreferenceLanguage("en"), "en-US");
  assert.equal(normalizeAccountPreferenceLanguage("id-ID"), "en-US");
  assert.equal(normalizeAccountPreferenceLanguage("fr-FR"), "");
  assert.equal(normalizeAccountPreferenceColor("jade"), "");
  assert.equal(normalizeAccountPreferenceColor("iris"), "");
  assert.equal(normalizeAccountPreferenceColor("blue"), "");
  assert.equal(normalizeAccountPreferenceColor("invalid"), "");
});

test("saves language through the current administrator account", async () => {
  await saveAccountPreferences(
    { language: "zh-CN" },
    async (input, init) => {
      assert.equal(input, "/api/rpc2");
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        jsonrpc: "2.0",
        id: 1,
        method: "admin:updateAccountPreferences",
        params: { language: "zh-CN" },
      });
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: 1, result: null }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );
});

test("reports server preference failures without changing local fallback", async () => {
  await assert.rejects(
    () =>
      saveAccountPreferences({ language: "zh-CN" }, async () =>
        new Response(
          JSON.stringify({ error: { message: "preference write failed" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    /preference write failed/,
  );
});
