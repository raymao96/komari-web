import { useTranslation } from "react-i18next";
import { Button, Code, Flex, Text, TextField } from "@/components/admin/ui";
import {
  updateSettingsWithToast,
  useSettings,
} from "@/lib/api";
import {
  SettingCardButton,
  SettingCardCollapse,
  SettingCardLabel,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import React from "react";
import { toast } from "sonner";
import SettingsPageSkeleton from "@/components/admin/SettingsPageSkeleton";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import {
  ADMIN_LIST_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_MAX,
  ADMIN_LIST_PAGE_SIZE_MIN,
  isValidAdminPageSize,
} from "@/utils/adminPagination";

export default function GeneralSettings() {
  const { t } = useTranslation();
  const { settings, loading, error, refetch, setSettings } = useSettings();
  const [geoip_testResult, setGeoipTestResult] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    if (loading || window.location.hash !== "#remote-management") return;
    document.getElementById("remote-management")?.scrollIntoView({
      block: "start",
    });
  }, [loading]);

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  if (error) {
    return <Text color="red">{error}</Text>;
  }

  return (
    <>
      <AdminPageTitle
        description={t(
          "settings.general.page_description",
          "配置 GeoIP 与其他全局行为。",
        )}
      >
        {t("settings.general.title")}
      </AdminPageTitle>
      <SettingCardLabel>
        {t("settings.general.admin_default_page_size")}
      </SettingCardLabel>
      <SettingCardShortTextInput
        description={t("settings.general.admin_default_page_size_description")}
        defaultValue={settings.admin_default_page_size || ADMIN_LIST_PAGE_SIZE}
        type="number"
        min={ADMIN_LIST_PAGE_SIZE_MIN}
        max={ADMIN_LIST_PAGE_SIZE_MAX}
        step={1}
        OnSave={async (data) => {
          const pageSize = Number(data);
          if (!isValidAdminPageSize(pageSize)) {
            toast.error(
              t("settings.general.admin_default_page_size_invalid", {
                min: ADMIN_LIST_PAGE_SIZE_MIN,
                max: ADMIN_LIST_PAGE_SIZE_MAX,
              }),
            );
            throw new Error("Invalid admin default page size");
          }
          await updateSettingsWithToast(
            { admin_default_page_size: pageSize },
            t,
          );
          await refetch();
        }}
      />
      <div id="remote-management">
        <SettingCardLabel>
          {t("navigation.remote_management")}
        </SettingCardLabel>
        <SettingCardSwitch
          title={t("settings.general.allow_remote_management")}
          description={t("settings.general.allow_remote_management_description")}
          defaultChecked={Boolean(settings.allow_remote_management)}
          onChange={async (checked) => {
            await updateSettingsWithToast(
              { allow_remote_management: checked },
              t,
            );
            setSettings((current) => ({
              ...current,
              allow_remote_management: checked,
            }));
          }}
        />
      </div>
      <SettingCardLabel>{t("settings.geoip.title")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("settings.geoip.enable_title")}
        description={t("settings.geoip.enable_description")}
        defaultChecked={settings.geo_ip_enabled}
        onChange={async (checked) => {
          await updateSettingsWithToast({ geo_ip_enabled: checked }, t);
        }}
      />
      <SettingCardSwitch
        title={t("settings.general.auto_order_new_clients")}
        description={t("settings.general.auto_order_new_clients_description")}
        defaultChecked={Boolean(settings.auto_order_new_clients_by_region)}
        onChange={async (checked) => {
          await updateSettingsWithToast(
            { auto_order_new_clients_by_region: checked },
            t,
          );
        }}
      />
      <SettingCardSelect
        title={t("settings.geoip.provider_title")}
        description={t("settings.geoip.provider_description")}
        defaultValue={settings.geo_ip_provider}
        options={[
          { value: "empty", label: t("common.none") },
          { value: "mmdb", label: "MaxMind" },
          { value: "ip-api", label: "ip-api.com" },
          { value: "geojs", label: "geojs.io" },
          { value: "ipinfo", label: "ipinfo.io" },
        ]}
        OnSave={async (value) => {
          await updateSettingsWithToast({ geo_ip_provider: value }, t);
        }}
      />
      <SettingCardButton
        title={t("settings.geoip.update_title")}
        onClick={async () => {
          const result = await fetch("/api/admin/update/mmdb", {
            method: "POST",
          });
          const data = await result.json();
          if (data.status === "success") {
            toast.success(t("settings.geoip.update_success"));
          } else {
            toast.error(
              data.message || t("settings.geoip.update_error")
            );
          }
        }}
      >
        {t("common.update")}
      </SettingCardButton>
      <SettingCardCollapse
        title={t("settings.geoip.test_title")}
        description={t("settings.geoip.test_description")}
      >
        <Flex className="w-full gap-2" direction="column">
          <TextField.Root placeholder="1.1.1.1 or 2606:4700:4700::1111"></TextField.Root>
          <div>
            <Button
              variant="solid"
              onClick={async () => {
                const ip = (
                  document.querySelector(
                    "input[placeholder]"
                  ) as HTMLInputElement
                ).value;
                const result = await fetch(`/api/admin/test/geoip?ip=${ip}`);
                const data = await result.json();
                setGeoipTestResult(
                  JSON.stringify(data.data, null, 2) || t("common.no_results")
                );
              }}
            >
              {t("settings.geoip.test_button")}
            </Button>
          </div>{" "}
          <Flex className="w-full">
            {geoip_testResult && (
              <Code
                className="w-full whitespace-pre-wrap text-sm p-3 rounded-md overflow-auto max-h-96"
                style={{ display: "block" }}
              >
                {geoip_testResult}
              </Code>
            )}
          </Flex>
        </Flex>
      </SettingCardCollapse>
    </>
  );
}
