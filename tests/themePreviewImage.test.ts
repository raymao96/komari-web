import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  installedThemePreviewPath,
  resolveThemePreviewStatus,
  themePreviewSrc,
} from "../src/utils/themePreviewImage.ts";

const previewImageSource = readFileSync(
  "src/components/ThemePreviewImage.tsx",
  "utf8",
);

test("cached preview images resolve as loaded without waiting for onLoad", () => {
  assert.equal(resolveThemePreviewStatus(undefined, null), "error");
  assert.equal(resolveThemePreviewStatus("", null), "error");
  assert.equal(
    resolveThemePreviewStatus("/themes/glass/preview.png", null),
    "loading",
  );
  assert.equal(
    resolveThemePreviewStatus("/themes/glass/preview.png", {
      complete: false,
      naturalWidth: 0,
    }),
    "loading",
  );
  assert.equal(
    resolveThemePreviewStatus("/themes/glass/preview.png", {
      complete: true,
      naturalWidth: 640,
    }),
    "loaded",
  );
  assert.equal(
    resolveThemePreviewStatus("/themes/glass/preview.png", {
      complete: true,
      naturalWidth: 0,
    }),
    "error",
  );
});

test("preview image syncs cached complete state after layout", () => {
  assert.match(previewImageSource, /useLayoutEffect/);
  assert.match(previewImageSource, /resolveThemePreviewStatus\(src, imageRef\.current\)/);
  assert.match(previewImageSource, /onLoad=\{syncStatus\}/);
  assert.match(previewImageSource, /onError=\{syncStatus\}/);
  assert.match(previewImageSource, /decoding="async"/);
});

test("theme cards request resized previews and market images go through the local cache", () => {
  assert.equal(
    installedThemePreviewPath({ short: "lite-theme", preview: "preview.png" }),
    "/themes/lite-theme/preview.png",
  );
  assert.equal(
    themePreviewSrc(installedThemePreviewPath({
      short: "lite-theme",
      preview: "preview.png",
    }), { card: true, version: "1.0.5" }),
    "/themes/lite-theme/preview.png?card=1&v=1.0.5",
  );
  assert.equal(
    themePreviewSrc("/themes/glass/preview.png", { card: true, version: "1.0.7" }),
    "/themes/glass/preview.png?card=1&v=1.0.7",
  );
  assert.equal(
    themePreviewSrc("https://cdn.example/preview.png", { card: true }),
    "/api/admin/theme/market/preview?url=https%3A%2F%2Fcdn.example%2Fpreview.png&card=1",
  );
  assert.equal(themePreviewSrc(undefined, { card: true }), undefined);
});
