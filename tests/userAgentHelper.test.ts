import assert from "node:assert/strict";
import test from "node:test";

import { UserAgentHelper } from "../src/utils/UserAgentHelper.ts";

const t = (key: string) =>
  ({
    "userAgent.windows": "Windows",
    "userAgent.macos": "macOS",
    "userAgent.ios": "iOS",
    "userAgent.linux": "Linux",
    "userAgent.chrome": "Chrome",
    "userAgent.edge": "Edge",
    "userAgent.firefox": "Firefox",
    "userAgent.safari": "Safari",
    "userAgent.powershell": "PowerShell",
    "userAgent.curl": "curl",
    "userAgent.go": "Go",
    "userAgent.unknown_client": "未知客户端",
  }[key] || key);

test("parses Chrome and Edge from full user agents", () => {
  assert.equal(
    UserAgentHelper.format(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.0 Safari/537.36",
      t,
    ),
    "Windows Chrome/148.0.7778.0",
  );
  assert.equal(
    UserAgentHelper.format(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/172.16.1.4 Safari/537.36 Edg/172.16.1.4",
      t,
    ),
    "Windows Edge/172.16.1.4",
  );
});

test("does not invent 无/0.0.0 for PowerShell or empty agents", () => {
  assert.equal(
    UserAgentHelper.format(
      "Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) WindowsPowerShell/5.1.26100.6584",
      t,
    ),
    "Windows PowerShell/5.1.26100.6584",
  );
  assert.equal(
    UserAgentHelper.format("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", t),
    "Windows 未知客户端",
  );
  assert.equal(UserAgentHelper.format("", t), "未知客户端");
  assert.doesNotMatch(UserAgentHelper.format("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", t), /无\/0\.0\.0/);
});

test("iPhone and iPad Safari are iOS even when the UA says like Mac OS X", () => {
  assert.equal(
    UserAgentHelper.format(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
      t,
    ),
    "iOS Safari/27.0",
  );
  assert.equal(
    UserAgentHelper.shortDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
    ),
    "iPhone",
  );
  assert.equal(
    UserAgentHelper.format(
      "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      t,
    ),
    "iOS Safari/18.6",
  );
  assert.equal(
    UserAgentHelper.shortDevice(
      "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    ),
    "iPad",
  );
  assert.equal(
    UserAgentHelper.format(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15",
      t,
    ),
    "macOS Safari/27.0",
  );
  assert.equal(
    UserAgentHelper.shortDevice(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15",
    ),
    "Mac",
  );
  assert.equal(
    UserAgentHelper.isWindows(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.0 Safari/537.36",
    ),
    true,
  );
  assert.equal(
    UserAgentHelper.isWindows(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
    ),
    false,
  );
});
