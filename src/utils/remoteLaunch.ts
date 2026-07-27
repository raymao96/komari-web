const remoteLaunchKey = "komari.remote.launch";
const remoteLaunchTTL = 30_000;

type RemoteLaunchTarget = {
  uuid: string;
  expiresAt: number;
};

export function openRemoteTerminal(uuid: string): boolean {
  if (!uuid) return false;
  const target = window.open("about:blank", "_blank");
  if (!target) return false;
  try {
    const launch: RemoteLaunchTarget = { uuid, expiresAt: Date.now() + remoteLaunchTTL };
    target.sessionStorage.setItem(remoteLaunchKey, JSON.stringify(launch));
    target.opener = null;
    target.location.replace("/terminal");
    return true;
  } catch {
    target.close();
    return false;
  }
}

export function consumeRemoteLaunchTarget(): string | null {
  const raw = window.sessionStorage.getItem(remoteLaunchKey);
  window.sessionStorage.removeItem(remoteLaunchKey);
  if (!raw) return null;
  try {
    const launch = JSON.parse(raw) as RemoteLaunchTarget;
    if (typeof launch.uuid !== "string" || !launch.uuid || launch.expiresAt < Date.now()) return null;
    return launch.uuid;
  } catch {
    return null;
  }
}
