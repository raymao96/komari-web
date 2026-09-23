export type AccountPasskeySummary = {
  id: string;
  name: string;
  created_at?: string;
};

let accountPasskeysSnapshot: AccountPasskeySummary[] | null = null;
let accountPasskeysPending: Promise<AccountPasskeySummary[]> | null = null;

export function readPasskeyList(body: unknown): AccountPasskeySummary[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: AccountPasskeySummary[] }).data;
  }
  return [];
}

export function getAccountPasskeySnapshot(): AccountPasskeySummary[] | null {
  return accountPasskeysSnapshot;
}

export function rememberAccountPasskeys(
  items: AccountPasskeySummary[],
): AccountPasskeySummary[] {
  const list = Array.isArray(items) ? items : [];
  accountPasskeysSnapshot = list;
  return list;
}

async function fetchAccountPasskeys(): Promise<AccountPasskeySummary[]> {
  const response = await fetch("/api/admin/account/passkeys", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return rememberAccountPasskeys(readPasskeyList(await response.json()));
}

export async function prefetchAccountPasskeys(
  force = false,
): Promise<AccountPasskeySummary[]> {
  if (!force && accountPasskeysSnapshot) return accountPasskeysSnapshot;
  if (!accountPasskeysPending) {
    accountPasskeysPending = fetchAccountPasskeys().finally(() => {
      accountPasskeysPending = null;
    });
  }
  return accountPasskeysPending;
}
