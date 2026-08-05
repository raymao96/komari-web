import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createRemoteSessionLease,
  localizeRemoteError,
} from "../src/utils/remoteSession.ts";

const terminalSource = readFileSync("src/pages/terminal/RemoteSession.tsx", "utf8");
const terminalCss = readFileSync("src/pages/terminal/Terminal.css", "utf8");

test("releases each of three consecutive remote sessions exactly once", () => {
  const released: string[] = [];
  for (const id of ["session-1", "session-2", "session-3"]) {
    const lease = createRemoteSessionLease(id, (sessionID) => released.push(sessionID));
    lease.release();
    lease.release();
  }
  assert.deepEqual(released, ["session-1", "session-2", "session-3"]);
});

test("keeps independent terminal page leases isolated", () => {
  const released: string[] = [];
  const leases = Array.from({ length: 32 }, (_, index) =>
    createRemoteSessionLease(`page-${index}`, (sessionID) => released.push(sessionID)),
  );

  leases[7].release();
  leases[7].release();
  assert.deepEqual(released, ["page-7"]);

  leases.forEach((lease) => lease.release());
  assert.equal(released.length, 32);
  assert.equal(new Set(released).size, 32);
});

test("localizes known server and agent remote errors", () => {
  const cases: Array<[string | undefined, string]> = [
    [undefined, "远程连接失败"],
    ["Remote control is disabled on this agent", "此 Agent 已关闭远程控制"],
    ["Remote session authorization failed", "远程会话验证失败，请重新连接"],
    ["Client is offline", "客户端当前离线"],
    ["Remote session not found", "远程会话不存在或已失效"],
    ["Failed to create secure remote session", "无法创建安全的远程会话"],
    ["client is being deleted", "客户端正在删除，暂时无法建立远程连接"],
    ["Failed to start terminal: fork/exec /bin/sh: permission denied", "终端启动失败：fork/exec /bin/sh: permission denied"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(localizeRemoteError(input), expected);
  }
});

test("keeps unknown remote diagnostics visible", () => {
  assert.equal(localizeRemoteError("custom agent diagnostic"), "custom agent diagnostic");
});

test("mobile terminal input avoids iOS zoom and refits around the keyboard", () => {
  assert.match(terminalSource, /inputMode="text"/);
  assert.match(terminalSource, /autoComplete="off"/);
  assert.match(terminalSource, /onFocus=\{resizeTerminal\}/);
  assert.match(terminalSource, /viewport\?\.addEventListener\("resize", update\)/);
  assert.match(terminalSource, /window\.addEventListener\("orientationchange", update\)/);
  assert.match(terminalCss, /\.terminal-page \.xterm-helper-textarea \{[\s\S]*font-size: 16px !important/);
  assert.match(terminalCss, /\.remote-terminal-pane \{[\s\S]*overflow: hidden/);
  assert.match(terminalCss, /\.remote-session-actions \{[\s\S]*overflow-x: auto/);
});

test("mobile terminal drag scrolls terminal history without moving the browser page", () => {
  assert.match(terminalSource, /host\.addEventListener\("touchmove", touchMove, \{ capture: true, passive: false \}\)/);
  assert.match(terminalSource, /instance\.scrollLines\(lines\)/);
  assert.match(terminalSource, /event\.preventDefault\(\)/);
  assert.doesNotMatch(terminalSource, /onPointerMove=/);
  assert.match(
    terminalCss,
    /\.terminal-page\.terminal-xterm-host \{[\s\S]*overscroll-behavior: none;[\s\S]*touch-action: none;/,
  );
  assert.match(terminalCss, /html\.remote-terminal-open body,[\s\S]*overflow: hidden;[\s\S]*overscroll-behavior: none;/);
});

test("terminal context menu gives select all the same icon treatment", () => {
  assert.match(terminalSource, /TextSelect,/);
  assert.match(
    terminalSource,
    /terminal\.current\?\.selectAll\(\);[\s\S]*<TextSelect size=\{15\} \/>/,
  );
});
