import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveI18nText } from "../src/utils/i18nText.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("theme text resolves locale aliases before English fallback", () => {
  const text = {
    en: "English",
    zh_CN: "简体中文",
    zh_TW: "繁體中文",
  };
  assert.equal(resolveI18nText(text, "zh-CN"), "简体中文");
  assert.equal(resolveI18nText(text, "zh_TW"), "繁體中文");
  assert.equal(resolveI18nText(text, "fr-FR"), "English");
});

test("theme text skips empty translations and keeps legacy strings", () => {
  assert.equal(resolveI18nText("Legacy", "zh-CN"), "Legacy");
  assert.equal(
    resolveI18nText({ zh_CN: "", en: "English", ja: "日本語" }, "zh-CN"),
    "English",
  );
  assert.equal(resolveI18nText({ zh_CN: "", ja: "日本語" }, "fr"), "日本語");
  assert.equal(resolveI18nText({ en: "   " }, "en"), undefined);
});

function assertKeysSorted(value: unknown, location: string): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const sortedKeys = [...keys].sort((left, right) =>
    left.localeCompare(right),
  );
  assert.deepEqual(keys, sortedKeys, location + " keys must be sorted");

  for (const key of keys) {
    assertKeysSorted(record[key], location + "." + key);
  }
}

test("source locale keys are sorted", () => {
  const filename = "zh_CN.json";
  const contents = JSON.parse(
    readFileSync(
      path.join(repositoryRoot, "src", "i18n", "locales", filename),
      "utf8",
    ),
  );
  assertKeysSorted(contents, filename);
});

test("login API errors are translated in every locale", () => {
  const keys = [
    "busy",
    "failed",
    "invalid_credentials",
    "password_login_disabled",
  ];
  for (const filename of ["zh_CN.json", "en.json", "ja_JP.json", "zh_TW.json"]) {
    const contents = JSON.parse(
      readFileSync(
        path.join(repositoryRoot, "src", "i18n", "locales", filename),
        "utf8",
      ),
    ) as { login?: Record<string, string> };
    for (const key of keys) {
      const value = contents.login?.[key]?.trim() ?? "";
      assert.notEqual(value, "", `${filename} login.${key} is missing`);
      assert.notEqual(value, "Invalid credentials", `${filename} login.${key} still uses API English`);
    }
    assert.notEqual(
      contents.login?.invalid_credentials,
      "Invalid credentials",
    );
  }
});

test("exec canned results are translated in every locale", () => {
  const keys = [
    "client_offline",
    "delivery_failed",
    "delivery_timeout",
    "execution_unknown",
    "remote_closed",
    "remote_unavailable",
    "timeout",
  ];
  for (const filename of ["zh_CN.json", "en.json", "ja_JP.json", "zh_TW.json"]) {
    const contents = JSON.parse(
      readFileSync(
        path.join(repositoryRoot, "src", "i18n", "locales", filename),
        "utf8",
      ),
    ) as { exec?: { output?: Record<string, string>; errors?: Record<string, string> } };
    for (const key of keys) {
      const value = contents.exec?.output?.[key]?.trim() ?? "";
      assert.notEqual(value, "", `${filename} exec.output.${key} is missing`);
    }
    assert.notEqual(
      contents.exec?.output?.remote_unavailable,
      "remote control unavailable",
    );
    assert.notEqual(
      contents.exec?.errors?.noClientsConnected?.trim() ?? "",
      "",
      `${filename} exec.errors.noClientsConnected is missing`,
    );
    assert.notEqual(
      contents.exec?.errors?.noClientsConnected,
      "No clients connected",
    );
  }
});

test("empty remote addresses use the same placeholder in every locale", () => {
  for (const filename of ["zh_CN.json", "en.json", "ja_JP.json", "zh_TW.json"]) {
    const contents = JSON.parse(
      readFileSync(
        path.join(repositoryRoot, "src", "i18n", "locales", filename),
        "utf8",
      ),
    ) as { terminal?: { address_unreported?: string } };
    assert.equal(
      contents.terminal?.address_unreported,
      "--",
      `${filename} terminal.address_unreported should match empty tags`,
    );
  }
});

test("i18n sync workflow has no candidate branch job", () => {
  const workflow = readFileSync(
    path.join(repositoryRoot, ".github", "workflows", "i18n-sync.yml"),
    "utf8",
  );

  assert.equal(workflow.includes("validate-candidate:"), false);
  assert.equal(workflow.includes("refs/heads/candidate/"), false);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /git push origin/);
});
