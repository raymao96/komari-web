import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  collectRemoteTerminalHighlights,
  REMOTE_HIGHLIGHT_COLORS,
} from "../src/pages/terminal/remoteTerminalHighlight.ts";

function kinds(text: string) {
  return collectRemoteTerminalHighlights(text).map((span) => ({
    kind: span.kind,
    text: text.slice(span.start, span.end),
  }));
}

test("colors IPv4, CIDR, and host:port from SSH.hls plus attached ports", () => {
  assert.deepEqual(kinds("inet 216.195.195.17/24 brd 216.195.195.25"), [
    { kind: "ipv4", text: "216.195.195.17/24" },
    { kind: "ipv4", text: "216.195.195.25" },
  ]);
  assert.deepEqual(kinds("64 bytes from 50.118.187.31: icmp_seq=1"), [
    { kind: "ipv4", text: "50.118.187.31" },
  ]);
  assert.deepEqual(kinds("bind 1.2.3.4:22"), [
    { kind: "ipv4", text: "1.2.3.4" },
    { kind: "port", text: ":22" },
  ]);
  assert.equal(kinds("version 1.06").length, 0);
  assert.equal(kinds("999.999.999.999").length, 0);
  assert.deepEqual(kinds("1.2.3.4:99999"), [{ kind: "ipv4", text: "1.2.3.4" }]);
});

test("keeps MAC ahead of IPv6 and still colors compressed v6", () => {
  assert.deepEqual(kinds("link/ether bc:24:11:40:88:81 brd ff:ff:ff:ff:ff:ff"), [
    { kind: "mac", text: "bc:24:11:40:88:81" },
    { kind: "mac", text: "ff:ff:ff:ff:ff:ff" },
  ]);
  assert.deepEqual(kinds("inet6 2a0f:1cc6:b225:0:9104:4afe:90eb:eda9/64"), [
    { kind: "ipv6", text: "2a0f:1cc6:b225:0:9104:4afe:90eb:eda9/64" },
  ]);
  assert.deepEqual(kinds("inet6 2a11:8081:300:2d::a/64"), [
    { kind: "ipv6", text: "2a11:8081:300:2d::a/64" },
  ]);
  assert.deepEqual(kinds("inet6 fe80::be24:11ff:fe40:8881/64"), [
    { kind: "ipv6", text: "fe80::be24:11ff:fe40:8881/64" },
  ]);
  assert.deepEqual(kinds("inet6 ::1/128"), [{ kind: "ipv6", text: "::1/128" }]);
  assert.deepEqual(kinds("from 2001:4860:4826:400::: icmp_seq=1"), [
    { kind: "ipv6", text: "2001:4860:4826:400::" },
  ]);
  assert.deepEqual(kinds("ether bc-24-11-40-88-81"), [
    { kind: "mac", text: "bc-24-11-40-88-81" },
  ]);
});

test("keeps hostname ports, slash ports, and explicit -p ports", () => {
  assert.deepEqual(kinds("proxy example.com:443"), [
    { kind: "port", text: ":443" },
  ]);
  assert.deepEqual(kinds("ss *:22 :::443"), [
    { kind: "port", text: ":22" },
    { kind: "ipv6", text: "::" },
    { kind: "port", text: ":443" },
  ]);
  assert.deepEqual(kinds("ssh -p 2222 host"), [
    { kind: "proto", text: "ssh" },
    { kind: "port", text: "2222" },
  ]);
  assert.deepEqual(kinds("allow tcp/80 udp/53"), [
    { kind: "proto", text: "tcp" },
    { kind: "port", text: "80" },
    { kind: "proto", text: "udp" },
    { kind: "port", text: "53" },
  ]);
});

test("colors protocols and TCP/ss port states", () => {
  assert.deepEqual(kinds("tcp LISTEN ESTABLISHED TIME-WAIT CLOSED"), [
    { kind: "proto", text: "tcp" },
    { kind: "listen", text: "LISTEN" },
    { kind: "established", text: "ESTABLISHED" },
    { kind: "wait", text: "TIME-WAIT" },
    { kind: "closed", text: "CLOSED" },
  ]);
  assert.deepEqual(kinds("Netid State tcp ESTAB udp UNCONN"), [
    { kind: "proto", text: "tcp" },
    { kind: "established", text: "ESTAB" },
    { kind: "proto", text: "udp" },
    { kind: "closed", text: "UNCONN" },
  ]);
  assert.equal(kinds("tcpdump ssh-keygen sshd").length, 0);
});

test("applies every enabled SSH.hls keyword", () => {
  assert.deepEqual(kinds("error: permission denied for /etc/shadow"), [
    { kind: "error", text: "error:" },
    { kind: "error", text: "permission denied" },
    { kind: "path", text: "/etc/shadow" },
  ]);
  assert.deepEqual(kinds("service started and connected"), [
    { kind: "success", text: "started" },
    { kind: "success", text: "connected" },
  ]);
  assert.deepEqual(kinds("sudo docker systemctl"), [
    { kind: "command", text: "sudo" },
    { kind: "command", text: "docker" },
    { kind: "command", text: "systemctl" },
  ]);
});

test("uses the SSH.hls palette for the required kinds", () => {
  assert.equal(REMOTE_HIGHLIGHT_COLORS.ipv4, "#FF8000");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.ipv6, "#55FF55");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.success, "#55FF55");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.command, "#AAAA00");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.port, "#0080FF");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.error, "#FF5555");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.proto, "#00AAAA");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.listen, "#55FF55");
  assert.equal(REMOTE_HIGHLIGHT_COLORS.established, "#55FFFF");
});

test("wires overlay highlights into the remote PTY without rewriting ANSI", () => {
  const session = readFileSync("src/pages/terminal/RemoteSession.tsx", "utf8");
  const highlight = readFileSync("src/pages/terminal/remoteTerminalHighlight.ts", "utf8");
  assert.match(session, /allowProposedApi: true/);
  assert.match(session, /attachRemoteTerminalHighlight\(instance\)/);
  assert.match(session, /detachHighlight\(\)/);
  assert.match(highlight, /onLineFeed\(/);
  assert.match(highlight, /onWriteParsed\(catchUp\)/);
  assert.doesNotMatch(highlight, /onScroll\(/);
  assert.doesNotMatch(highlight, /setTimeout\(scan/);
  assert.match(highlight, /fingerprint/);
  assert.match(highlight, /sudo\|yum\|apt-get\|docker\|kubectl\|systemctl/);
  assert.match(highlight, /LISTEN\(\?:ING\)\?\|ESTABLISHED/);
});
