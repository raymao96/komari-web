import React from "react";

import {
  DEFAULT_DASHBOARD_SETTINGS,
  dashboardSettingsEqual,
  sanitizeDashboardSettings,
  type DashboardSettings,
} from "@/utils/dashboardSettings";
import { readDashboardSession, writeDashboardSession } from "@/utils/dashboardSession";

const dashboardSettingsSnapshots = new Map<string, DashboardSettings>();
let latestDashboardSettings: DashboardSettings | null = null;
let pendingDashboardSettingsRequest: Promise<DashboardSettings> | null = null;

function normalizedAccountKey(accountKey?: string): string {
  return accountKey?.trim() || "authenticated";
}

function rememberDashboardSettings(
  accountKey: string,
  settings: DashboardSettings,
): DashboardSettings {
  dashboardSettingsSnapshots.set(accountKey, settings);
  latestDashboardSettings = settings;
  writeDashboardSession("settings", accountKey, "active", settings);
  return settings;
}

function cachedDashboardSettings(accountKey: string): DashboardSettings | null {
  const memory =
    dashboardSettingsSnapshots.get(accountKey) ?? latestDashboardSettings;
  if (memory) {
    dashboardSettingsSnapshots.set(accountKey, memory);
    return memory;
  }
  const stored =
    readDashboardSession<DashboardSettings>("settings", accountKey, "active") ??
    readDashboardSession<DashboardSettings>("settings", "authenticated", "active");
  if (!stored) return null;
  const settings = sanitizeDashboardSettings(stored);
  rememberDashboardSettings(accountKey, settings);
  return settings;
}

function readEnvelope(value: unknown): { data?: unknown; message?: unknown; status?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as { data?: unknown; message?: unknown; status?: unknown }
    : {};
}

async function responseError(response: Response, payload: unknown): Promise<Error> {
  const envelope = readEnvelope(payload);
  const message = typeof envelope.message === "string" && envelope.message.trim()
    ? envelope.message
    : `HTTP ${response.status}`;
  return new Error(message);
}

export async function fetchDashboardSettings(options?: {
  signal?: AbortSignal;
  force?: boolean;
  accountKey?: string;
}): Promise<DashboardSettings> {
  const accountKey = normalizedAccountKey(options?.accountKey);
  const snapshot = cachedDashboardSettings(accountKey);
  if (!options?.force && snapshot) return snapshot;
  if (pendingDashboardSettingsRequest) {
    return pendingDashboardSettingsRequest.then((settings) =>
      rememberDashboardSettings(accountKey, settings),
    );
  }

  const request = fetch("/api/admin/settings/dashboard", {
    cache: "no-store",
    signal: options?.signal,
  }).then(async (response) => {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // The HTTP status below remains the fallback.
    }
    if (!response.ok) throw await responseError(response, payload);
    const envelope = readEnvelope(payload);
    if (envelope.status !== "success") throw await responseError(response, payload);
    return rememberDashboardSettings(
      accountKey,
      sanitizeDashboardSettings(envelope.data),
    );
  });

  pendingDashboardSettingsRequest = request.finally(() => {
    pendingDashboardSettingsRequest = null;
  });
  return pendingDashboardSettingsRequest;
}

export async function saveDashboardSettings(
  settings: DashboardSettings,
  options?: { signal?: AbortSignal; accountKey?: string },
): Promise<DashboardSettings> {
  const accountKey = normalizedAccountKey(options?.accountKey);
  const normalized = sanitizeDashboardSettings(settings);
  const response = await fetch("/api/admin/settings/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
    signal: options?.signal,
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // The HTTP status below remains the fallback.
  }
  if (!response.ok) throw await responseError(response, payload);
  const envelope = readEnvelope(payload);
  if (envelope.status !== "success") throw await responseError(response, payload);
  return rememberDashboardSettings(
    accountKey,
    sanitizeDashboardSettings(envelope.data),
  );
}

export function getDashboardSettingsSnapshot(accountKey?: string): DashboardSettings | null {
  return cachedDashboardSettings(normalizedAccountKey(accountKey));
}

export async function prefetchDashboardSettings(
  accountKey?: string,
): Promise<DashboardSettings | null> {
  try {
    return await fetchDashboardSettings({ accountKey });
  } catch {
    return getDashboardSettingsSnapshot(accountKey);
  }
}

export function useDashboardSettings(accountKeyInput?: string) {
  const accountKey = normalizedAccountKey(accountKeyInput);
  const [settings, setSettings] = React.useState<DashboardSettings>(
    () => getDashboardSettingsSnapshot(accountKey) ?? DEFAULT_DASHBOARD_SETTINGS,
  );
  const [loading, setLoading] = React.useState(getDashboardSettingsSnapshot(accountKey) === null);
  const [error, setError] = React.useState<Error | null>(null);

  const applySettings = React.useCallback((next: DashboardSettings) => {
    setSettings((current) =>
      dashboardSettingsEqual(current, next) ? current : next,
    );
  }, []);

  const refetch = React.useCallback(async (force = false) => {
    if (!getDashboardSettingsSnapshot(accountKey)) setLoading(true);
    try {
      const next = await fetchDashboardSettings({ force, accountKey });
      applySettings(next);
      setError(null);
      return next;
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error(String(reason));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [accountKey, applySettings]);

  React.useEffect(() => {
    const cached = getDashboardSettingsSnapshot(accountKey);
    if (cached) applySettings(cached);
    else setSettings(DEFAULT_DASHBOARD_SETTINGS);
    setLoading(cached === null);
    if (!cached) {
      void refetch().catch(() => {});
      return;
    }
    void fetchDashboardSettings({ force: true, accountKey })
      .then((next) => {
        applySettings(next);
        setError(null);
      })
      .catch((reason) => setError(reason instanceof Error ? reason : new Error(String(reason))));
  }, [accountKey, applySettings, refetch]);

  return { settings, loading, error, refetch };
}
