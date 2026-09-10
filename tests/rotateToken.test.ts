import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ClientTokenRequestError,
  rotateClientToken,
} from "../src/lib/clientToken.ts";
import { localizeTokenRotationError } from "../src/utils/tokenRotation.ts";

const source = readFileSync(path.resolve("src/pages/admin/index.tsx"), "utf8");
const tokenSource = readFileSync(path.resolve("src/lib/clientToken.ts"), "utf8");
const rotateSource = source.slice(
  source.indexOf("function RotateTokenButton"),
  source.indexOf("type InstallOptions"),
);

test("reset token action sits immediately before delete", () => {
  const rotate = source.indexOf("<RotateTokenButton node={node} />");
  const deletion = source.indexOf("<DeleteButton node={node} />");
  assert.ok(rotate >= 0);
  assert.ok(deletion > rotate);
  assert.equal(
    source.slice(rotate, deletion).includes("<"),
    true,
  );
  assert.match(
    source.slice(rotate, deletion),
    /^<RotateTokenButton node=\{node\} \/>\s*$/,
  );
});

test("rotate token uses the existing sensitive API and 2FA header", () => {
  assert.match(tokenSource, /\/api\/admin\/client\/token\/rotate/);
  assert.match(tokenSource, /method: "POST"/);
  assert.match(tokenSource, /JSON\.stringify\(\{ uuid \}\)/);
  assert.match(tokenSource, /X-2FA-Code/);
  assert.match(tokenSource, /cache: "no-store"/);
  assert.match(rotateSource, /rotateClientToken\(node\.uuid/);
  assert.match(rotateSource, /isClientTokenTwoFactorRequired/);
  assert.match(rotateSource, /isClientTokenTwoFactorInvalid/);
  assert.match(rotateSource, /identityAuthTitle/);
  assert.match(rotateSource, /id="admin-node-rotate-otp"/);
  assert.match(rotateSource, /otpInput\.length !== 6/);
});

test("rotate token success and error toasts never include the new token", () => {
  assert.match(rotateSource, /rotateTokenSuccess", \{ name: node\.name \}/);
  assert.match(rotateSource, /rotateTokenFailed/);
  assert.match(rotateSource, /localizeTokenRotationError/);
  assert.match(rotateSource, /await rotateClientToken\(node\.uuid/);
  assert.doesNotMatch(rotateSource, /toast\.[a-z]+\([\s\S]{0,240}(?:result\.token|previousTokenExpiresAt)/);
  assert.doesNotMatch(rotateSource, /result\.token|previousTokenExpiresAt/);
});

test("reset token button uses the refresh icon", () => {
  assert.match(rotateSource, /<RefreshCw size="18" \/>/);
  assert.doesNotMatch(rotateSource, /KeyRound/);
});

test("all admin languages include rotate token copy", () => {
  const expected = {
    en: {
      rotateToken: "Reset token",
      confirmRotateToken: "Reset token",
      rotateTokenSuccess: "Reset token for {{name}}",
      rotateTokenFailed: "Failed to reset token: {{error}}",
    },
    zh_TW: {
      rotateToken: "重設 Token",
      confirmRotateToken: "確認重設",
      rotateTokenSuccess: "已重設 {{name}} 的 Token",
      rotateTokenFailed: "重設 Token 失敗：{{error}}",
    },
    ja_JP: {
      rotateToken: "Token をリセット",
      confirmRotateToken: "リセットを確認",
      rotateTokenSuccess: "{{name}} の Token をリセットしました",
      rotateTokenFailed: "Token のリセットに失敗しました：{{error}}",
    },
    zh_CN: {
      rotateToken: "重置 Token",
      confirmRotateToken: "确认重置",
      rotateTokenSuccess: "已重置 {{name}} 的 Token",
      rotateTokenFailed: "重置 Token 失败：{{error}}",
    },
  } as const;
  for (const locale of ["en", "ja_JP", "zh_CN", "zh_TW"] as const) {
    const translations = JSON.parse(
      readFileSync(path.resolve(`src/i18n/locales/${locale}.json`), "utf8"),
    );
    const table = translations.admin.nodeTable;
    const want = expected[locale];
    for (const [key, value] of Object.entries(want)) {
      assert.equal(table[key], value, `${locale}.${key}`);
    }
    assert.ok(table.rotateTokenDescription);
    assert.ok(table.rotateTokenInstructions);
    assert.notEqual(table.rotateTokenDescription, table.rotateTokenInstructions);
  }
});

test("localizeTokenRotationError keeps the grace-period copy", () => {
  assert.equal(
    localizeTokenRotationError("a token rotation is already in progress"),
    "Token 重置仍在过渡期内，请先使用新 Token 重新部署 Agent；新 Token 首次成功连接后才能再次重置",
  );
  assert.equal(
    localizeTokenRotationError(
      "Token 重置仍在过渡期内，请先使用新 Token 重新部署 Agent；新 Token 首次成功连接后才能再次重置",
    ),
    "Token 重置仍在过渡期内，请先使用新 Token 重新部署 Agent；新 Token 首次成功连接后才能再次重置",
  );
  assert.equal(localizeTokenRotationError(""), "Token 重置失败");
});

test("rotateClientToken posts uuid and does not keep the new token", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          token: "new-token",
          previous_token_expires_at: "2026-01-01T00:00:00Z",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const result = await rotateClientToken("node-a", { twoFactorCode: "123456" });
    assert.equal(result, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/admin/client/token/rotate");
    assert.equal(calls[0].init?.method, "POST");
    assert.equal(calls[0].init?.body, JSON.stringify({ uuid: "node-a" }));
    const headers = new Headers(calls[0].init?.headers);
    assert.equal(headers.get("X-2FA-Code"), "123456");
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.doesNotMatch(tokenSource, /payload\.data\?\.token|return \{ token/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rotateClientToken surfaces 2FA required as a client token error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ status: "error", message: "2FA code is required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => rotateClientToken("node-a"),
      (error: unknown) => {
        assert.ok(error instanceof ClientTokenRequestError);
        assert.equal(error.status, 401);
        assert.match(error.message, /2FA code is required/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
