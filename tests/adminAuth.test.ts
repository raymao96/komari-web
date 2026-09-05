import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchAccount,
  isAdminNodeBootstrapLoading,
  loginErrorI18nKey,
  loginTwoFactorRequiredMessage,
  localizeLoginError,
  passwordLoginRequiresTwoFactor,
  planAdminSettingsFetch,
  resolveAdminAuthView,
  shouldOpenRpc2Socket,
  submitPasswordLogin,
} from "../src/utils/adminAuth.ts";

test("登录切换期间保持后台启动加载状态", () => {
  assert.equal(isAdminNodeBootstrapLoading(true, null, null), true);
  assert.equal(isAdminNodeBootstrapLoading(false, "account-1", null), true);
  assert.equal(
    isAdminNodeBootstrapLoading(false, "account-1", "__preauthenticated__", true),
    false,
  );
  assert.equal(
    isAdminNodeBootstrapLoading(false, "account-1", "account-1"),
    false,
  );
});

test("未登录时只进入登录视图", () => {
  assert.equal(
    resolveAdminAuthView({
      account: { logged_in: false },
      loading: false,
      error: null,
    }),
    "login",
  );
});

test("只有已登录才拉管理设置，未登录和核对中都丢弃", () => {
  assert.equal(
    planAdminSettingsFetch({
      hasAccountContext: false,
      accountLoading: false,
      loggedIn: false,
    }),
    "fetch",
  );
  assert.equal(
    planAdminSettingsFetch({
      hasAccountContext: true,
      accountLoading: true,
      loggedIn: false,
    }),
    "reset",
  );
  assert.equal(
    planAdminSettingsFetch({
      hasAccountContext: true,
      accountLoading: false,
      loggedIn: false,
    }),
    "reset",
  );
  assert.equal(
    planAdminSettingsFetch({
      hasAccountContext: true,
      accountLoading: false,
      loggedIn: true,
    }),
    "fetch",
  );
});

test("只有已登录才打开管理 RPC 套接字", () => {
  assert.equal(shouldOpenRpc2Socket(false), false);
  assert.equal(shouldOpenRpc2Socket(true), true);
});

test("已登录后才进入后台视图", () => {
  assert.equal(
    resolveAdminAuthView({
      account: { logged_in: true },
      loading: false,
      error: null,
    }),
    "admin",
  );
});

test("账户接口失败时进入可重试错误视图", async () => {
  await assert.rejects(
    () => fetchAccount(async () => new Response(null, { status: 503 })),
    /Failed to fetch account data \(503\)/,
  );
  assert.equal(
    resolveAdminAuthView({
      account: null,
      loading: false,
      error: new Error("request failed"),
    }),
    "error",
  );
});

test("登录成功后刷新外层账户信息", async () => {
  let refreshCount = 0;

  const result = await submitPasswordLogin({
    username: "admin",
    password: "secret",
    fetcher: async (input, init) => {
      assert.equal(input, "/api/login");
      assert.equal(init?.method, "POST");
      assert.equal(init?.credentials, "same-origin");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        username: "admin",
        password: "secret",
      });
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    refreshAccount: async () => {
      refreshCount += 1;
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(refreshCount, 1);
});

test("密码正确且需要 2FA 时进入第二步，而不是当成登录失败", async () => {
  const result = await submitPasswordLogin({
    username: "admin",
    password: "secret",
    fetcher: async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        username: "admin",
        password: "secret",
      });
      return new Response(
        JSON.stringify({ status: "error", message: loginTwoFactorRequiredMessage }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
    refreshAccount: async () => {
      throw new Error("must not refresh before 2FA succeeds");
    },
  });

  assert.equal(passwordLoginRequiresTwoFactor(loginTwoFactorRequiredMessage), true);
  assert.deepEqual(result, {
    ok: false,
    message: loginTwoFactorRequiredMessage,
    requiresTwoFactor: true,
  });
});

test("第二步会带上 2FA 验证码", async () => {
  const result = await submitPasswordLogin({
    username: "admin",
    password: "secret",
    twoFactorCode: "123456",
    fetcher: async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        username: "admin",
        password: "secret",
        "2fa_code": "123456",
      });
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    refreshAccount: async () => {},
  });

  assert.deepEqual(result, { ok: true });
});

test("登录接口英文错误映射到文案键，不直接展示原文", () => {
  assert.equal(loginErrorI18nKey("Invalid credentials"), "login.invalid_credentials");
  assert.equal(loginErrorI18nKey("invalid credentials"), "login.invalid_credentials");
  assert.equal(loginErrorI18nKey("Password login is disabled"), "login.password_login_disabled");
  assert.equal(loginErrorI18nKey("Failed to verify login"), "login.failed");
  assert.equal(loginErrorI18nKey("Failed to create session: boom"), "login.failed");
  assert.equal(loginErrorI18nKey("Login failed (401)"), "login.failed");
  assert.equal(loginErrorI18nKey("系统繁忙，请稍后重试"), "login.busy");
  assert.equal(
    loginErrorI18nKey("Invalid request body: Username and password are required"),
    "login.required",
  );
  assert.equal(localizeLoginError("Invalid credentials", (key) => key), "login.invalid_credentials");
});
