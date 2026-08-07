import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAccountPreferenceColor,
  normalizeAccountPreferenceLanguage,
  saveAccountPreferences,
} from "../src/utils/adminAuth.ts";

test("normalizes supported administrator language and color preferences", () => {
  assert.equal(normalizeAccountPreferenceLanguage("zh_HK"), "zh-TW");
  assert.equal(normalizeAccountPreferenceLanguage("en"), "en-US");
  assert.equal(normalizeAccountPreferenceLanguage("fr-FR"), "");
  assert.equal(normalizeAccountPreferenceColor("jade"), "jade");
  assert.equal(normalizeAccountPreferenceColor("invalid"), "");
});

test("saves preferences through the current administrator account", async () => {
  await saveAccountPreferences(
    { language: "zh-CN", color: "jade" },
    async (input, init) => {
      assert.equal(input, "/api/rpc2");
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        jsonrpc: "2.0",
        id: 1,
        method: "admin:updateAccountPreferences",
        params: { language: "zh-CN", color: "jade" },
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
      saveAccountPreferences({ color: "iris" }, async () =>
        new Response(
          JSON.stringify({ error: { message: "preference write failed" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    /preference write failed/,
  );
});
