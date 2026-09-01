export const ADMIN_SCROLL_STORAGE_PREFIX = "lite:admin:scroll:";

export function adminScrollStorageKey(pathname: string, search: string): string {
  const query = !search || search.startsWith("?") ? search : `?${search}`;
  return `${ADMIN_SCROLL_STORAGE_PREFIX}${pathname}${query}`;
}

export function shouldSkipAdminScrollRestore(
  pathname: string,
  hash: string,
): boolean {
  if (hash && hash !== "#") return true;
  return pathname === "/admin" || pathname === "/admin/";
}

export function readAdminScrollTop(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

type ScrollStorage = Pick<Storage, "getItem" | "setItem">;

export function bindAdminScrollRestore({
  element,
  key,
  storage,
  skipRestore,
}: {
  element: HTMLElement;
  key: string;
  storage: ScrollStorage | null;
  skipRestore: boolean;
}): () => void {
  let userMoved = false;
  const saved = skipRestore ? 0 : readAdminScrollTop(storage?.getItem(key));
  const restoreUntil = Date.now() + 2000;

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(key, String(Math.max(0, Math.round(element.scrollTop))));
    } catch {
      // A full or disabled session store must not block admin pages.
    }
  };

  const restore = () => {
    if (skipRestore || userMoved) return;
    if (Date.now() > restoreUntil) return;
    if (element.scrollTop === saved) return;
    element.scrollTop = saved;
  };

  const markMoved = () => {
    userMoved = true;
  };

  restore();
  const frame = window.requestAnimationFrame(restore);
  const observer =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => restore())
      : null;
  observer?.observe(element);
  element.addEventListener("scroll", persist, { passive: true });
  element.addEventListener("wheel", markMoved, { passive: true });
  element.addEventListener("pointerdown", markMoved, { passive: true });
  element.addEventListener("touchstart", markMoved, { passive: true });

  return () => {
    window.cancelAnimationFrame(frame);
    observer?.disconnect();
    element.removeEventListener("scroll", persist);
    element.removeEventListener("wheel", markMoved);
    element.removeEventListener("pointerdown", markMoved);
    element.removeEventListener("touchstart", markMoved);
    persist();
  };
}
