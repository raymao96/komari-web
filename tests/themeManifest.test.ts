import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchThemeManifest,
  THEME_MANIFEST_FILES,
  themeManifestUrl,
} from "../src/utils/themeManifest.ts";

test("reads Lite-theme.json before the Komari compatibility file", () => {
  assert.deepEqual([...THEME_MANIFEST_FILES], [
    "Lite-theme.json",
    "komari-theme.json",
  ]);
});

test("falls back to komari-theme.json when Lite-theme.json is missing", async () => {
  const requested: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/Lite-theme.json")) {
      return new Response(null, { status: 404 });
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await fetchThemeManifest("lite-theme", {
      cache: "no-cache",
    });
    assert.equal(response.ok, true);
    assert.deepEqual(requested, [
      themeManifestUrl("lite-theme", "Lite-theme.json"),
      themeManifestUrl("lite-theme", "komari-theme.json"),
    ]);
  } finally {
    globalThis.fetch = original;
  }
});

test("does not request the compatibility file when Lite-theme.json exists", async () => {
  const requested: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response("{}", { status: 200 });
  };
  try {
    const response = await fetchThemeManifest("lite-theme");
    assert.equal(response.ok, true);
    assert.deepEqual(requested, [
      themeManifestUrl("lite-theme", "Lite-theme.json"),
    ]);
  } finally {
    globalThis.fetch = original;
  }
});
