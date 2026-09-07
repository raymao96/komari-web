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

export function looksLikeFullBleedViewport(innerHeight: number, screenHeight: number) {
  return screenHeight > 0 && innerHeight / screenHeight >= 0.88;
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
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;padding-${side}:env(safe-area-inset-${side}, 0px)`;
  document.documentElement.appendChild(probe);
  const value =
    Number.parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0;
  probe.remove();
  return value;
}

export function syncIosSafeArea(root = document.documentElement) {
  const runtime = readCurrentRuntime();
  const safariTab = isIOSSafariTab(runtime);
  root.classList.toggle("lite-standalone", isStandaloneDisplay(runtime));
  root.classList.toggle("lite-safari-tab", safariTab);
  if (safariTab || !isIOSDevice(runtime)) {
    root.style.removeProperty("--safe-area-top");
    root.style.removeProperty("--safe-area-bottom");
    return;
  }

  const fullBleed = looksLikeFullBleedViewport(window.innerHeight, window.screen.height);
  if (measureInset("top") > 0 || !fullBleed) {
    root.style.removeProperty("--safe-area-top");
  } else {
    root.style.setProperty(
      "--safe-area-top",
      `${iosStatusBarFallbackPx(window.screen.width, window.screen.height)}px`,
    );
  }

  if (measureInset("bottom") > 0 || !fullBleed) {
    root.style.removeProperty("--safe-area-bottom");
  } else if (Math.max(window.screen.width, window.screen.height) >= 812) {
    root.style.setProperty("--safe-area-bottom", "34px");
  }
}

let installed = false;

export function installIosSafeAreaSync() {
  if (installed) return;
  installed = true;
  const run = () => syncIosSafeArea();
  run();
  window.addEventListener("orientationchange", run);
  window.addEventListener("resize", run);
  window.visualViewport?.addEventListener("resize", run);
  window.addEventListener("pageshow", run);
}
