export function sameOriginApiPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || /\\|\s/.test(path)) {
    throw new Error("Refusing a cross-origin API path");
  }
  return path;
}

export function sameOriginFetchInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    credentials: "same-origin",
    referrerPolicy: "same-origin",
  };
}

export function clientCookieSuffix() {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  return `; path=/; SameSite=Lax${secure}`;
}

export function isSafeTempKey(value: string) {
  return /^[A-Za-z0-9._-]{8,256}$/.test(value);
}

export function safeExternalRel(openInNewTab?: boolean) {
  return openInNewTab ? "noopener noreferrer" : undefined;
}
