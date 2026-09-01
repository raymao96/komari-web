export const THEME_MANIFEST_FILES = [
  "Lite-theme.json",
  "komari-theme.json",
] as const;

export function themeManifestUrl(themeShort: string, file: string) {
  return `/themes/${encodeURIComponent(themeShort)}/${file}`;
}

export async function fetchThemeManifest(
  themeShort: string,
  init?: RequestInit,
) {
  let last: Response | undefined;
  for (const file of THEME_MANIFEST_FILES) {
    const response = await fetch(themeManifestUrl(themeShort, file), init);
    if (response.ok || response.status !== 404) {
      return response;
    }
    last = response;
  }
  return last!;
}
