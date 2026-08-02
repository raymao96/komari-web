import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(
  readFileSync(new URL("../komari-theme.json", import.meta.url), "utf8"),
);
const supportedLocales = ["en", "zh-CN", "zh-TW", "ja", "id-ID"];
const viteConfig = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);
const themePage = readFileSync(
  new URL("../src/pages/admin/settings/theme.tsx", import.meta.url),
  "utf8",
);

test("default managed theme metadata covers every admin language", () => {
  for (const locale of supportedLocales) {
    assert.equal(
      typeof manifest.configuration.name[locale],
      "string",
      `configuration.name.${locale}`,
    );
  }

  for (const [index, field] of manifest.configuration.data.entries()) {
    for (const locale of supportedLocales) {
      assert.equal(
        typeof field.name?.[locale],
        "string",
        `configuration.data[${index}].name.${locale}`,
      );
      if (field.help) {
        assert.equal(
          typeof field.help[locale],
          "string",
          `configuration.data[${index}].help.${locale}`,
        );
      }
    }
  }
});

test("public theme navigation is always selected by the server", () => {
  assert.match(viteConfig, /navigateFallback:\s*null/);
  assert.doesNotMatch(viteConfig, /navigateFallbackDenylist/);
  assert.match(themePage, /clearThemeNavigationCache/);
  assert.match(themePage, /komari-active-theme-changed/);
});

test("theme market is a first-class page action", () => {
  assert.match(themePage, /<Store size=\{16\} \/>/);
  assert.match(themePage, /navigate\("\/admin\/market\/themes"\)/);
  assert.doesNotMatch(themePage, /variant="soft"\s+color="gray"[\s\S]*?<Store/);
  assert.doesNotMatch(themePage, /theme\.find_more/);
});
