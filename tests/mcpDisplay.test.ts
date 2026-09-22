import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  nodeDisplayIP,
  nodeMCPUnavailableReason,
  nodeSupportsMCP,
  operationResultKey,
  previewLine,
  stripANSI,
} from "../src/utils/mcpDisplay.ts";

test("prefers IPv4 and falls back to IPv6 when the node has no IPv4", () => {
  assert.equal(
    nodeDisplayIP({ uuid: "dual", ipv4: "203.0.113.8", ipv6: "2001:db8::8" }),
    "203.0.113.8",
  );
  assert.equal(
    nodeDisplayIP({ uuid: "v6", ipv4: "  ", ipv6: "2001:db8::8" }),
    "2001:db8::8",
  );
  assert.equal(
    nodeDisplayIP({
      uuid: "v6-long",
      ipv6: "2409:8a28:4a62:2c10:0000:0000:0000:ca18",
    }),
    "2409:8a28:...ca18",
  );
});

test("strips ANSI color codes from command previews", () => {
  const raw = "\u001b[37;1mNextTrace\u001b[0;22m \u001b[90;1mv1.7.1\u001b[0;22m";
  assert.equal(stripANSI(raw), "NextTrace v1.7.1");
  assert.equal(previewLine(`\u001b[37;1mNextTrace\u001b[0;22m\npreferred API IP`), "NextTrace");
});

test("full MCP requires remote control and a current Agent capability", () => {
  assert.equal(
    nodeSupportsMCP({ remote_control_enabled: true, mcp_full: true, mcp_full_version: 1 }),
    true,
  );
  assert.equal(nodeSupportsMCP({ remote_control_enabled: true }), false);
  assert.equal(nodeSupportsMCP({ mcp_full: true, mcp_full_version: 1 }), false);
  assert.equal(
    nodeSupportsMCP({ remote_control_enabled: true, mcp_full: true, mcp_full_version: 0 }),
    false,
  );
  assert.equal(nodeMCPUnavailableReason({ remote_control_enabled: true }), "agent_old");
  assert.equal(nodeMCPUnavailableReason({ mcp_full: true, mcp_full_version: 1 }), "remote_off");
  assert.equal(
    nodeMCPUnavailableReason({ remote_control_enabled: true, mcp_full: true, mcp_full_version: 1 }),
    null,
  );
});

test("denied MCP operations map to the denied result key", () => {
  assert.equal(operationResultKey("denied"), "denied");
  assert.equal(operationResultKey("rejected"), "denied");
});

test("MCP authorization dialog offers a passkey button", () => {
  const source = readFileSync(new URL("../src/pages/admin/remote-management/mcp.tsx", import.meta.url), "utf8");
  assert.match(source, /confirmAdminPasskey/);
  assert.match(source, /mcp\.authorize_passkey/);
  assert.match(source, /approveRequest\(true\)/);
  assert.match(source, /\/api\/admin\/account\/passkeys/);
  assert.equal((source.match(/mcp\.authorize_passkey/g) || []).length, 1);
  assert.equal((source.match(/login\.passkey/g) || []).length, 0);
  assert.equal((source.match(/approveRequest\(true\)/g) || []).length, 1);
});
