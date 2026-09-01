export function resolveAdminTabParam<T extends string>(
  raw: string | null | undefined,
  tabs: readonly T[],
  fallback: T,
): T {
  return tabs.includes(raw as T) ? (raw as T) : fallback;
}

export function readAdminTabRaw(
  searchParams: URLSearchParams,
  param = "tab",
  aliases: readonly string[] = [],
): string | null {
  const primary = searchParams.get(param);
  if (primary) return primary;
  for (const alias of aliases) {
    const value = searchParams.get(alias);
    if (value) return value;
  }
  return null;
}

export function nextAdminTabSearchParams(
  current: URLSearchParams,
  tab: string,
  fallback: string,
  param = "tab",
  aliases: readonly string[] = [],
): URLSearchParams {
  const params = new URLSearchParams(current);
  if (tab === fallback) params.delete(param);
  else params.set(param, tab);
  for (const alias of aliases) params.delete(alias);
  return params;
}

export function shouldWriteAdminTabParam<T extends string>(
  current: URLSearchParams,
  next: T,
  tabs: readonly T[],
  fallback: T,
  param = "tab",
  aliases: readonly string[] = [],
): boolean {
  const currentTab = resolveAdminTabParam(
    readAdminTabRaw(current, param, aliases),
    tabs,
    fallback,
  );
  const hasAlias = aliases.some((key) => current.has(key));
  const matchesFallback =
    next === fallback ? !current.get(param) : current.get(param) === next;
  return next !== currentTab || hasAlias || !matchesFallback;
}
