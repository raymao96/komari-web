export type Account = {
  logged_in: boolean;
  sso_id: string;
  sso_type: string;
  username: string;
  uuid: string;
  "2fa_enabled": boolean;
};

export type AdminAuthView = "loading" | "error" | "login" | "admin";

type AuthState = {
  account: Pick<Account, "logged_in"> | null;
  loading: boolean;
  error: Error | null;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function resolveAdminAuthView({
  account,
  loading,
  error,
}: AuthState): AdminAuthView {
  if (loading) return "loading";
  if (error || !account) return "error";
  return account.logged_in ? "admin" : "login";
}

export function isAdminNodeBootstrapLoading(
  accountLoading: boolean,
  accountKey: string | null,
  loadedAccount: string | null,
  hasPreauthenticatedNodeData = false,
) {
  return (
    accountLoading ||
    Boolean(
      accountKey &&
        loadedAccount !== accountKey &&
        !hasPreauthenticatedNodeData,
    )
  );
}

export async function fetchAccount(
  fetcher: Fetcher = fetch,
): Promise<Account> {
  const response = await fetcher("/api/me", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch account data (${response.status})`);
  }
  return response.json() as Promise<Account>;
}

type PasswordLoginInput = {
  username: string;
  password: string;
  twoFactorCode?: string;
  twoFactorEnabled?: boolean;
  fetcher?: Fetcher;
  refreshAccount: () => Promise<void>;
};

export type PasswordLoginResult =
  | { ok: true }
  | { ok: false; message: string; requiresTwoFactor: boolean };

export async function submitPasswordLogin({
  username,
  password,
  twoFactorCode,
  twoFactorEnabled,
  fetcher = fetch,
  refreshAccount,
}: PasswordLoginInput): Promise<PasswordLoginResult> {
  const response = await fetcher("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
      ...(twoFactorCode && !twoFactorEnabled
        ? { "2fa_code": twoFactorCode }
        : {}),
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      message: data.message || `Login failed (${response.status})`,
      requiresTwoFactor: data.message === "2FA code is required",
    };
  }

  await refreshAccount();
  return { ok: true };
}
