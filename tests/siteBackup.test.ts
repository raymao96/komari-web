import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/pages/admin/settings/site.tsx", "utf8");
const locales = {
  en: JSON.parse(readFileSync("src/i18n/locales/en.json", "utf8")),
  id: JSON.parse(readFileSync("src/i18n/locales/id_ID.json", "utf8")),
  ja: JSON.parse(readFileSync("src/i18n/locales/ja_JP.json", "utf8")),
  zhCN: JSON.parse(readFileSync("src/i18n/locales/zh_CN.json", "utf8")),
  zhTW: JSON.parse(readFileSync("src/i18n/locales/zh_TW.json", "utf8")),
};

test("full and configuration exports download through authenticated requests", () => {
  assert.match(source, /downloadBackup\("full"\)/);
  assert.match(source, /downloadBackup\("config"\)/);
  assert.match(source, /response\.blob\(\)/);
  assert.match(source, /anchor\.download = filename/);
  assert.doesNotMatch(source, /window\.open\("\/api\/admin\/download\/backup/);
});

test("both backup rows use the same text action as restore", () => {
  assert.equal(source.match(/\{t\("common\.export"\)\}/g)?.length, 2);
  assert.match(source, /\{t\("common\.select"\)\}/);
  assert.doesNotMatch(source, /SettingCardIconButton/);
});

test("account backup hint points to the actual site settings page", () => {
  const hints = Object.values(locales).map(
    (locale) => locale.account_settings.looking_for_backup,
  );

  assert.deepEqual(hints, [
    "Looking for backups? They are now under System Settings > Site.",
    "Mencari cadangan? Sekarang tersedia di Pengaturan Sistem > Situs.",
    "バックアップは「システム設定 > サイト」に移動しました。",
    "正在寻找备份？现已迁移至「系统设置 > 站点」。",
    "正在尋找備份？現已移至「系統設定 > 站點」。",
  ]);
});
