import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ADMIN_SHELL_OPEN_CLASS,
  lockAdminDocumentScroll,
  unlockAdminDocumentScroll,
} from "../src/utils/adminDocumentScroll.ts";
import {
  NATIVE_IPHONE_SAFARI_TAB_UA,
  classifyIosBrowseMode,
  iosStatusBarFallbackPx,
  isIPadDevice,
  isIPhoneDevice,
  isLandscapeOrientation,
  isNativeIosSafariTab,
  syncIosSafeAreaFromRuntime,
  type SafeAreaRoot,
  type SafeAreaRuntime,
} from "../src/utils/safeArea.ts";

const iphoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const iphoneChrome =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1";
const iphoneFirefox =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/129.0 Mobile/15E148 Safari/604.1";
const iphoneEdge =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/129.0.2792.84 Mobile/15E148 Safari/604.1";
const iphoneQuark =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 Quark/7.9.0";
const iphoneUnknownExtra =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 HeliumBrowser/2.1";
const iphoneWebView =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ipadSafari =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ipadosDesktopSafari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const desktopChrome =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const androidChrome =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");
const safeAreaSource = readFileSync(
  new URL("../src/utils/safeArea.ts", import.meta.url),
  "utf8",
);
const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(
  new URL("../src/components/admin/shell/AdminShell.tsx", import.meta.url),
  "utf8",
);
const sidebarSource = readFileSync(
  new URL("../src/components/admin/shell/AdminSidebar.tsx", import.meta.url),
  "utf8",
);
const topbarSource = readFileSync(
  new URL("../src/components/admin/shell/AdminTopbar.tsx", import.meta.url),
  "utf8",
);

function mockRoot(): SafeAreaRoot & {
  classes: Set<string>;
  attrs: Record<string, string>;
  styleMap: Record<string, string>;
} {
  const classes = new Set<string>();
  const attrs: Record<string, string> = {};
  const styleMap: Record<string, string> = {};
  return {
    classes,
    attrs,
    styleMap,
    classList: {
      toggle(token: string, force?: boolean) {
        if (force === false) classes.delete(token);
        else if (force === true) classes.add(token);
        else if (classes.has(token)) classes.delete(token);
        else classes.add(token);
        return classes.has(token);
      },
    },
    getAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    hasAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
    removeAttribute(name: string) {
      delete attrs[name];
    },
    style: {
      setProperty(name: string, value: string) {
        styleMap[name] = value;
      },
      removeProperty(name: string) {
        const previous = styleMap[name] ?? "";
        delete styleMap[name];
        return previous;
      },
    },
  };
}

function classListMock() {
  const names = new Set<string>();
  return {
    names,
    add(token: string) {
      names.add(token);
    },
    remove(token: string) {
      names.delete(token);
    },
    contains(token: string) {
      return names.has(token);
    },
  };
}

test("identifies a native iPhone Safari tab and does not add extra top inset", () => {
  const runtime: SafeAreaRuntime = { userAgent: iphoneSafari };
  assert.equal(isNativeIosSafariTab(runtime), true);
  assert.equal(classifyIosBrowseMode(runtime), "safari-tab");
  const root = mockRoot();
  const mode = syncIosSafeAreaFromRuntime(
    root,
    runtime,
    { isLandscape: false, screenWidth: 393, screenHeight: 852 },
    { reclassify: true },
  );
  assert.equal(mode, "safari-tab");
  assert.equal(root.classes.has("lite-safari-tab"), true);
  assert.equal(root.classes.has("lite-ios-overlay"), false);
  assert.equal(root.styleMap["--ios-status-bar-fallback"], undefined);
  assert.equal(root.styleMap["--safe-area-top"], undefined);
});

test("Safari standalone, minimal-ui and PWA enter overlay mode", () => {
  assert.equal(
    classifyIosBrowseMode({ userAgent: iphoneSafari, standalone: true }),
    "standalone",
  );
  assert.equal(
    classifyIosBrowseMode({ userAgent: iphoneSafari, displayStandalone: true }),
    "standalone",
  );
  assert.equal(
    classifyIosBrowseMode({ userAgent: iphoneSafari, displayMinimalUi: true }),
    "standalone",
  );
  const root = mockRoot();
  syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari, standalone: true },
    { isLandscape: false, screenWidth: 393, screenHeight: 852 },
    { reclassify: true },
  );
  assert.equal(root.classes.has("lite-standalone"), true);
  assert.equal(root.classes.has("lite-ios-overlay"), true);
  assert.equal(root.classes.has("lite-safari-tab"), false);
  assert.equal(root.styleMap["--ios-status-bar-fallback"], "59px");
});

test("Safari home screen with a reported inset is overlay even without standalone", () => {
  const runtime: SafeAreaRuntime = { userAgent: iphoneSafari, measuredTop: 59 };
  assert.equal(classifyIosBrowseMode(runtime), "safari-tab");
  assert.equal(
    classifyIosBrowseMode(runtime, { useMeasuredTop: true }),
    "ios-overlay",
  );
  const root = mockRoot();
  const mode = syncIosSafeAreaFromRuntime(
    root,
    runtime,
    { isLandscape: false, screenWidth: 393, screenHeight: 852 },
    { reclassify: true, useMeasuredTop: true },
  );
  assert.equal(mode, "ios-overlay");
  assert.equal(root.classes.has("lite-ios-overlay"), true);
  assert.equal(root.classes.has("lite-safari-tab"), false);
  assert.equal(root.styleMap["--ios-status-bar-fallback"], "59px");
});

test("a locked Safari tab can upgrade to home-screen overlay but not from later env or swipe", () => {
  const root = mockRoot();
  syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari, measuredTop: 0 },
    { isLandscape: false, screenWidth: 393, screenHeight: 852, innerHeight: 720 },
    { reclassify: true },
  );
  assert.equal(root.getAttribute("data-lite-ios-mode"), "safari-tab");

  const afterSwipe = syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari, measuredTop: 59 },
    { isLandscape: false, screenWidth: 393, screenHeight: 852, innerHeight: 809 },
    { reclassify: false, allowUpgrade: true },
  );
  assert.equal(afterSwipe, "safari-tab");
  assert.equal(root.classes.has("lite-safari-tab"), true);

  const afterMeasuredInset = syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari, measuredTop: 59 },
    { isLandscape: false, screenWidth: 393, screenHeight: 852 },
    { reclassify: false, allowUpgrade: true, useMeasuredTop: true },
  );
  assert.equal(afterMeasuredInset, "ios-overlay");
  assert.equal(root.classes.has("lite-ios-overlay"), true);
  assert.equal(root.classes.has("lite-safari-tab"), false);

  syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari },
    { isLandscape: false, screenWidth: 393, screenHeight: 852 },
    { reclassify: true },
  );
  assert.equal(root.getAttribute("data-lite-ios-mode"), "safari-tab");

  const afterStandalone = syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari, standalone: true },
    { isLandscape: false, screenWidth: 393, screenHeight: 852 },
    { reclassify: false, allowUpgrade: true },
  );
  assert.equal(afterStandalone, "standalone");
  assert.equal(root.classes.has("lite-ios-overlay"), true);
  assert.equal(root.classes.has("lite-safari-tab"), false);

  const afterToolbar = syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneSafari, measuredTop: 0 },
    { isLandscape: false, screenWidth: 393, screenHeight: 852, innerHeight: 670 },
    { reclassify: false, allowUpgrade: true },
  );
  assert.equal(afterToolbar, "standalone");
});

test("Chrome, Firefox, Edge and Quark are not native Safari", () => {
  for (const userAgent of [iphoneChrome, iphoneFirefox, iphoneEdge, iphoneQuark]) {
    assert.equal(isNativeIosSafariTab({ userAgent }), false);
    assert.equal(classifyIosBrowseMode({ userAgent }), "ios-overlay");
  }
});

test("unknown iOS browsers with trailing product tokens enter overlay mode", () => {
  assert.equal(NATIVE_IPHONE_SAFARI_TAB_UA.test(iphoneUnknownExtra), false);
  assert.equal(isNativeIosSafariTab({ userAgent: iphoneUnknownExtra }), false);
  assert.equal(classifyIosBrowseMode({ userAgent: iphoneUnknownExtra }), "ios-overlay");
});

test("unknown iOS WebView UA enters overlay mode", () => {
  assert.equal(classifyIosBrowseMode({ userAgent: iphoneWebView }), "ios-overlay");
});

test("toolbar innerHeight changes do not recategorize mode or fallback", () => {
  const root = mockRoot();
  const runtime: SafeAreaRuntime = { userAgent: iphoneChrome };
  const first = syncIosSafeAreaFromRuntime(
    root,
    runtime,
    { isLandscape: false, screenWidth: 393, screenHeight: 852, innerHeight: 720 },
    { reclassify: true },
  );
  assert.equal(first, "ios-overlay");
  assert.equal(root.styleMap["--ios-status-bar-fallback"], "59px");
  const afterSwipe = syncIosSafeAreaFromRuntime(
    root,
    runtime,
    { isLandscape: false, screenWidth: 393, screenHeight: 852, innerHeight: 809 },
    { reclassify: false },
  );
  assert.equal(afterSwipe, "ios-overlay");
  assert.equal(root.getAttribute("data-lite-ios-mode"), "ios-overlay");
  assert.equal(root.styleMap["--ios-status-bar-fallback"], "59px");
  assert.equal(
    iosStatusBarFallbackPx({
      isLandscape: false,
      screenWidth: 393,
      screenHeight: 852,
      innerHeight: 720,
    }),
    iosStatusBarFallbackPx({
      isLandscape: false,
      screenWidth: 393,
      screenHeight: 852,
      innerHeight: 809,
    }),
  );
  assert.equal(
    classifyIosBrowseMode(runtime),
    classifyIosBrowseMode(runtime),
  );
});

test("iPhone fallback sizes follow Dynamic Island, notch and older phones", () => {
  assert.equal(
    iosStatusBarFallbackPx({
      isLandscape: false,
      screenWidth: 393,
      screenHeight: 852,
    }),
    59,
  );
  assert.equal(
    iosStatusBarFallbackPx({
      isLandscape: false,
      screenWidth: 390,
      screenHeight: 844,
    }),
    47,
  );
  assert.equal(
    iosStatusBarFallbackPx({
      isLandscape: false,
      screenWidth: 375,
      screenHeight: 667,
    }),
    20,
  );
});

test("iPad reuses desktop safe-area behavior and does not take the 59px fallback", () => {
  assert.equal(isIPadDevice({ userAgent: ipadSafari }), true);
  assert.equal(isIPhoneDevice({ userAgent: ipadSafari }), false);
  assert.equal(classifyIosBrowseMode({ userAgent: ipadSafari }), null);
  assert.equal(
    classifyIosBrowseMode({
      userAgent: ipadosDesktopSafari,
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    null,
  );
  assert.equal(
    iosStatusBarFallbackPx({
      isIPad: true,
      isLandscape: false,
      screenWidth: 1024,
      screenHeight: 1366,
    }),
    0,
  );
  const root = mockRoot();
  const mode = syncIosSafeAreaFromRuntime(
    root,
    { userAgent: ipadSafari },
    { isIPad: true, isLandscape: false, screenWidth: 1024, screenHeight: 1366 },
    { reclassify: true },
  );
  assert.equal(mode, null);
  assert.equal(root.classes.has("lite-ios-overlay"), false);
  assert.equal(root.classes.has("lite-safari-tab"), false);
  assert.equal(root.styleMap["--ios-status-bar-fallback"], undefined);
});

test("iPhone landscape does not add a 59px top fallback", () => {
  assert.equal(
    isLandscapeOrientation({ windowOrientation: 90, innerWidth: 393, innerHeight: 852 }),
    true,
  );
  assert.equal(
    iosStatusBarFallbackPx({
      isLandscape: true,
      screenWidth: 393,
      screenHeight: 852,
    }),
    0,
  );
  const root = mockRoot();
  syncIosSafeAreaFromRuntime(
    root,
    { userAgent: iphoneChrome },
    { isLandscape: true, screenWidth: 393, screenHeight: 852 },
    { reclassify: true },
  );
  assert.equal(root.styleMap["--ios-status-bar-fallback"], "0px");
});

test("non-iOS platforms stay on the default env() path", () => {
  assert.equal(classifyIosBrowseMode({ userAgent: desktopChrome }), null);
  assert.equal(classifyIosBrowseMode({ userAgent: androidChrome }), null);
  assert.equal(
    classifyIosBrowseMode({
      userAgent: ipadosDesktopSafari,
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    null,
  );
  const root = mockRoot();
  const mode = syncIosSafeAreaFromRuntime(
    root,
    { userAgent: desktopChrome },
    { isLandscape: false, screenWidth: 1920, screenHeight: 1080 },
    { reclassify: true },
  );
  assert.equal(mode, null);
  assert.equal(root.getAttribute("data-lite-ios-mode"), "none");
  assert.equal(root.classes.has("lite-ios-overlay"), false);
  assert.equal(root.styleMap["--ios-status-bar-fallback"], undefined);
});

test("admin shell lock class is added on mount and removed on unmount", () => {
  const root = { classList: classListMock() };
  lockAdminDocumentScroll(root);
  assert.equal(root.classList.contains(ADMIN_SHELL_OPEN_CLASS), true);
  unlockAdminDocumentScroll(root);
  assert.equal(root.classList.contains(ADMIN_SHELL_OPEN_CLASS), false);
  assert.match(shellSource, /lockAdminDocumentScroll\(root\)/);
  assert.match(shellSource, /unlockAdminDocumentScroll\(root\)/);
  assert.match(css, /html\.lite-admin-shell-open/);
  assert.match(css, /overscroll-behavior: none/);
  assert.match(sidebarSource, /data-admin-nav-scroll/);
  assert.match(sidebarSource, /overscrollBehaviorY: "none"/);
  assert.match(css, /\[data-admin-nav-scroll\]/);
});

test("Drawer and Topbar still read the shared --safe-area-top variable", () => {
  assert.match(shellSource, /pt: isMobile \? "var\(--safe-area-top\)" : 0/);
  assert.match(topbarSource, /pt: "var\(--safe-area-top\)"/);
  assert.doesNotMatch(shellSource, /47px|59px/);
  assert.doesNotMatch(topbarSource, /47px|59px/);
});

test("third-party UA denylist and overlay-height heuristic are gone", () => {
  assert.doesNotMatch(safeAreaSource, /IOS_THIRD_PARTY_BROWSER/);
  assert.doesNotMatch(safeAreaSource, /looksLikeStatusBarOverlay/);
  assert.doesNotMatch(safeAreaSource, /CriOS\|FxiOS\|EdgiOS/);
  assert.doesNotMatch(html, /CriOS\|FxiOS\|EdgiOS/);
  assert.doesNotMatch(safeAreaSource, /visualViewport/);
  assert.doesNotMatch(html, /setProperty\("--safe-area-top"/);
  assert.match(html, /display-mode: minimal-ui/);
  assert.match(safeAreaSource, /display-mode: minimal-ui/);
  assert.match(html, /padding-top:env\(safe-area-inset-top, 0px\)/);
  assert.match(safeAreaSource, /allowUpgrade/);
  assert.match(html, /Version\\\/\[\\d\.\]\+ Mobile\\\/\[A-Za-z0-9\]\+ Safari\\\/\[\\d\.\]\+\$/);
  assert.match(
    safeAreaSource,
    /Version\\\/\[\\d\.\]\+ Mobile\\\/\[A-Za-z0-9\]\+ Safari\\\/\[\\d\.\]\+\$/,
  );
  assert.match(css, /html\.lite-ios-overlay/);
  assert.match(
    css,
    /max\(\s*env\(safe-area-inset-top, 0px\),\s*var\(--ios-status-bar-fallback, 0px\)\s*\)/,
  );
  assert.match(main, /installIosSafeAreaSync/);
  assert.match(html, /viewport-fit=cover/);
});
