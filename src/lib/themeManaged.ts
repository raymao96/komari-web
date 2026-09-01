import {
  fetchThemeManifest,
} from "@/utils/themeManifest";
import {
  getThemeConfigurationType,
  THEME_CONFIGURATION_MANAGED,
  type ThemeConfiguration,
} from "@/utils/themeConfiguration";
import type { ThemeConfigTabField } from "@/utils/themeConfigTabs";
import type { I18nText } from "@/utils/i18nText";

export interface ThemeManagedSnapshot {
  theme: string;
  fields: ThemeConfigTabField[];
  values: Record<string, unknown>;
}

type ThemeConfigResponse = {
  name?: I18nText;
  configuration?: ThemeConfiguration;
};

let themeManagedSnapshot: ThemeManagedSnapshot | null = null;

export function getThemeManagedSnapshot(
  theme?: string | null,
): ThemeManagedSnapshot | null {
  if (!theme || !themeManagedSnapshot) return null;
  return themeManagedSnapshot.theme === theme ? themeManagedSnapshot : null;
}

function rememberThemeManaged(snapshot: ThemeManagedSnapshot): ThemeManagedSnapshot {
  themeManagedSnapshot = snapshot;
  return snapshot;
}

export function buildThemeManagedValues(
  fields: ThemeConfigTabField[],
  themeSettings: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  fields.forEach((field) => {
    if (field.type === "title" || !field.key) return;
    values[field.key] =
      themeSettings && themeSettings[field.key] !== undefined
        ? themeSettings[field.key]
        : field.default;
  });
  return values;
}

export async function loadThemeManagedConfig(
  theme: string,
  themeSettings?: Record<string, unknown>,
): Promise<ThemeManagedSnapshot> {
  const response = await fetchThemeManifest(theme, { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: ThemeConfigResponse = await response.json();
  const configuration = data.configuration;
  if (
    getThemeConfigurationType(configuration) !== THEME_CONFIGURATION_MANAGED ||
    !Array.isArray(configuration?.data)
  ) {
    return rememberThemeManaged({ theme, fields: [], values: {} });
  }
  const fields = configuration.data as ThemeConfigTabField[];
  return rememberThemeManaged({
    theme,
    fields,
    values: buildThemeManagedValues(fields, themeSettings),
  });
}

export async function prefetchThemeManagedConfig(): Promise<ThemeManagedSnapshot | null> {
  const response = await fetch("/api/public");
  if (!response.ok) return themeManagedSnapshot;
  const payload = (await response.json().catch(() => null)) as {
    data?: { theme?: string; theme_settings?: Record<string, unknown> };
  } | null;
  const theme = payload?.data?.theme;
  if (!theme) return themeManagedSnapshot;
  const existing = getThemeManagedSnapshot(theme);
  if (existing) return existing;
  return loadThemeManagedConfig(theme, payload?.data?.theme_settings);
}
