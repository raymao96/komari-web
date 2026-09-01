import assert from "node:assert/strict";
import test from "node:test";

import {
  clientCookieSuffix,
  isSafeTempKey,
  sameOriginApiPath,
  sameOriginFetchInit,
} from "../src/utils/security.ts";

test("API paths must stay on the current origin", () => {
  assert.equal(sameOriginApiPath("/api/login"), "/api/login");
  assert.equal(sameOriginApiPath("/api/rpc2"), "/api/rpc2");
  assert.throws(() => sameOriginApiPath("https://evil.example/api/login"));
  assert.throws(() => sameOriginApiPath("//evil.example/api/login"));
  assert.throws(() => sameOriginApiPath("api/login"));
});

test("same-origin fetch keeps cookies on this site and does not switch origin", () => {
  const init = sameOriginFetchInit({ method: "POST" });
  assert.equal(init.credentials, "same-origin");
  assert.equal(init.referrerPolicy, "same-origin");
  assert.equal(init.method, "POST");
});

test("HTTP pages keep cookies usable; Secure is not forced", () => {
  assert.equal(clientCookieSuffix(), "; path=/; SameSite=Lax");
  assert.doesNotMatch(clientCookieSuffix(), /Secure/);
});

test("temp_key cookies reject attribute injection", () => {
  assert.equal(isSafeTempKey("abcDEF12._-zz"), true);
  assert.equal(isSafeTempKey("short"), false);
  assert.equal(isSafeTempKey("bad; Secure"), false);
  assert.equal(isSafeTempKey("x".repeat(8) + "\n"), false);
});
