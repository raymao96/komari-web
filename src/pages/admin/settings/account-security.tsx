import Account from "@/pages/admin/account";
import Sessions from "@/pages/admin/sessions";
import SignOnSettings from "@/pages/admin/settings/sign-on";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { AdminSheetTabs, AdminTabLabel } from "@/components/admin/AdminSheetTabs";
import { History, KeyRound, User } from "@/components/admin/muiIcons";
import Stack from "@mui/material/Stack";
import { Tabs } from "@/components/admin/ui";
import { useTranslation } from "react-i18next";
import { useAdminTabParam } from "@/hooks/useAdminTabParam";

const ACCOUNT_SECURITY_TABS = ["account", "sign-on", "sessions"] as const;

export default function AccountSecuritySettings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useAdminTabParam(
    ACCOUNT_SECURITY_TABS,
    "account",
  );

  return (
    <Stack spacing={2.5}>
      <AdminPageTitle
        description={t(
          "settings.account_security_page_description",
          "管理管理员账户、登录方式与当前会话。",
        )}
      >
        {t("navigation.account_security")}
      </AdminPageTitle>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <AdminSheetTabs>
          <Tabs.List>
            <Tabs.Trigger value="account">
              <AdminTabLabel icon={<User size={18} />}>{t("account.title")}</AdminTabLabel>
            </Tabs.Trigger>
            <Tabs.Trigger value="sign-on">
              <AdminTabLabel icon={<KeyRound size={18} />}>
                {t("settings.sign_on.title")}
              </AdminTabLabel>
            </Tabs.Trigger>
            <Tabs.Trigger value="sessions">
              <AdminTabLabel icon={<History size={18} />}>{t("sessions.title")}</AdminTabLabel>
            </Tabs.Trigger>
          </Tabs.List>
        </AdminSheetTabs>

        <Tabs.Content value="account" className="admin-tab-panel pt-3">
          {activeTab === "account" ? <Account /> : null}
        </Tabs.Content>
        <Tabs.Content value="sign-on" className="admin-tab-panel pt-3">
          {activeTab === "sign-on" ? (
            <Stack spacing={2.5}>
              <SignOnSettings />
            </Stack>
          ) : null}
        </Tabs.Content>
        <Tabs.Content value="sessions" className="admin-tab-panel pt-3">
          {activeTab === "sessions" ? <Sessions /> : null}
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  );
}
