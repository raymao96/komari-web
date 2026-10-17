import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mcpAuthorizationPolicy } from "../src/utils/mcpAuthorization.ts";

const initial = {
  selected: ["node-a"],
  allNodes: false,
  keepExpiry: false,
  durationMinutes: 30,
  longTerm: false,
  note: "test",
};

test("existing selections never implicitly become all-server grants", () => {
  assert.deepEqual(mcpAuthorizationPolicy(initial), {
    target_uuids: ["node-a"],
    all_nodes: false,
    duration_minutes: 30,
    long_term: false,
    note: "test",
  });
  assert.equal(mcpAuthorizationPolicy({ ...initial, selected: [] }).all_nodes, false);
});

test("all-server scope is a policy, not the current or filtered node snapshot", () => {
  for (const selected of [[], ["node-a"], ["node-a", "node-b"]]) {
    const payload = mcpAuthorizationPolicy({ ...initial, selected, allNodes: true });
    assert.equal(payload.all_nodes, true);
    assert.deepEqual(payload.target_uuids, []);
  }
});

test("editing nodes keeps expiry unless the administrator explicitly changes it", () => {
  const payload = mcpAuthorizationPolicy({
    ...initial, keepExpiry: true, durationMinutes: null, longTerm: true,
  });
  assert.equal("duration_minutes" in payload, false);
  assert.equal("long_term" in payload, false);
  assert.deepEqual(payload.target_uuids, ["node-a"]);
  assert.equal(mcpAuthorizationPolicy({ ...initial, longTerm: true }).long_term, true);
  assert.equal(mcpAuthorizationPolicy({ ...initial, durationMinutes: 90 }).duration_minutes, 90);
});

test("scope can be narrowed again without mutating the selected-node draft", () => {
  const selected = ["node-b"];
  mcpAuthorizationPolicy({ ...initial, selected, allNodes: true });
  const payload = mcpAuthorizationPolicy({ ...initial, selected });
  assert.deepEqual(selected, ["node-b"]);
  assert.equal(payload.all_nodes, false);
  assert.deepEqual(payload.target_uuids, ["node-b"]);
});

test("the editor reuses verification and does not restart OAuth or poll requests", () => {
  const source = readFileSync("src/pages/admin/remote-management/mcp.tsx", "utf8");
  assert.match(source, /selected\.status === "active"[\s\S]*?onEdit\(selected\)/);
  assert.match(source, /const keepExpiry = Boolean\(editLease && !changeDuration\)/);
  assert.match(source, /!open \|\| requestID \|\| editLease/);
  assert.match(source, /`\/api\/admin\/mcp\/leases\/\$\{editLease\.id\}`/);
  assert.match(source, /if \(editLease\) toast\.success/);
  assert.match(source, /else onConnected/);
  assert.match(source, /password: usePasskey \|\| twoFaEnabled/);
  assert.match(source, /otp: usePasskey \|\| !twoFaEnabled/);
  assert.match(source, /confirmAdminPasskey/);
  assert.match(source, /disabled=\{allNodes \|\| !capable\}/);
  assert.match(source, /lease\.all_nodes \? String\(i18n\.t\("mcp\.all_servers"\)\)/);
});

test("all locales explain the scope and editing security boundary", () => {
  for (const locale of ["zh_CN", "zh_TW", "en", "ja_JP"]) {
    const pack = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, "utf8"));
    for (const key of ["all_servers", "all_servers_hint", "edit_authorization", "edit_authorization_hint", "change_duration", "authorization_updated", "save_passkey"]) {
      assert.equal(typeof pack.mcp[key], "string", `${locale}: ${key}`);
      assert.ok(pack.mcp[key].length > 0);
    }
    assert.equal(typeof pack.audit.mcp_update, "string");
    assert.match(pack.mcp.edit_authorization_hint, /只改备注|只改備註|only the note|メモだけ/);
  }
});
