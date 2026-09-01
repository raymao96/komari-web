export interface GithubReleaseInfo {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
}

export interface VersionInfo {
  hash: string;
  version: string;
  deployment: "docker" | "linux" | "windows" | "unknown";
}

export interface SelfUpdateCapability {
  deployment: string;
  distribution?: string;
  distribution_version?: string;
  supported: boolean;
  reason?: string;
  last_result?: {
    status: string;
    target_version: string;
    target_hash: string;
    message?: string;
  };
}

export type UpdatePhase = "idle" | "preparing" | "restarting";

export function parseSemver(input?: string | null): number[] | null {
  if (!input) return null;
  const normalized = String(input).trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(left?: string | null, right?: string | null) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

export function parseReleaseVersionHash(body?: string | null) {
  const match = body?.match(
    /<!--\s*(?:lite|komari)-version-hash:\s*([a-z0-9]{7})\s*-->/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export function formatVersion(version?: string | null, hash?: string | null) {
  if (!version) return "";
  const normalizedHash = hash?.trim();
  return normalizedHash && normalizedHash !== "unknown"
    ? `${version} (${normalizedHash})`
    : version;
}

export function formatReleaseVersion(release?: GithubReleaseInfo | null) {
  if (!release) return "";
  return formatVersion(
    release.tag_name || release.name,
    parseReleaseVersionHash(release.body),
  );
}

export function visibleReleaseBody(body?: string | null) {
  return (body ?? "")
    .replace(/<!--\s*(?:lite|komari)-version-hash:\s*[a-z0-9]{7}\s*-->/i, "")
    .trim();
}

export function isReleaseNewer(
  release: GithubReleaseInfo,
  currentVersion?: string | null,
  currentHash?: string | null,
) {
  const comparison = compareSemver(
    release.tag_name || release.name,
    currentVersion,
  );
  if (comparison === null) return false;
  if (comparison !== 0) return comparison > 0;

  const releaseHash = parseReleaseVersionHash(release.body);
  const normalizedCurrentHash = currentHash?.trim().toLowerCase();
  return Boolean(
    releaseHash &&
      normalizedCurrentHash &&
      normalizedCurrentHash !== "unknown" &&
      releaseHash !== normalizedCurrentHash,
  );
}

export const DESKTOP_SIDEBAR_WIDTH = 220;
export const DESKTOP_MINI_SIDEBAR_WIDTH = 88;
export const MOBILE_SIDEBAR_WIDTH = 280;
export const NAV_MINI_STORAGE_KEY = "lite-admin-nav-rail";

export function readDesktopNavMini() {
  try {
    return window.localStorage.getItem(NAV_MINI_STORAGE_KEY) === "mini";
  } catch {
    return false;
  }
}

export function writeDesktopNavMini(mini: boolean) {
  try {
    window.localStorage.setItem(NAV_MINI_STORAGE_KEY, mini ? "mini" : "full");
  } catch {
    /* ignore quota / private mode */
  }
}

export function desktopNavWidth(mini: boolean) {
  return mini ? DESKTOP_MINI_SIDEBAR_WIDTH : DESKTOP_SIDEBAR_WIDTH;
}
