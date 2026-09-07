export const NATIVE_IPHONE_SAFARI_TAB_UA =
  /Version\/[\d.]+ Mobile\/[A-Za-z0-9]+ Safari\/[\d.]+$/;

export const IOS_BROWSE_MODE_ATTR = "data-lite-ios-mode";

export type IosBrowseMode = "safari-tab" | "ios-overlay" | "standalone";
export type LockedIosBrowseMode = IosBrowseMode | "none";

export type SafeAreaRuntime = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayStandalone?: boolean;
  displayFullscreen?: boolean;
  displayMinimalUi?: boolean;
  measuredTop?: number;
};

export type IosOrientationInput = {
  windowOrientation?: number | null;
  orientationType?: string | null;
  innerWidth?: number;
  innerHeight?: number;
};

export type IosStatusBarFallbackInput = {
  isIPad?: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  innerHeight?: number;
};

export type SafeAreaRoot = {
  classList: {
    toggle(token: string, force?: boolean): boolean;
  };
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): string;
  };
};

export type SyncIosSafeAreaOptions = {
  reclassify?: boolean;
  allowUpgrade?: boolean;
  useMeasuredTop?: boolean;
};

export function isIPhoneDevice(
  runtime: Pick<SafeAreaRuntime, "userAgent">,
) {
  return /iP(hone|od)/.test(runtime.userAgent || "");
}

export function isIPadDevice(
  runtime: Pick<SafeAreaRuntime, "userAgent" | "platform" | "maxTouchPoints">,
) {
  const ua = runtime.userAgent || "";
  if (/iPad/.test(ua)) return true;
  if (isIPhoneDevice(runtime)) return false;
  return runtime.platform === "MacIntel" && (runtime.maxTouchPoints ?? 0) > 1;
}

export function isIOSDevice(
  runtime: Pick<SafeAreaRuntime, "userAgent" | "platform" | "maxTouchPoints">,
) {
  return isIPhoneDevice(runtime) || isIPadDevice(runtime);
}

export function isStandaloneDisplay(runtime: SafeAreaRuntime) {
  return Boolean(
    runtime.standalone ||
      runtime.displayStandalone ||
      runtime.displayFullscreen ||
      runtime.displayMinimalUi,
  );
}

export function isNativeIosSafariTab(runtime: SafeAreaRuntime) {
  if (!isIPhoneDevice(runtime)) return false;
  if (isStandaloneDisplay(runtime)) return false;
  return NATIVE_IPHONE_SAFARI_TAB_UA.test(runtime.userAgent || "");
}

export function classifyIosBrowseMode(
  runtime: SafeAreaRuntime,
  options?: { useMeasuredTop?: boolean },
): IosBrowseMode | null {
  if (!isIPhoneDevice(runtime)) return null;
  if (isStandaloneDisplay(runtime)) return "standalone";
  if (isNativeIosSafariTab(runtime)) {
    if (options?.useMeasuredTop && (runtime.measuredTop ?? 0) > 0) {
      return "ios-overlay";
    }
    return "safari-tab";
  }
  return "ios-overlay";
}

function isOverlayLike(mode: IosBrowseMode | null) {
  return mode === "ios-overlay" || mode === "standalone";
}

export function isLandscapeOrientation(input: IosOrientationInput) {
  const type = input.orientationType || "";
  if (type.startsWith("landscape")) return true;
  if (type.startsWith("portrait")) return false;
  if (typeof input.windowOrientation === "number") {
    return Math.abs(input.windowOrientation) === 90;
  }
  return (input.innerWidth ?? 0) > (input.innerHeight ?? 0);
}

export function iosStatusBarFallbackPx(input: IosStatusBarFallbackInput) {
  if (input.isIPad) return 0;
  if (input.isLandscape) return 0;
  const long = Math.max(input.screenWidth, input.screenHeight);
  if (long < 812) return 20;
  if (long === 896 || long === 926) return 47;
  if (long >= 852) return 59;
  return 47;
}

export function applyIosBrowseModeClasses(
  root: SafeAreaRoot,
  mode: IosBrowseMode | null,
) {
  root.classList.toggle("lite-safari-tab", mode === "safari-tab");
  root.classList.toggle(
    "lite-ios-overlay",
    mode === "ios-overlay" || mode === "standalone",
  );
  root.classList.toggle("lite-standalone", mode === "standalone");
  root.setAttribute(IOS_BROWSE_MODE_ATTR, mode ?? "none");
}

export function syncIosSafeAreaFromRuntime(
  root: SafeAreaRoot,
  runtime: SafeAreaRuntime,
  geometry: IosStatusBarFallbackInput,
  options?: SyncIosSafeAreaOptions,
) {
  const reclassify =
    options?.reclassify === true || !root.hasAttribute(IOS_BROWSE_MODE_ATTR);
  const useMeasuredTop = options?.useMeasuredTop === true || reclassify;
  const detected = classifyIosBrowseMode(runtime, { useMeasuredTop });
  const locked = root.getAttribute(IOS_BROWSE_MODE_ATTR);
  let mode: IosBrowseMode | null;

  if (reclassify) {
    mode = detected;
    applyIosBrowseModeClasses(root, mode);
  } else if (
    options?.allowUpgrade === true &&
    locked === "safari-tab" &&
    isOverlayLike(detected)
  ) {
    mode = detected;
    applyIosBrowseModeClasses(root, mode);
  } else {
    mode = locked && locked !== "none" ? (locked as IosBrowseMode) : null;
  }

  if (isOverlayLike(mode)) {
    root.style.setProperty(
      "--ios-status-bar-fallback",
      `${iosStatusBarFallbackPx(geometry)}px`,
    );
    return mode;
  }

  root.style.removeProperty("--ios-status-bar-fallback");
  return mode;
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
      getComputedStyle(probe).getPropertyValue(
        side === "top" ? "padding-top" : "padding-bottom",
      ),
    ) || 0;
  probe.remove();
  return value;
}

function readCurrentRuntime(useMeasuredTop = false): SafeAreaRuntime {
  return {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone:
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true,
    displayStandalone: window.matchMedia?.("(display-mode: standalone)").matches,
    displayFullscreen: window.matchMedia?.("(display-mode: fullscreen)").matches,
    displayMinimalUi: window.matchMedia?.("(display-mode: minimal-ui)").matches,
    measuredTop: useMeasuredTop ? measureInset("top") : 0,
  };
}

function readOrientationInput(): IosOrientationInput {
  return {
    windowOrientation: (window as Window & { orientation?: number }).orientation,
    orientationType: window.screen.orientation?.type,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };
}

function readOrientationKey() {
  const type = window.screen.orientation?.type;
  if (type) return type;
  const orientation = (window as Window & { orientation?: number }).orientation;
  if (typeof orientation === "number") return String(orientation);
  return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
}

function readGeometry(): IosStatusBarFallbackInput {
  return {
    isIPad: isIPadDevice(readCurrentRuntime()),
    isLandscape: isLandscapeOrientation(readOrientationInput()),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}

export function syncIosSafeArea(
  root: SafeAreaRoot = document.documentElement,
  options?: SyncIosSafeAreaOptions,
) {
  const useMeasuredTop = options?.useMeasuredTop === true || options?.reclassify === true;
  return syncIosSafeAreaFromRuntime(
    root,
    readCurrentRuntime(useMeasuredTop),
    readGeometry(),
    options,
  );
}

let installed = false;
let lastOrientationKey = "";

export function installIosSafeAreaSync() {
  if (installed) return;
  installed = true;
  lastOrientationKey = readOrientationKey();
  const root = document.documentElement;
  const upgradeFromHomeScreen = {
    reclassify: false,
    allowUpgrade: true,
    useMeasuredTop: true,
  } satisfies SyncIosSafeAreaOptions;

  syncIosSafeArea(root, upgradeFromHomeScreen);
  window.requestAnimationFrame(() => {
    syncIosSafeArea(root, upgradeFromHomeScreen);
  });

  for (const query of [
    "(display-mode: standalone)",
    "(display-mode: fullscreen)",
    "(display-mode: minimal-ui)",
  ]) {
    window.matchMedia?.(query)?.addEventListener("change", () => {
      syncIosSafeArea(root, { reclassify: false, allowUpgrade: true });
    });
  }

  window.addEventListener("orientationchange", () => {
    lastOrientationKey = readOrientationKey();
    syncIosSafeArea(root, { reclassify: false });
  });

  window.addEventListener("resize", () => {
    const next = readOrientationKey();
    if (next === lastOrientationKey) return;
    lastOrientationKey = next;
    syncIosSafeArea(root, { reclassify: false });
  });

  window.addEventListener("pageshow", () => {
    syncIosSafeArea(root, { reclassify: false, allowUpgrade: true });
  });
}
