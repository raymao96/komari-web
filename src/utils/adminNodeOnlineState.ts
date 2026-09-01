export function nodeOnlineState(
  available: boolean,
  onlineSet: ReadonlySet<string>,
  uuid: string,
): boolean | null {
  if (!available) return null;
  return onlineSet.has(uuid);
}
