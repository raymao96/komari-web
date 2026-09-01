import React from "react";
import { useAccount } from "@/contexts/AccountContext";
import i18n, { changeUiLanguage } from "@/i18n/config";
import {
  normalizeAccountPreferenceLanguage,
  type AccountPreferences,
} from "@/utils/adminAuth";
import { readStoredLanguage } from "@/utils/language";

const AccountPreferenceSync = () => {
  const { account, updatePreferences } = useAccount();
  const syncedAccount = React.useRef<string | null>(null);

  React.useLayoutEffect(() => {
    if (!account?.logged_in || !account.uuid) {
      syncedAccount.current = null;
      return;
    }
    if (syncedAccount.current === account.uuid) return;
    syncedAccount.current = account.uuid;

    const savedLanguage = normalizeAccountPreferenceLanguage(account.language);
    const localLanguage =
      normalizeAccountPreferenceLanguage(readStoredLanguage()) ||
      normalizeAccountPreferenceLanguage(i18n.resolvedLanguage) ||
      normalizeAccountPreferenceLanguage(i18n.language) ||
      "en-US";

    if (savedLanguage) {
      void changeUiLanguage(savedLanguage);
    } else {
      const initialPreferences: AccountPreferences = { language: localLanguage };
      void updatePreferences(initialPreferences).catch((error) => {
        console.warn("Failed to initialize account preferences:", error);
      });
    }
  }, [account, updatePreferences]);

  return null;
};

export default AccountPreferenceSync;
