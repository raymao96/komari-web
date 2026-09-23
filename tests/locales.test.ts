import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const LOCALES = ["zh_CN", "zh_TW", "en", "ja_JP"] as const;

function flatten(value: unknown, prefix = "", result: string[] = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, path, result);
    } else {
      result.push(path);
    }
  }
  return result;
}

function load(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/i18n/locales/${locale}.json`, import.meta.url), "utf8"),
  ) as Record<string, unknown>;
}

test("administrator locales share the same translation keys", () => {
  const keys = LOCALES.map((locale) => flatten(load(locale)).sort());
  keys.slice(1).forEach((current, index) => {
    const missing = keys[0].filter((key) => !current.includes(key));
    const extra = current.filter((key) => !keys[0].includes(key));
    assert.deepEqual(
      { locale: LOCALES[index + 1], missing, extra },
      { locale: LOCALES[index + 1], missing: [], extra: [] },
    );
  });
});

function valueAt(root: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, root);
}

test("ja and zh_TW account and login copy is not leftover Simplified Chinese", () => {
  const zh = load("zh_CN");
  const ja = load("ja_JP");
  const tw = load("zh_TW");
  const leftoverMarker =
    /密钥|登录|账户|自动登出|请选择|请输入|这把|当前环境|当前浏览器|已设置密码|用户名|时长|小时|分钟|单位|恢复默认|更换头像|选择图片|图片不能|授权失败|操作失败|不支持通行|通行密钥/;
  const leftover: string[] = [];
  for (const key of flatten(zh)) {
    if (!key.startsWith("account.") && !key.startsWith("login.")) continue;
    const source = valueAt(zh, key);
    if (typeof source !== "string" || !leftoverMarker.test(source)) continue;
    for (const [locale, data] of [
      ["ja_JP", ja],
      ["zh_TW", tw],
    ] as const) {
      const value = valueAt(data, key);
      if (value === source || (typeof value === "string" && leftoverMarker.test(value))) {
        leftover.push(`${locale} ${key}`);
      }
    }
  }
  assert.deepEqual(leftover, []);
  assert.equal(
    JSON.stringify((ja as { account?: Record<string, string> }).account?.passkey_confirm_failed ?? ""),
    JSON.stringify("本人確認が完了しませんでした。再試行してください。"),
  );
});
