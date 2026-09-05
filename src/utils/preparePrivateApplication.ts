const PRIVATE_PREFIXES = ["/admin", "/terminal", "/install", "/manage"];
const REFRESH_FLAG = "lite-sw-scope-cleared";

export function isPrivateApplicationPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return PRIVATE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function serviceWorkerScopeCoversPrivileged(
  scopeUrl: string,
  currentOrigin: string,
): boolean {
  let url: URL;
  try {
    url = new URL(scopeUrl, currentOrigin);
  } catch {
    return false;
  }
  if (url.origin !== currentOrigin) return false;
  const path = url.pathname.replace(/\/$/, "") || "/";
  return (
    path === "/" ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/terminal" ||
    path.startsWith("/terminal/") ||
    path === "/api" ||
    path.startsWith("/api/")
  );
}

export function isThemeNavigationCacheName(cacheName: string): boolean {
  const lower = cacheName.toLowerCase();
  return (
    lower.includes("theme") ||
    lower.includes("workbox") ||
    lower.includes("precache") ||
    lower.includes("runtime")
  );
}

async function unregisterPrivilegedServiceWorkers(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registrations = await navigator.serviceWorker.getRegistrations();
  let changed = false;
  await Promise.all(
    registrations.map(async (registration) => {
      if (
        !serviceWorkerScopeCoversPrivileged(
          registration.scope,
          window.location.origin,
        )
      ) {
        return;
      }
      await registration.unregister();
      changed = true;
    }),
  );
  return changed;
}

async function deleteThemeCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const currentOrigin = window.location.origin;
  for (const cacheName of await caches.keys()) {
    if (isThemeNavigationCacheName(cacheName)) {
      await caches.delete(cacheName);
      continue;
    }
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    await Promise.all(
      requests
        .filter((request) => {
          try {
            const url = new URL(request.url, currentOrigin);
            return (
              url.origin === currentOrigin &&
              (request.mode === "navigate" ||
                url.pathname === "/" ||
                url.pathname.startsWith("/themes/"))
            );
          } catch {
            return false;
          }
        })
        .map((request) => cache.delete(request)),
    );
  }
}

export async function preparePrivateApplication(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isPrivateApplicationPath(window.location.pathname)) return;
  try {
    if (window.sessionStorage.getItem(REFRESH_FLAG) === "1") {
      window.sessionStorage.removeItem(REFRESH_FLAG);
      return;
    }
  } catch {
    /* sessionStorage may be unavailable */
  }

  let changed = false;
  try {
    changed = await unregisterPrivilegedServiceWorkers();
  } catch (reason) {
    console.warn("Unable to inspect Lite service worker registrations", reason);
  }
  try {
    await deleteThemeCaches();
  } catch (reason) {
    console.warn("Unable to clear Lite theme caches", reason);
  }
  if (!changed) return;
  try {
    window.sessionStorage.setItem(REFRESH_FLAG, "1");
  } catch {
    /* continue with a one-shot reload even if the flag cannot be stored */
  }
  window.location.reload();
  await new Promise<void>(() => undefined);
}
