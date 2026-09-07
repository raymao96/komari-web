import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  IOS_THIRD_PARTY_BROWSER,
  iosStatusBarFallbackPx,
  isIOSSafariTab,
  looksLikeFullBleedViewport,
} from "../src/utils/safeArea.ts";

const iphoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const iphoneChrome =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1";
const iphoneQuark =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 Quark/7.9.0";

test("locks safe-area padding only for iOS Safari browser tabs", () => {
  assert.equal(isIOSSafariTab({ userAgent: iphoneSafari }), true);
  assert.equal(isIOSSafariTab({ userAgent: iphoneSafari, standalone: true }), false);
  assert.equal(isIOSSafariTab({ userAgent: iphoneChrome }), false);
  assert.equal(isIOSSafariTab({ userAgent: iphoneQuark }), false);
  assert.equal(
    isIOSSafariTab({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    }),
    false,
  );
  assert.equal(IOS_THIRD_PARTY_BROWSER.test(iphoneChrome), true);
  assert.equal(IOS_THIRD_PARTY_BROWSER.test(iphoneQuark), true);
});

test("uses Dynamic Island, notch, or classic status-bar fallbacks", () => {
  assert.equal(iosStatusBarFallbackPx(393, 852), 59);
  assert.equal(iosStatusBarFallbackPx(390, 844), 47);
  assert.equal(iosStatusBarFallbackPx(375, 667), 20);
  assert.equal(looksLikeFullBleedViewport(809, 852), true);
  assert.equal(looksLikeFullBleedViewport(670, 852), false);
});

test("admin chrome reads safe-area env outside Safari tabs", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");
  const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
  assert.match(html, /lite-safari-tab/);
  assert.match(html, IOS_THIRD_PARTY_BROWSER);
  assert.match(css, /--safe-area-top: env\(safe-area-inset-top, 0px\)/);
  assert.match(css, /html\.lite-safari-tab/);
  assert.doesNotMatch(css, /display-mode: standalone/);
  assert.match(main, /installIosSafeAreaSync/);
});
