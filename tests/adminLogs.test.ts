import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logSource = readFileSync("src/pages/admin/log.tsx", "utf8");
const multiSelectSource = readFileSync("src/components/admin/AdminMultiSelect.tsx", "utf8");
const locales = {
  zhCN: JSON.parse(readFileSync("src/i18n/locales/zh_CN.json", "utf8")),
  en: JSON.parse(readFileSync("src/i18n/locales/en.json", "utf8")),
  zhTW: JSON.parse(readFileSync("src/i18n/locales/zh_TW.json", "utf8")),
  jaJP: JSON.parse(readFileSync("src/i18n/locales/ja_JP.json", "utf8")),
};

test("logs page uses type and time dropdowns and searches ip plus message", () => {
  assert.match(logSource, /AdminListSearch/);
  assert.match(logSource, /AdminMultiSelect/);
  assert.match(logSource, /AdminListFiltersBar/);
  assert.match(logSource, /logs\.search_placeholder/);
  assert.match(logSource, /params\.set\("q", search\)/);
  assert.match(logSource, /params\.set\("msg_type"/);
  assert.match(logSource, /params\.set\("day"/);
  assert.match(logSource, /t\("logs\.type"/);
  assert.match(logSource, /t\("logs\.time"/);
  assert.match(logSource, /Tooltip/);
  assert.match(logSource, /admin-cell-clip km-log-message/);
  assert.match(logSource, /resolvedTypeOptions/);
  assert.match(logSource, /resolvedDayOptions/);
  assert.match(logSource, /AdminActiveFilters/);
  assert.match(logSource, /clearAllFilters/);
  assert.match(logSource, /admin\.nodeTable\.clearAllFilters|onClearAll/);
  assert.doesNotMatch(logSource, /slice\(0,\s*75\)/);
  assert.doesNotMatch(logSource, />Type</);
  assert.doesNotMatch(logSource, />Message</);
});

test("log filter selects clip selected values instead of growing", () => {
  assert.match(multiSelectSource, /maxWidth: \{ xs: "100%", md: 184 \}/);
  assert.match(multiSelectSource, /textOverflow: "ellipsis"/);
  assert.match(multiSelectSource, /minWidth: 0/);
  assert.doesNotMatch(
    multiSelectSource,
    /ADMIN_MULTI_SELECT_SX = \{[^}]*overflow: "hidden"/,
  );
});

test("logs locale keys cover table headers and search", () => {
  for (const [name, contents] of Object.entries(locales)) {
    const logs = contents.logs as Record<string, string>;
    for (const key of [
      "empty",
      "error",
      "filter_count",
      "id",
      "ip",
      "message",
      "search_placeholder",
      "time",
      "title",
      "type",
      "uuid",
    ]) {
      assert.ok(logs[key]?.trim(), `${name} logs.${key} is missing`);
    }
  }
  assert.equal(locales.zhCN.logs.search_placeholder, "搜索 IP、内容...");
  assert.equal(locales.zhTW.logs.title, "日誌");
});
