import { sameOriginFetchInit } from "@/utils/security";
import { themePreviewSrc } from "@/utils/themePreviewImage";
import type { I18nText } from "@/utils/i18nText";
import {
  rememberInstalledThemes,
  type InstalledThemeDetails,
} from "@/lib/themeList";

export interface MarketSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface MarketSourceStatus {
  id: string;
  name: string;
  url: string;
  count: number;
  error?: string;
}

export interface MarketTheme {
  name: I18nText;
  short: string;
  description: I18nText;
  version: string;
  author: I18nText;
  url: string;
  preview: string;
  download: string;
  sha256: string;
  installable: boolean;
  source_id: string;
  source_name: string;
}

export interface ThemeMarketSnapshot {
  themes: MarketTheme[];
  sourceStatuses: MarketSourceStatus[];
  sources: MarketSource[];
  installed: Array<[string, string]>;
}

interface APIResponse<T> {
  status: string;
  message?: string;
  data: T;
}

const FIRST_SCREEN_PREVIEW_COUNT = 8;
const PREVIEW_WARMUP_MS = 800;

let themeMarketSnapshot: ThemeMarketSnapshot | null = null;
let themeMarketPending: Promise<ThemeMarketSnapshot> | null = null;

export function getThemeMarketSnapshot(): ThemeMarketSnapshot | null {
  return themeMarketSnapshot;
}

function rememberThemeMarket(snapshot: ThemeMarketSnapshot): ThemeMarketSnapshot {
  themeMarketSnapshot = snapshot;
  return snapshot;
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, sameOriginFetchInit(init));
  const payload = (await response.json().catch(() => null)) as APIResponse<T> | null;
  if (!response.ok || !payload || payload.status === "error") {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return payload;
}

function warmupThemePreview(src?: string): Promise<void> {
  const url = themePreviewSrc(src, { card: true });
  if (!url || typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

async function warmupFirstScreenPreviews(themes: MarketTheme[]) {
  await Promise.race([
    Promise.all(
      themes
        .slice(0, FIRST_SCREEN_PREVIEW_COUNT)
        .map((theme) => warmupThemePreview(theme.preview)),
    ),
    new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, PREVIEW_WARMUP_MS);
    }),
  ]);
}

async function fetchThemeMarket(): Promise<ThemeMarketSnapshot> {
  const [catalogPayload, installedPayload, sourcesPayload] = await Promise.all([
    request<{ themes: MarketTheme[]; sources: MarketSourceStatus[] }>(
      "/api/admin/theme/market/catalog",
    ),
    request<InstalledThemeDetails[]>("/api/admin/theme/list"),
    request<MarketSource[]>("/api/admin/theme/market/sources"),
  ]);
  const installedThemes = installedPayload.data || [];
  rememberInstalledThemes(installedThemes);
  return rememberThemeMarket({
    themes: catalogPayload.data?.themes || [],
    sourceStatuses: catalogPayload.data?.sources || [],
    sources: sourcesPayload.data || [],
    installed: installedThemes.map((theme) => [theme.short, theme.version]),
  });
}

export async function prefetchThemeMarket(): Promise<ThemeMarketSnapshot> {
  if (themeMarketSnapshot) return themeMarketSnapshot;
  if (!themeMarketPending) {
    themeMarketPending = fetchThemeMarket()
      .then(async (snapshot) => {
        await warmupFirstScreenPreviews(snapshot.themes);
        return snapshot;
      })
      .finally(() => {
        themeMarketPending = null;
      });
  }
  return themeMarketPending;
}

export async function refreshThemeMarketCatalog(
  force = false,
): Promise<ThemeMarketSnapshot> {
  const suffix = force ? "?refresh=true" : "";
  const [catalogPayload, installedPayload] = await Promise.all([
    request<{ themes: MarketTheme[]; sources: MarketSourceStatus[] }>(
      `/api/admin/theme/market/catalog${suffix}`,
    ),
    request<InstalledThemeDetails[]>("/api/admin/theme/list"),
  ]);
  const sources = themeMarketSnapshot?.sources ?? [];
  const installedThemes = installedPayload.data || [];
  rememberInstalledThemes(installedThemes);
  return rememberThemeMarket({
    themes: catalogPayload.data?.themes || [],
    sourceStatuses: catalogPayload.data?.sources || [],
    sources,
    installed: installedThemes.map((theme) => [theme.short, theme.version]),
  });
}

export async function loadThemeMarketSources(): Promise<MarketSource[]> {
  const payload = await request<MarketSource[]>("/api/admin/theme/market/sources");
  const sources = payload.data || [];
  if (themeMarketSnapshot) {
    themeMarketSnapshot = { ...themeMarketSnapshot, sources };
  }
  return sources;
}

export { request as themeMarketRequest };
