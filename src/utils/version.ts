export function publicVersion(version?: string | null): string {
  return version?.split("+", 1)[0] ?? "";
}
