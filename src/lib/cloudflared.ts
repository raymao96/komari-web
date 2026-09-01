export interface CloudflaredStatus {
  installed: boolean;
  running: boolean;
  message: string;
  errorMessage: string;
  logs: string[];
  pid?: number;
  binaryPath?: string;
  tokenStored: boolean;
  envTokenPresent: boolean;
}

export const CLOUDFLARED_STOP_CONFIRM_TEXT = "STOP CLOUDFLARED";

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || data.status === "error") {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data.data as T;
}

let cloudflaredStatusSnapshot: CloudflaredStatus | null = null;

export function getCloudflaredStatusSnapshot(): CloudflaredStatus | null {
  return cloudflaredStatusSnapshot;
}

function rememberCloudflaredStatus(status: CloudflaredStatus): CloudflaredStatus {
  const next = {
    ...status,
    logs: Array.isArray(status.logs) ? status.logs : [],
  };
  cloudflaredStatusSnapshot = next;
  return next;
}

export async function getCloudflaredStatus(): Promise<CloudflaredStatus> {
  const response = await fetch("/api/admin/settings/cloudflared");
  return rememberCloudflaredStatus(await parseResponse<CloudflaredStatus>(response));
}

export function prefetchCloudflaredStatus(): Promise<CloudflaredStatus> {
  return getCloudflaredStatus();
}

export async function startCloudflared(
  token: string
): Promise<CloudflaredStatus> {
  const response = await fetch("/api/admin/settings/cloudflared/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  return rememberCloudflaredStatus(await parseResponse<CloudflaredStatus>(response));
}

export async function stopCloudflared(
  currentPassword: string,
  confirmText: string
): Promise<CloudflaredStatus> {
  const response = await fetch("/api/admin/settings/cloudflared/stop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      confirm_text: confirmText,
    }),
  });
  return rememberCloudflaredStatus(await parseResponse<CloudflaredStatus>(response));
}

export async function removeCloudflaredToken(): Promise<CloudflaredStatus> {
  const response = await fetch("/api/admin/settings/cloudflared/remove-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return rememberCloudflaredStatus(await parseResponse<CloudflaredStatus>(response));
}
