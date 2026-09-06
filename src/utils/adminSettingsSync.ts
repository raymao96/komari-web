export const ADMIN_SETTINGS_SYNC_KEY = "lite-admin-settings-changed";
export const ADMIN_SETTINGS_SYNC_CHANNEL = "lite-admin-settings";

export function notifyAdminSettingsChanged() {
  const stamp = String(Date.now());
  try {
    localStorage.setItem(ADMIN_SETTINGS_SYNC_KEY, stamp);
  } catch {
    // Settings still apply; other tabs fall back to the remote-page poll.
  }
  try {
    const channel = new BroadcastChannel(ADMIN_SETTINGS_SYNC_CHANNEL);
    channel.postMessage(stamp);
    channel.close();
  } catch {
    // Older browsers still pick this up from storage or the remote-page poll.
  }
}

export function subscribeAdminSettingsChanged(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ADMIN_SETTINGS_SYNC_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(ADMIN_SETTINGS_SYNC_CHANNEL);
    channel.onmessage = () => onChange();
  } catch {
    channel = null;
  }
  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
