import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(
  readFileSync(new URL("../komari-theme.json", import.meta.url), "utf8"),
);
const supportedLocales = ["en", "zh-CN", "zh-TW", "ja", "id-ID"];

test("default managed theme metadata covers every admin language", () => {
  for (const locale of supportedLocales) {
    assert.equal(
      typeof manifest.configuration.name[locale],
      "string",
      `configuration.name.${locale}`,
    );
  }

  for (const [index, field] of manifest.configuration.data.entries()) {
    for (const locale of supportedLocales) {
      assert.equal(
        typeof field.name?.[locale],
        "string",
        `configuration.data[${index}].name.${locale}`,
      );
      if (field.help) {
        assert.equal(
          typeof field.help[locale],
          "string",
          `configuration.data[${index}].help.${locale}`,
        );
      }
    }
  }
});
