export type AccountPasskeySummary = {
  id: string;
  name: string;
  created_at?: string;
  aaguid?: string;
};

const windowsHelloAAGUIDs = new Set([
  "08987058-cadc-4b81-b6e1-30de50dcbe96",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2",
]);

export function isWindowsHelloPasskey(aaguid?: string) {
  return windowsHelloAAGUIDs.has((aaguid || "").trim().toLowerCase());
}

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
