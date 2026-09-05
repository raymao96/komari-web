import { sameOriginFetchInit } from "@/utils/security";
import {
  installedThemePreviewPath,
  themePreviewSrc,
} from "@/utils/themePreviewImage";
import type { I18nText } from "@/utils/i18nText";

export interface InstalledThemeDetails {
  name: I18nText;
  short: string;
  description: I18nText;
  author: I18nText;
  version: string;
  preview?: string;
  url?: string;
  active: boolean;
  configuration?: unknown;
}

const FIRST_SCREEN_PREVIEW_COUNT = 8;
const PREVIEW_WARMUP_MS = 800;

let installedThemesSnapshot: InstalledThemeDetails[] | null = null;
let installedThemesPending: Promise<InstalledThemeDetails[]> | null = null;
let installedThemesGeneration = 0;

export function getInstalledThemesSnapshot(): InstalledThemeDetails[] | null {
  return installedThemesSnapshot;
}

export function rememberInstalledThemes(
  themes: InstalledThemeDetails[],
  currentTheme?: string,
): InstalledThemeDetails[] {
  const list = (Array.isArray(themes) ? themes : []).map((theme) => ({
    ...theme,
    active: currentTheme ? theme.short === currentTheme : theme.active,
  }));
  installedThemesSnapshot = list;
  return list;
}

export function invalidateInstalledThemes() {
  installedThemesSnapshot = null;
  installedThemesPending = null;
  installedThemesGeneration += 1;
}

function warmupThemePreview(theme: InstalledThemeDetails): Promise<void> {
  const url = themePreviewSrc(installedThemePreviewPath(theme), {
    card: true,
    version: theme.version,
  });
  if (!url || typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

async function warmupFirstScreenPreviews(themes: InstalledThemeDetails[]) {
  await Promise.race([
    Promise.all(
      themes
        .slice(0, FIRST_SCREEN_PREVIEW_COUNT)
        .map((theme) => warmupThemePreview(theme)),
    ),
    new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, PREVIEW_WARMUP_MS);
    }),
  ]);
}

async function fetchInstalledThemes(
  currentTheme?: string,
): Promise<InstalledThemeDetails[]> {
  const generation = installedThemesGeneration;
  const response = await fetch(
    "/api/admin/theme/list",
    sameOriginFetchInit(),
  );
  const payload = (await response.json().catch(() => null)) as {
    status?: string;
    message?: string;
    data?: InstalledThemeDetails[];
  } | null;
  if (!response.ok || !payload || payload.status === "error") {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  if (generation !== installedThemesGeneration) {
    return installedThemesSnapshot ?? payload.data ?? [];
  }
  return rememberInstalledThemes(payload.data || [], currentTheme);
}

export async function prefetchInstalledThemes(
  currentTheme?: string,
): Promise<InstalledThemeDetails[]> {
  if (installedThemesSnapshot) return installedThemesSnapshot;
  if (!installedThemesPending) {
    installedThemesPending = fetchInstalledThemes(currentTheme)
      .then(async (themes) => {
        await warmupFirstScreenPreviews(themes);
        return themes;
      })
      .finally(() => {
        installedThemesPending = null;
      });
  }
  return installedThemesPending;
}

export async function refreshInstalledThemes(
  currentTheme?: string,
): Promise<InstalledThemeDetails[]> {
  return fetchInstalledThemes(currentTheme);
}
