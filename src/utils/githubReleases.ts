import type { GithubReleaseInfo } from "@/components/admin/shell/adminShellModel";

export const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/nuomiiiii/Lite/releases?per_page=20";
export const GITHUB_RELEASES_CACHE_KEY = "lite:admin:github-releases:v1";
export const GITHUB_RELEASES_CACHE_TTL_MS = 30 * 60 * 1000;
export const GITHUB_RELEASES_IDLE_DELAY_MS = 2500;
export const GITHUB_RELEASES_IDLE_TIMEOUT_MS = 4000;

type CacheEnvelope = {
  savedAt: number;
  releases: GithubReleaseInfo[];
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function isGithubReleaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com";
  } catch {
    return false;
  }
}

export function sanitizeGithubReleases(value: unknown): GithubReleaseInfo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.tag_name !== "string" || !row.tag_name.trim()) return [];
    if (typeof row.html_url !== "string" || !isGithubReleaseUrl(row.html_url)) {
      return [];
    }
    const release: GithubReleaseInfo = {
      tag_name: row.tag_name,
      html_url: row.html_url,
    };
    if (typeof row.name === "string") release.name = row.name;
    if (typeof row.body === "string") release.body = row.body;
    if (typeof row.published_at === "string") release.published_at = row.published_at;
    if (typeof row.draft === "boolean") release.draft = row.draft;
    if (typeof row.prerelease === "boolean") release.prerelease = row.prerelease;
    return [release];
  });
}

export function readGithubReleasesCache(
  storage: StorageLike | null,
  now = Date.now(),
): GithubReleaseInfo[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(GITHUB_RELEASES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (now - parsed.savedAt > GITHUB_RELEASES_CACHE_TTL_MS) return null;
    const releases = sanitizeGithubReleases(parsed.releases);
    return releases.length ? releases : null;
  } catch {
    return null;
  }
}

export function writeGithubReleasesCache(
  storage: StorageLike | null,
  releases: GithubReleaseInfo[],
  now = Date.now(),
) {
  if (!storage) return;
  try {
    storage.setItem(
      GITHUB_RELEASES_CACHE_KEY,
      JSON.stringify({
        savedAt: now,
        releases: sanitizeGithubReleases(releases),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export type IdleGithubTimers = {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (handle: number) => void;
};

export function scheduleIdleGithubReleasesLoad({
  load,
  delayMs = GITHUB_RELEASES_IDLE_DELAY_MS,
  timers,
}: {
  load: () => Promise<void> | void;
  delayMs?: number;
  timers: IdleGithubTimers;
}): () => void {
  let stopped = false;
  let idleHandle: number | undefined;
  let timeoutHandle: number | undefined;

  const run = () => {
    idleHandle = undefined;
    timeoutHandle = undefined;
    if (stopped) return;
    void Promise.resolve(load());
  };

  const afterDelay = () => {
    timeoutHandle = undefined;
    if (stopped) return;
    if (typeof timers.requestIdleCallback === "function") {
      idleHandle = timers.requestIdleCallback(run, {
        timeout: GITHUB_RELEASES_IDLE_TIMEOUT_MS,
      });
      return;
    }
    run();
  };

  timeoutHandle = timers.setTimeout(afterDelay, delayMs);

  return () => {
    stopped = true;
    if (idleHandle !== undefined) timers.cancelIdleCallback?.(idleHandle);
    if (timeoutHandle !== undefined) timers.clearTimeout(timeoutHandle);
  };
}

export async function fetchGithubReleases(
  fetcher: typeof fetch = fetch,
): Promise<GithubReleaseInfo[]> {
  const response = await fetcher(GITHUB_RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return sanitizeGithubReleases(await response.json());
}

export function browserSessionStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}
