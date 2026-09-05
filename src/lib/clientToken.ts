export class ClientTokenRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ClientTokenRequestError";
    this.status = status;
  }
}

export function isClientTokenTwoFactorRequired(error: unknown): boolean {
  return (
    error instanceof ClientTokenRequestError &&
    error.status === 401 &&
    /2fa code is required/i.test(error.message)
  );
}

export function isClientTokenTwoFactorInvalid(error: unknown): boolean {
  return (
    error instanceof ClientTokenRequestError &&
    error.status === 401 &&
    /invalid 2fa code/i.test(error.message)
  );
}

export function omitClientTokenFromNode<T extends object>(node: T): T {
  const copy = { ...node } as T & { token?: unknown };
  delete copy.token;
  return copy;
}

async function readSafeErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { message?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Ignore parse failures so response bodies are not forwarded into UI or logs.
  }
  return `HTTP ${response.status}`;
}

export async function fetchClientToken(
  uuid: string,
  options: { signal?: AbortSignal; twoFactorCode?: string } = {},
): Promise<string> {
  const headers: HeadersInit = {};
  const code = options.twoFactorCode?.trim();
  if (code) {
    headers["X-2FA-Code"] = code;
  }
  const response = await fetch(
    `/api/admin/client/${encodeURIComponent(uuid)}/token`,
    {
      cache: "no-store",
      signal: options.signal,
      headers,
    },
  );
  if (!response.ok) {
    throw new ClientTokenRequestError(
      response.status,
      await readSafeErrorMessage(response),
    );
  }
  const payload = (await response.json()) as { token?: unknown };
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    throw new Error("Token is unavailable");
  }
  return token;
}
