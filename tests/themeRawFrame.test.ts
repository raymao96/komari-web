import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  THEME_RAW_MESSAGE_TYPE,
  THEME_RAW_SANDBOX,
  themeRawLoaderSrcDoc,
} from "../src/utils/themeRawFrame.ts";

const themeRawSource = readFileSync("src/pages/admin/theme_raw.tsx", "utf8");

test("raw theme iframe is a unique origin and only accepts parent postMessage HTML", () => {
  assert.equal(THEME_RAW_SANDBOX, "allow-scripts");
  assert.doesNotMatch(THEME_RAW_SANDBOX, /allow-same-origin/);
  assert.match(themeRawSource, /THEME_RAW_SANDBOX/);
  assert.match(themeRawSource, /THEME_RAW_MESSAGE_TYPE/);
  assert.match(themeRawSource, /postMessage/);
  assert.doesNotMatch(themeRawSource, /allow-same-origin/);
  assert.doesNotMatch(themeRawSource, /srcDoc=\{html\}/);

  const loader = themeRawLoaderSrcDoc("https://lite.example");
  assert.match(loader, /https:\/\/lite\.example/);
  assert.match(loader, /event\.source !== window\.parent/);
  assert.match(loader, /event\.origin !== parentOrigin/);
  assert.match(loader, new RegExp(THEME_RAW_MESSAGE_TYPE));
  assert.match(loader, /setAttribute\("sandbox", "allow-scripts"\)/);
  assert.doesNotMatch(loader, /allow-same-origin/);
});
