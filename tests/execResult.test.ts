import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  execResultI18nKey,
  isExecTimeoutResult,
  localizeExecResult,
} from "../src/utils/execResult.ts";

test("canned exec results map to locale keys instead of English", () => {
  assert.equal(
    execResultI18nKey("remote control unavailable"),
    "exec.output.remote_unavailable",
  );
  assert.equal(execResultI18nKey("Client offline!"), "exec.output.client_offline");
  assert.equal(execResultI18nKey("delivery failed"), "exec.output.delivery_failed");
  assert.equal(execResultI18nKey("delivery timeout"), "exec.output.delivery_timeout");
  assert.equal(
    execResultI18nKey("execution status unknown"),
    "exec.output.execution_unknown",
  );
  assert.equal(
    execResultI18nKey("远程管理已关闭，任务未投递/已取消"),
    "exec.output.remote_closed",
  );
  assert.equal(execResultI18nKey("执行超时"), "exec.output.timeout");
  assert.equal(execResultI18nKey("whoami\nliteadmin"), "");
  assert.equal(isExecTimeoutResult("delivery timeout"), true);
  assert.equal(isExecTimeoutResult("执行超时"), true);
  assert.equal(isExecTimeoutResult("remote control unavailable"), false);
  assert.equal(
    localizeExecResult("remote control unavailable", (key) =>
      key === "exec.output.remote_unavailable" ? "该节点当前无法远程控制" : key,
    ),
    "该节点当前无法远程控制",
  );
  assert.equal(localizeExecResult("whoami", (key) => key), "whoami");
});

test("exec page displays localized canned results", () => {
  const source = readFileSync(
    new URL("../src/pages/admin/exec.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /localizeExecResult\(result\.result, t\)/);
  assert.doesNotMatch(source, /<pre className="whitespace-pre-wrap">\{result\.result\}<\/pre>/);
});
