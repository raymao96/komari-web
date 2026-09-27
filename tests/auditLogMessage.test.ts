import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatAuditMessage } from "../src/pages/admin/auditLogMessage.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function locale(name: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(root, "src", "i18n", "locales", name), "utf8"),
  ) as Record<string, unknown>;
}

function lookup(source: Record<string, unknown>, key: string): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);
  if (typeof value !== "string") throw new Error("missing " + key);
  return value;
}

function translate(source: Record<string, unknown>) {
  return (key: string, options?: Record<string, unknown>) => {
    let text = lookup(source, key);
    if (options) {
      for (const [name, value] of Object.entries(options)) {
        text = text.replaceAll("{{" + name + "}}", String(value));
      }
    }
    return text;
  };
}

test("setting logs use the on-screen name in every language", () => {
  const message = JSON.stringify({
    k: "audit.bool_on",
    p: { setting: "allow_mcp" },
  });
  const expected = {
    "zh_CN.json": "开启了「启用 MCP 代理」",
    "en.json": "Turned on Enable MCP Proxy",
    "ja_JP.json": "「MCP プロキシを有効にする」をオンにしました",
    "zh_TW.json": "開啟了「啟用 MCP 服務」",
  };
  for (const [filename, sentence] of Object.entries(expected)) {
    const text = formatAuditMessage(message, translate(locale(filename)));
    assert.equal(text, sentence, filename);
  }
});

test("log types use the current language", () => {
  const expected = {
    "zh_CN.json": "错误",
    "en.json": "Error",
    "ja_JP.json": "エラー",
    "zh_TW.json": "錯誤",
  };
  for (const [filename, label] of Object.entries(expected)) {
    assert.equal(lookup(locale(filename), "logs.types.error"), label, filename);
    assert.equal(lookup(locale(filename), "logs.types.warn"), filename.startsWith("en") ? "Warning" : lookup(locale(filename), "logs.types.warn"));
  }
  assert.equal(lookup(locale("zh_CN.json"), "logs.types.warn"), "警告");
  assert.equal(lookup(locale("zh_TW.json"), "logs.types.terminal"), "終端機");
  assert.equal(lookup(locale("ja_JP.json"), "logs.types.login"), "ログイン");
});

test("older plain log lines stay unchanged", () => {
  const message = "update settings: allow_mcp";
  assert.equal(
    formatAuditMessage(message, translate(locale("zh_CN.json"))),
    message,
  );
});

test("secret logs do not gain a value while changing language", () => {
  const message = JSON.stringify({
    k: "audit.secret_replace",
    p: { setting: "api_key" },
  });
  const text = formatAuditMessage(message, translate(locale("zh_CN.json")));
  assert.equal(text, "更换了「站点 API 密钥」");
});

test("command clipboard logs show the command name", () => {
  const message = JSON.stringify({
    k: "audit.clipboard_delete",
    p: { name: "test·" },
  });
  assert.equal(
    formatAuditMessage(message, translate(locale("zh_CN.json"))),
    "删除了命令剪贴板「test·」",
  );
  const older = JSON.stringify({
    k: "audit.clipboard_update",
    p: { id: "3" },
  });
  assert.equal(
    formatAuditMessage(older, translate(locale("zh_CN.json"))),
    "修改了命令剪贴板「#3」",
  );
});
