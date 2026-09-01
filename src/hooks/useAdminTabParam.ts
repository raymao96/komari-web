import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import {
  nextAdminTabSearchParams,
  readAdminTabRaw,
  resolveAdminTabParam,
  shouldWriteAdminTabParam,
} from "@/utils/adminTabParam";

const EMPTY_ALIASES: readonly string[] = [];

export function useAdminTabParam<T extends string>(
  tabs: readonly T[],
  fallback: T,
  options?: { param?: string; aliases?: readonly string[] },
): [T, (next: string) => void] {
  const param = options?.param ?? "tab";
  const aliases = options?.aliases ?? EMPTY_ALIASES;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveAdminTabParam(
    readAdminTabRaw(searchParams, param, aliases),
    tabs,
    fallback,
  );

  const setTab = useCallback((nextValue: string) => {
    const next = resolveAdminTabParam(nextValue, tabs, fallback);
    if (!shouldWriteAdminTabParam(searchParams, next, tabs, fallback, param, aliases)) {
      return;
    }
    setSearchParams(
      (current) => nextAdminTabSearchParams(current, next, fallback, param, aliases),
      { replace: true },
    );
  }, [aliases, fallback, param, searchParams, setSearchParams, tabs]);

  return [tab, setTab];
}
