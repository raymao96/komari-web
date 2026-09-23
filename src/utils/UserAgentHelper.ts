interface UserAgentInfo {
  device: keyof typeof DEVICE_LABELS;
  browser: keyof typeof BROWSER_LABELS;
  version: string;
}

const DEVICE_LABELS = {
  unknown: "",
  windows: "userAgent.windows",
  macos: "userAgent.macos",
  android: "userAgent.android",
  ios: "userAgent.ios",
  linux: "userAgent.linux",
} as const;

const BROWSER_LABELS = {
  unknown: "userAgent.unknown_client",
  edge: "userAgent.edge",
  chrome: "userAgent.chrome",
  firefox: "userAgent.firefox",
  safari: "userAgent.safari",
  powershell: "userAgent.powershell",
  curl: "userAgent.curl",
  go: "userAgent.go",
} as const;

function versionAfter(ua: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = ua.match(new RegExp(`${escaped}/(\\d+(?:\\.\\d+){0,3})`, "i"));
  return match?.[1] || "";
}

function detectDevice(ua: string): keyof typeof DEVICE_LABELS {
  // iPhone/iPad UAs contain "like Mac OS X". Match iOS tokens first.
  if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    ua.includes("cpu iphone os") ||
    ua.includes("crios/") ||
    ua.includes("fxios/") ||
    ua.includes("edgios/") ||
    ((ua.includes("macintosh") || ua.includes("mac os x")) && ua.includes("mobile"))
  ) {
    return "ios";
  }
  if (ua.includes("android")) {
    return "android";
  }
  if (ua.includes("windows") || ua.includes("win64") || ua.includes("win32")) {
    return "windows";
  }
  if (ua.includes("mac os x") || ua.includes("macintosh")) {
    return "macos";
  }
  if (ua.includes("linux") || ua.includes("x11")) {
    return "linux";
  }
  return "unknown";
}

export class UserAgentHelper {
  static parse(userAgent: string = ""): UserAgentInfo {
    const ua = userAgent.toLowerCase();
    const device = detectDevice(ua);

    let browser: keyof typeof BROWSER_LABELS = "unknown";
    let version = "";

    if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) {
      browser = "edge";
      version = versionAfter(ua, "edgios") || versionAfter(ua, "edga") || versionAfter(ua, "edg");
    } else if (ua.includes("chrome/") || ua.includes("crios/")) {
      browser = "chrome";
      version = versionAfter(ua, "crios") || versionAfter(ua, "chrome");
    } else if (ua.includes("firefox/") || ua.includes("fxios/")) {
      browser = "firefox";
      version = versionAfter(ua, "fxios") || versionAfter(ua, "firefox");
    } else if ((ua.includes("safari/") || ua.includes("applewebkit")) && !ua.includes("chrome") && !ua.includes("chromium")) {
      browser = "safari";
      version = versionAfter(ua, "version") || versionAfter(ua, "safari");
    } else if (ua.includes("windowspowershell/") || ua.includes("powershell/")) {
      browser = "powershell";
      version = versionAfter(ua, "windowspowershell") || versionAfter(ua, "powershell");
    } else if (ua.includes("curl/")) {
      browser = "curl";
      version = versionAfter(ua, "curl");
    } else if (ua.includes("go-http-client/")) {
      browser = "go";
      version = versionAfter(ua, "go-http-client");
    }

    return { device, browser, version };
  }

  static isWindows(userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
    return detectDevice((userAgent || "").toLowerCase()) === "windows";
  }

  static shortDevice(userAgent: string = ""): string {
    const ua = userAgent.toLowerCase();
    const device = detectDevice(ua);
    if (device === "ios") {
      return ua.includes("ipad") ? "iPad" : "iPhone";
    }
    if (device === "macos") return "Mac";
    if (device === "windows") return "Windows";
    if (device === "android") return "Android";
    if (device === "linux") return "Linux";
    return "Web";
  }

  static format(
    userAgent: string | undefined,
    t: (key: string) => string,
  ): string {
    const { device, browser, version } = this.parse(userAgent || "");
    const os = device === "unknown" ? "" : t(DEVICE_LABELS[device]);
    const client = t(BROWSER_LABELS[browser]);
    const labeled = version ? `${client}/${version}` : client;
    if (os && (browser !== "unknown" || version)) {
      return `${os} ${labeled}`;
    }
    if (os) {
      return `${os} ${t("userAgent.unknown_client")}`;
    }
    if (browser !== "unknown") {
      return labeled;
    }
    const raw = (userAgent || "").trim();
    return raw || t("userAgent.unknown_client");
  }
}
