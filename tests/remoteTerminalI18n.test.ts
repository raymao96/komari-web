import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const terminalFiles = [
  "src/pages/terminal/index.tsx",
  "src/pages/terminal/RemoteSession.tsx",
  "src/pages/terminal/FileManager.tsx",
  "src/pages/terminal/CommandClipboard.tsx",
];

test("remote terminal follows the admin language and has no extra language switch", () => {
  for (const file of terminalFiles) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /useTranslation/, `${file} should read the current UI language`);
    assert.doesNotMatch(source, /LanguageSwitch/, `${file} must not add a language picker`);
  }
});

test("remote terminal copy uses shared locale keys instead of hardcoded Chinese", () => {
  const session = readFileSync("src/pages/terminal/RemoteSession.tsx", "utf8");
  const workspace = readFileSync("src/pages/terminal/index.tsx", "utf8");
  const files = readFileSync("src/pages/terminal/FileManager.tsx", "utf8");
  assert.match(workspace, /login\.two_factor/);
  assert.match(workspace, /account\.2fa_otp_input_prompt/);
  assert.match(session, /terminal\.session\.reconnect/);
  assert.match(workspace, /terminal\.session\.brand/);
  assert.match(files, /terminal\.files\.title/);
  assert.match(files, /common\.cancel/);
});
