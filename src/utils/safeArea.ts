export const IOS_THIRD_PARTY_BROWSER =
  /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|UCBrowser|UCWEB|Quark|MicroMessenger|MQQBrowser|baiduboxapp|baidubrowser|SogouMobileBrowser|SamsungBrowser|Helium|GSA|FBAN|FBAV|Instagram|Line\/|DingTalk|AliApp|Lark|Feishu/i;

export type SafeAreaRuntime = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayStandalone?: boolean;
  displayFullscreen?: boolean;
};

export function isIOSDevice(
  runtime: Pick<SafeAreaRuntime, "userAgent" | "platform" | "maxTouchPoints">,
) {
  const ua = runtime.userAgent || "";
  return (
    /iP(hone|od|ad)/.test(ua) ||
    (runtime.platform === "MacIntel" && (runtime.maxTouchPoints ?? 0) > 1)
  );
}

export function isStandaloneDisplay(runtime: SafeAreaRuntime) {
  return Boolean(
    runtime.standalone || runtime.displayStandalone || runtime.displayFullscreen,
  );
}

export function isIOSSafariTab(runtime: SafeAreaRuntime) {
  if (!isIOSDevice(runtime)) return false;
  if (isStandaloneDisplay(runtime)) return false;
  const ua = runtime.userAgent || "";
  if (IOS_THIRD_PARTY_BROWSER.test(ua)) return false;
  return /Safari/i.test(ua);
}

export function iosStatusBarFallbackPx(screenWidth: number, screenHeight: number) {
  const long = Math.max(screenWidth, screenHeight);
  if (long >= 852) return 59;
  if (long >= 812) return 47;
  return 20;
}

export function looksLikeStatusBarOverlay(innerHeight: number, screenHeight: number) {
  return screenHeight > 0 && innerHeight / screenHeight >= 0.8;
}

export function shouldApplyIosStatusBarInset(input: {
  isIOS: boolean;
  isSafariTab: boolean;
  isThirdParty: boolean;
  isStandalone: boolean;
  innerHeight: number;
  screenHeight: number;
}) {
  if (!input.isIOS) return false;
  if (input.isStandalone || input.isThirdParty || !input.isSafariTab) return true;
  return looksLikeStatusBarOverlay(input.innerHeight, input.screenHeight);
}

export function resolveIosSafeAreaTopPx(input: {
  isIOS: boolean;
  isSafariTab: boolean;
  isThirdParty: boolean;
  isStandalone: boolean;
  measuredTop: number;
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
}) {
  if (!shouldApplyIosStatusBarInset(input)) return null;
  if (input.measuredTop > 0) return Math.round(input.measuredTop);
  return iosStatusBarFallbackPx(input.screenWidth, input.screenHeight);
}

function readCurrentRuntime(): SafeAreaRuntime {
  return {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    displayStandalone: window.matchMedia?.("(display-mode: standalone)").matches,
    displayFullscreen: window.matchMedia?.("(display-mode: fullscreen)").matches,
  };
}

function measureInset(side: "top" | "bottom") {
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:0",
    "height:0",
    "visibility:hidden",
    "pointer-events:none",
    `padding-${side}:env(safe-area-inset-${side}, 0px)`,
  ].join(";");
  (document.body ?? document.documentElement).appendChild(probe);
  void probe.offsetHeight;
  const value =
    Number.parseFloat(
      getComputedStyle(probe).getPropertyValue(side === "top" ? "padding-top" : "padding-bottom"),
    ) || 0;
  probe.remove();
  return value;
}

export function syncIosSafeArea(root = document.documentElement) {
  const runtime = readCurrentRuntime();
  const isIOS = isIOSDevice(runtime);
  const isThirdParty = IOS_THIRD_PARTY_BROWSER.test(runtime.userAgent || "");
  const isStandalone = isStandaloneDisplay(runtime);
  const isSafariTab = isIOSSafariTab(runtime);
  const apply = shouldApplyIosStatusBarInset({
    isIOS,
    isSafariTab,
    isThirdParty,
    isStandalone,
    innerHeight: window.innerHeight,
    screenHeight: window.screen.height,
  });

  root.classList.toggle("lite-standalone", isStandalone);
  root.classList.toggle("lite-safari-tab", isSafariTab && !apply);

  if (!apply) {
    root.style.removeProperty("--safe-area-top");
    root.style.removeProperty("--safe-area-bottom");
    return;
  }

  const top = resolveIosSafeAreaTopPx({
    isIOS,
    isSafariTab,
    isThirdParty,
    isStandalone,
    measuredTop: measureInset("top"),
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });
  if (top != null) root.style.setProperty("--safe-area-top", `${top}px`);

  const bottom = measureInset("bottom");
  if (bottom > 0) {
    root.style.setProperty("--safe-area-bottom", `${Math.round(bottom)}px`);
  } else if (isStandalone && Math.max(window.screen.width, window.screen.height) >= 812) {
    root.style.setProperty("--safe-area-bottom", "34px");
  } else {
    root.style.removeProperty("--safe-area-bottom");
  }
}

let installed = false;

export function installIosSafeAreaSync() {
  if (installed) return;
  installed = true;
  const run = () => syncIosSafeArea();
  run();
  window.requestAnimationFrame(run);
  window.addEventListener("orientationchange", run);
  window.addEventListener("resize", run);
  window.visualViewport?.addEventListener("resize", run);
  window.addEventListener("pageshow", run);
  [50, 200, 800].forEach((delay) => window.setTimeout(run, delay));
}
