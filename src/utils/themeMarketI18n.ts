const themeMarketMessageKeys: Record<string, string> = {
  "Theme installed from market": "market.install_success",
  "This theme does not provide an installable package": "market.install_unavailable",
  "Theme not found in source": "market.theme_not_found",
  "Theme market source not found": "market.source_unavailable",
  "Theme market source not found or disabled": "market.source_unavailable",
  "Theme SHA-256 checksum does not match the market catalog": "market.checksum_mismatch",
  "Theme manifest does not match the market catalog": "market.manifest_mismatch",
};

export function themeMarketI18nKey(message?: string) {
  const text = message?.trim() ?? "";
  return themeMarketMessageKeys[text] || "";
}

export function localizeThemeMarketMessage(
  message: string | undefined,
  t: (key: string) => string,
) {
  const key = themeMarketI18nKey(message);
  if (key) return t(key);
  return message?.trim() || t("common.error");
}
