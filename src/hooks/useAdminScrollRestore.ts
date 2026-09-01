import { useEffect, type RefObject } from "react";
import { useLocation } from "react-router-dom";

import {
  adminScrollStorageKey,
  bindAdminScrollRestore,
  shouldSkipAdminScrollRestore,
} from "@/utils/adminScrollRestore";

function activeSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function useAdminScrollRestore(
  containerRef: RefObject<HTMLElement | null>,
) {
  const location = useLocation();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (shouldSkipAdminScrollRestore(location.pathname, location.hash)) {
      return;
    }
    return bindAdminScrollRestore({
      element,
      key: adminScrollStorageKey(location.pathname, location.search),
      storage: activeSessionStorage(),
      skipRestore: false,
    });
  }, [containerRef, location.hash, location.pathname, location.search]);
}
