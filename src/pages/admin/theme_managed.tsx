import React, { useEffect, useMemo, useState } from "react";
import { Flex, Callout, Button } from "@/components/admin/ui";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import ThemeConfigTabs from "@/components/admin/ThemeConfigTabs";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { resolveI18nText } from "@/utils/i18nText";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import {
  buildThemeManagedValues,
  getThemeManagedSnapshot,
  loadThemeManagedConfig,
} from "@/lib/themeManaged";

const ThemeManaged: React.FC = () => {
  const {
    publicInfo,
    isLoading: publicInfoLoading,
    error: publicInfoError,
    refresh,
  } = usePublicInfo();
  const theme = publicInfo?.theme;
  const themeSettings = publicInfo?.theme_settings || {};
  const { t, i18n } = useTranslation();

  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    (typeof navigator !== "undefined" ? navigator.language : "");

  const snapshot = getThemeManagedSnapshot(theme);
  const [loading, setLoading] = useState(() => snapshot === null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState(snapshot?.fields ?? []);
  const [values, setValues] = useState<Record<string, any>>(
    snapshot?.values ?? {},
  );
  const [error, setError] = useState<string | null>(null);
  const [firstLoading, setFirstLoading] = useState(() => snapshot === null);

  useEffect(() => {
    async function load() {
      if (publicInfoLoading || (!publicInfo && !publicInfoError)) {
        if (!getThemeManagedSnapshot(theme)) setLoading(true);
        return;
      }
      if (publicInfoError) {
        setError(publicInfoError);
        setLoading(false);
        setFirstLoading(false);
        return;
      }
      if (!theme) {
        setFields([]);
        setValues({});
        setLoading(false);
        setFirstLoading(false);
        return;
      }
      const cached = getThemeManagedSnapshot(theme);
      if (!cached) setLoading(true);
      setError(null);
      try {
        const next = cached
          ? cached
          : await loadThemeManagedConfig(theme, themeSettings);
        setFields(next.fields);
        setValues(
          cached
            ? buildThemeManagedValues(next.fields, themeSettings)
            : next.values,
        );
      } catch (e: any) {
        setError(e.message || t("theme.load_config_failed"));
      } finally {
        setLoading(false);
        setFirstLoading(false);
      }
    }
    void load();
  }, [currentLanguage, publicInfo, publicInfoError, publicInfoLoading, theme, themeSettings, t]);

  const handleValueChange = (key: string, val: any) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const payload = useMemo(() => {
    const obj: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "title" || !f.key) return;
      const current = values[f.key];
      if (current !== undefined) {
        obj[f.key] = current;
      } else if (f.default !== undefined) {
        obj[f.key] = f.default;
      } else {
        obj[f.key] = "";
      }
    });
    return obj;
  }, [fields, values]);

  const saveAll = async () => {
    if (!theme) return;
    setSaving(true);
    try {
      const resp = await fetch(
        `/api/admin/theme/settings?theme=${encodeURIComponent(theme)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({ message: "unknown" }));
        throw new Error(d.message || `HTTP ${resp.status}`);
      }
      toast.success(t("settings.settings_saved"));
      refresh();
    } catch (e: any) {
      toast.error(`${t("settings.settings_save_failed")}: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flex
      direction="column"
      gap="4"
      className="km-page-admin-theme-managed p-0 md:p-4"
      data-admin-route-pending={firstLoading ? "true" : undefined}
    >
      <Flex justify="between" align="center" gap="3" wrap="wrap">
        <AdminPageTitle description={t("theme.manage_description", "调整当前主题提供的显示和功能选项。")}> 
          {t("theme.configure", "主题设置")}
        </AdminPageTitle>
        {fields.length > 0 && (
          <Button onClick={saveAll} disabled={saving}>
            {t("common.save")}
          </Button>
        )}
      </Flex>
      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      {!loading && !error && fields.length === 0 && theme !== "default" && (
        <Callout.Root>
          <Callout.Text>{t("theme.no_config")}</Callout.Text>
        </Callout.Root>
      )}
      {fields.length > 0 && (
        <ThemeConfigTabs
          fields={fields}
          values={values}
          onValueChange={handleValueChange}
          resolveText={(value) => resolveI18nText(value, currentLanguage)}
          footer={
            <Flex>
              <Button onClick={saveAll} disabled={saving}>
                {t("common.save")}
              </Button>
            </Flex>
          }
        />
      )}
    </Flex>
  );
};

export default ThemeManaged;
