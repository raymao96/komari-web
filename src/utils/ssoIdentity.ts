export function ssoProviderKey(ssoId?: string, oauthProvider?: string) {
  const raw = String(ssoId || "").trim();
  const separator = raw.indexOf("_");
  const fromId = separator >= 0 ? raw.slice(0, separator) : raw;
  const key = (fromId || oauthProvider || "github").trim().toLowerCase();
  return key || "github";
}

export function ssoExternalId(ssoId?: string) {
  const raw = String(ssoId || "");
  const separator = raw.indexOf("_");
  return separator >= 0 ? raw.slice(separator + 1) : "";
}

export function ssoProviderLabel(key: string) {
  if (key === "github") return "GitHub";
  if (key === "qq") return "QQ";
  if (key === "generic") return "SSO";
  if (!key) return "GitHub";
  return key.charAt(0).toUpperCase() + key.slice(1);
}
