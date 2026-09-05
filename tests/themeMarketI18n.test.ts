import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  localizeThemeMarketMessage,
  themeMarketI18nKey,
} from "../src/utils/themeMarketI18n.ts";

const marketSource = readFileSync("src/pages/admin/market/themes.tsx", "utf8");
const locales = {
  zhCN: JSON.parse(readFileSync("src/i18n/locales/zh_CN.json", "utf8")),
  zhTW: JSON.parse(readFileSync("src/i18n/locales/zh_TW.json", "utf8")),
  en: JSON.parse(readFileSync("src/i18n/locales/en.json", "utf8")),
  ja: JSON.parse(readFileSync("src/i18n/locales/ja_JP.json", "utf8")),
};

test("market install toast uses i18n instead of the English API message", () => {
  assert.match(marketSource, /toast\.success\(t\("market\.install_success"\)\)/);
  assert.doesNotMatch(marketSource, /payload\.message \|\| t\("market\.install_success"/);
  assert.match(marketSource, /localizeThemeMarketMessage/);
});

test("market API English strings map to locale keys in every language", () => {
  assert.equal(themeMarketI18nKey("Theme installed from market"), "market.install_success");
  assert.equal(
    themeMarketI18nKey("This theme does not provide an installable package"),
    "market.install_unavailable",
  );
  const keys = [
    "install_success",
    "install_unavailable",
    "theme_not_found",
    "source_unavailable",
    "checksum_mismatch",
    "manifest_mismatch",
  ];
  for (const locale of Object.values(locales)) {
    for (const key of keys) {
      const value = locale.market?.[key]?.trim() ?? "";
      assert.notEqual(value, "", `market.${key} is missing`);
    }
    assert.notEqual(locale.market.install_success, "Theme installed from market");
  }
  assert.equal(locales.zhCN.market.install_success, "主题安装成功");
  assert.equal(locales.zhTW.market.install_success, "主題安裝完成");
  assert.equal(locales.ja.market.install_success, "テーマをインストールしました");
  assert.equal(
    localizeThemeMarketMessage("Theme installed from market", (key) => key),
    "market.install_success",
  );
});
