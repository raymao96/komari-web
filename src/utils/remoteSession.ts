export const remoteAgentWaitTimeoutMs = 30_000;

const remoteErrorMessages: Record<string, string> = {
  "Remote control is disabled on this agent": "此 Agent 已关闭远程控制",
  "Remote control is disabled because the Lite Server endpoint resolves to this node":
    "出于本机地址保护，Agent 拒绝了远程控制",
  "Remote control is disabled because the Lite Server endpoint matches this node's reported address":
    "出于本机地址保护，Agent 拒绝了远程控制",
  "Remote session authorization failed": "远程会话验证失败，请重新连接",
  "Client is offline": "客户端当前离线",
  "Remote control requires an administrator session": "远程控制需要管理员登录",
  "Remote session not found": "远程会话不存在或已失效",
  "Remote session ID is required": "缺少远程会话标识",
  "Failed to create secure remote session": "无法创建安全的远程会话",
  "Remote connection failed": "远程连接失败",
  "client is being deleted": "客户端正在删除，暂时无法建立远程连接",
  "too many active remote sessions": "远程会话数量已满，请关闭不用的终端后重试",
};

export function localizeRemoteError(message?: string | null): string {
  const normalized = message?.trim();
  if (!normalized) return "远程连接失败";

  const exact = remoteErrorMessages[normalized];
  if (exact) return exact;

  const terminalPrefix = "Failed to start terminal:";
  if (normalized.startsWith(terminalPrefix)) {
    const detail = normalized.slice(terminalPrefix.length).trim();
    return detail ? `终端启动失败：${detail}` : "终端启动失败";
  }

  return normalized;
}

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
