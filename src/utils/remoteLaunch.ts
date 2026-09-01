const remoteLaunchKey = "lite.remote.launch";
const legacyRemoteLaunchKey = "komari.remote.launch";

type RemoteLaunchTarget = {
  uuid: string;
  expiresAt: number;
};

export function remoteTerminalPath(uuid: string): string {
  const params = new URLSearchParams({ node: uuid });
  return `/terminal#${params.toString()}`;
}

export function parseRemoteLaunchHash(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const uuid = params.get("node")?.trim();
  return uuid || null;
}

export function parseLegacyRemoteLaunchTarget(
  raw: string | null,
  now = Date.now(),
): string | null {
  if (!raw) return null;
  try {
    const launch = JSON.parse(raw) as RemoteLaunchTarget;
    if (typeof launch.uuid !== "string" || !launch.uuid || launch.expiresAt < now) return null;
    return launch.uuid;
  } catch {
    return null;
  }
}

export function openRemoteTerminal(uuid: string): boolean {
  if (!uuid) return false;
  const target = window.open(remoteTerminalPath(uuid), "_blank");
  if (!target) return false;
  try {
    target.opener = null;
    return true;
  } catch {
    target.close();
    return false;
  }
}

export function getRemoteLaunchTarget(): string | null {
  const hashTarget = parseRemoteLaunchHash(window.location.hash);
  if (hashTarget) return hashTarget;

  // Compatibility for an already-open admin page that still launches the
  // terminal with the pre-hash handoff used by older frontend bundles.
  const raw =
    window.sessionStorage.getItem(remoteLaunchKey) ??
    window.sessionStorage.getItem(legacyRemoteLaunchKey);
  window.sessionStorage.removeItem(remoteLaunchKey);
  window.sessionStorage.removeItem(legacyRemoteLaunchKey);
  return parseLegacyRemoteLaunchTarget(raw);
}
