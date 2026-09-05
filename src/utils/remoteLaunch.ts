const remoteNodeIdPattern = /^[0-9A-Za-z][0-9A-Za-z._:-]{0,127}$/;

export function isSafeRemoteNodeId(uuid: string | null | undefined): uuid is string {
  return typeof uuid === "string" && remoteNodeIdPattern.test(uuid);
}

export function remoteTerminalPath(uuid: string): string {
  const params = new URLSearchParams({ node: uuid });
  return `/terminal#${params.toString()}`;
}

export function parseRemoteLaunchHash(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const uuid = params.get("node")?.trim() ?? "";
  return isSafeRemoteNodeId(uuid) ? uuid : null;
}

export function openRemoteTerminal(uuid: string): boolean {
  if (!isSafeRemoteNodeId(uuid)) return false;
  const path = remoteTerminalPath(uuid);
  if (window.matchMedia("(max-width:599.95px)").matches) {
    window.location.assign(path);
    return true;
  }
  const target = window.open(path, "_blank");
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
  return parseRemoteLaunchHash(window.location.hash);
}
