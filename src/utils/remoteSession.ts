export const remoteAgentWaitTimeoutMs = 30_000;

type ReleaseRemoteSession = (sessionID: string) => void;

function requestRemoteSessionRelease(sessionID: string) {
  void fetch("/api/admin/client/remote/session/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionID }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // The WebSocket close path remains a server-side cleanup fallback.
  });
}

export function createRemoteSessionLease(
  sessionID: string,
  releaseRemoteSession: ReleaseRemoteSession = requestRemoteSessionRelease,
) {
  let released = false;
  return {
    sessionID,
    release() {
      if (released) return;
      released = true;
      releaseRemoteSession(sessionID);
    },
  };
}
