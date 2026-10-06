import { useTranslation } from "react-i18next";
import { Text } from "@/components/admin/ui";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  SettingCard,
  SettingCardButton,
  SettingCardLongTextInput,
  SettingCardSelect,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { toast } from "sonner";
import SettingsPageSkeleton from "@/components/admin/SettingsPageSkeleton";
import React from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { renderProviderInputs } from "@/utils/renderProviders";
import { SquareArrowOutUpRight } from "@/components/admin/muiIcons";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { adminMenuProps } from "@/components/admin/adminMenu";

const NOTIFICATION_KINDS = [
  "offline",
  "online",
  "load",
  "traffic",
  "expire",
  "renew",
  "login",
  "ping_loss",
  "ping_latency",
  "traffic_report_daily",
  "traffic_report_weekly",
  "traffic_report_monthly",
  "return_route",
  "mainland_reachability",
] as const;

type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
type NotificationRoutes = Record<NotificationKind, string[]>;

const ROUTE_CUSTOM = "__custom__";
const DIGEST_SECONDS_MIN = 1;
const DIGEST_SECONDS_MAX = 3600;

const emptyRoutes = (): NotificationRoutes => {
  const routes = {} as NotificationRoutes;
  for (const kind of NOTIFICATION_KINDS) routes[kind] = [];
  return routes;
};

const readRoutes = (raw: unknown): NotificationRoutes => {
  const routes = emptyRoutes();
  if (!raw || typeof raw !== "object") return routes;
  const source = raw as Record<string, unknown>;
  for (const kind of NOTIFICATION_KINDS) {
    const value = source[kind];
    if (!Array.isArray(value)) continue;
    routes[kind] = value.filter((item): item is string => typeof item === "string");
  }
  return routes;
};

const sharedChannel = (routes: NotificationRoutes, senders: string[]): string | null => {
  let channel: string | null = null;
  for (const kind of NOTIFICATION_KINDS) {
    const selected = routes[kind] ?? [];
    if (selected.length !== 1 || !senders.includes(selected[0])) return null;
    if (channel === null) channel = selected[0];
    else if (channel !== selected[0]) return null;
  }
  return channel;
};

const NotificationSettings = () => {
  const { t } = useTranslation();
  const { settings, loading, error } = useSettings();
  const [messageDefs, setMessageDefs] = React.useState<any>({});
  const [messageList, setMessageList] = React.useState<string[]>([]);
  const [editingSender, setEditingSender] = React.useState<string>("");
  const [messageValues, setMessageValues] = React.useState<any>({});
  const [routes, setRoutes] = React.useState<NotificationRoutes>(emptyRoutes);
  const [customOpen, setCustomOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [messageError, setMessageError] = React.useState("");

  const serializedRoutes = JSON.stringify(settings.notification_routes ?? null);
  const [syncedRoutes, setSyncedRoutes] = React.useState<string | null>(null);
  if (!loading && syncedRoutes !== serializedRoutes) {
    setSyncedRoutes(serializedRoutes);
    setRoutes(readRoutes(settings.notification_routes));
  }

  React.useEffect(() => {
    if (loading) return;
    let cancelled = false;
    fetch("/api/admin/settings/message-sender")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === "success" && data.data) {
          setMessageDefs(data.data);
          const senders = Object.keys(data.data).filter((sender) => sender !== "empty");
          setMessageList(senders);
          const current = settings.notification_method;
          const initialSender =
            current && senders.includes(current)
              ? current
              : senders[0] || "";
          setEditingSender((selected) => selected || initialSender);
          if (!initialSender) setHydrated(true);
        } else {
          setMessageError(data.message || t("settings.notification.provider_fetch_failed"));
          setHydrated(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMessageError(t("settings.notification.provider_fetch_failed"));
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, settings.notification_method, t]);

  React.useEffect(() => {
    if (!editingSender) return;
    let cancelled = false;
    fetch(`/api/admin/settings/message-sender?provider=${editingSender}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === "success" && data.data) {
          try {
            setMessageValues(JSON.parse(data.data.addition || "{}"));
          } catch {
            setMessageValues({});
          }
        } else {
          setMessageError(data.message || t("settings.notification.provider_settings_fetch_failed"));
        }
      })
      .catch(() => {
        if (!cancelled) setMessageError(t("settings.notification.provider_settings_fetch_failed"));
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [editingSender, t]);

  const handleMessageSave = async (values: any) => {
    setMessageError("");
    const body = {
      name: editingSender,
      addition: JSON.stringify(values),
    };
    try {
      const res = await fetch("/api/admin/settings/message-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status !== "success") {
        throw new Error(data.message || t("common.error"));
      } else {
        setMessageValues(values);
      }
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const routesRef = React.useRef(routes);
  routesRef.current = routes;

  const orderedChannels = (selected: string[]) => {
    const wanted = new Set(selected);
    return messageList.filter((item) => wanted.has(item));
  };

  const saveRoutes = async (next: NotificationRoutes) => {
    const previous = routesRef.current;
    routesRef.current = next;
    setRoutes(next);
    try {
      await updateSettingsWithToast({ notification_routes: next }, t);
    } catch {
      routesRef.current = previous;
      setRoutes(previous);
    }
  };

  const applySharedChannel = async (sender: string) => {
    setCustomOpen(false);
    const next = emptyRoutes();
    for (const kind of NOTIFICATION_KINDS) next[kind] = [sender];
    await saveRoutes(next);
  };

  const toggleRoute = (kind: NotificationKind, sender: string, checked: boolean) => {
    setRoutes((current) => {
      const selected = new Set(current[kind]);
      if (checked) selected.add(sender);
      else selected.delete(sender);
      const next = {
        ...current,
        [kind]: orderedChannels([...selected]),
      };
      routesRef.current = next;
      return next;
    });
  };

  const savedShared = messageList.length > 0
    ? sharedChannel(readRoutes(settings.notification_routes), messageList)
    : null;
  const showCustom = messageList.length > 0 && (customOpen || savedShared === null);

  const digestSeconds = (() => {
    const raw = Number(settings.notification_digest_seconds);
    if (!Number.isInteger(raw) || raw < DIGEST_SECONDS_MIN || raw > DIGEST_SECONDS_MAX) {
      return 5;
    }
    return raw;
  })();
  const digestEnabled = settings.notification_digest_enabled === true;
  const [digestOn, setDigestOn] = React.useState(digestEnabled);
  const [digestValue, setDigestValue] = React.useState(String(digestSeconds));
  const [digestSaving, setDigestSaving] = React.useState(false);
  React.useEffect(() => {
    setDigestOn(digestEnabled);
  }, [digestEnabled]);
  React.useEffect(() => {
    setDigestValue(String(digestSeconds));
  }, [digestSeconds]);

  const toggleDigest = async (checked: boolean) => {
    const previous = digestOn;
    setDigestOn(checked);
    try {
      await updateSettingsWithToast({ notification_digest_enabled: checked }, t);
    } catch {
      setDigestOn(previous);
    }
  };

  const saveDigestSeconds = async () => {
    const seconds = Number(digestValue);
    if (!Number.isInteger(seconds) || seconds < DIGEST_SECONDS_MIN || seconds > DIGEST_SECONDS_MAX) {
      toast.error(t("settings.notification.digest_seconds_invalid"));
      return;
    }
    setDigestSaving(true);
    try {
      await updateSettingsWithToast({ notification_digest_seconds: seconds }, t);
    } finally {
      setDigestSaving(false);
    }
  };

  if (loading) {
    return <SettingsPageSkeleton />;
  }
  if (error) {
    return <Text color="red">{error}</Text>;
  }
  if (messageError) {
    return <Text color="red">{messageError}</Text>;
  }

  return (
    <>
      {hydrated ? null : (
        <div data-admin-route-pending="true" hidden />
      )}
      <AdminPageTitle
        description={t(
          "settings.notification.page_description",
          "配置每种告警的发送渠道、连接参数与消息模板。",
        )}
      >
        {t("settings.notification.title")}
      </AdminPageTitle>
      <SettingCardSwitch
        title={t("settings.notification.enable")}
        description={t("settings.notification.enable_description")}
        defaultChecked={settings.notification_enabled}
        onChange={async (checked) => {
          await updateSettingsWithToast({ notification_enabled: checked }, t);
        }}
      />
      <SettingCardLongTextInput
        title={t("settings.notification.template")}
        description={t("settings.notification.template_description")}
        defaultValue={settings.notification_template}
        OnSave={
          async (value) => {
            await updateSettingsWithToast({ notification_template: value }, t);
          }}
      />
      <SettingCard
        title={t("settings.notification.routes_title")}
        description={t("settings.notification.routes_description")}
        direction="column"
      >
        {messageList.length > 0 ? (
        <SettingCard.Action>
          <Select
            size="small"
            value={showCustom ? ROUTE_CUSTOM : (savedShared ?? "")}
            MenuProps={adminMenuProps}
            inputProps={{ "aria-label": t("settings.notification.routes_title") }}
            onChange={(event) => {
              const next = String(event.target.value);
              if (next === ROUTE_CUSTOM) {
                setCustomOpen(true);
                return;
              }
              void applySharedChannel(next);
            }}
            sx={{ minWidth: 160, fontSize: 14 }}
          >
            {messageList.map((sender) => (
              <MenuItem key={sender} value={sender}>
                {sender}
              </MenuItem>
            ))}
            <MenuItem value={ROUTE_CUSTOM} sx={{ borderTop: 1, borderColor: "divider" }}>
              {t("settings.notification.route_custom")}
            </MenuItem>
          </Select>
        </SettingCard.Action>
        ) : null}
        {showCustom ? (
          <Box sx={{ width: "100%", alignSelf: "stretch", mt: 2 }}>
            <Box
              sx={{
                width: "100%",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {NOTIFICATION_KINDS.map((kind, index) => {
                const kindLabel = t(`settings.notification.kinds.${kind}`);
                const selected = routes[kind] ?? [];
                return (
                  <Box
                    key={kind}
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      alignItems: { xs: "stretch", md: "center" },
                      gap: { xs: 0.25, md: 2 },
                      px: { xs: 1.5, md: 2 },
                      py: { xs: 1.25, md: 0.75 },
                      borderTop: index === 0 ? 0 : "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      sx={{
                        flex: { md: "0 0 7.5rem" },
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      {kindLabel}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "repeat(2, minmax(0, 1fr))",
                          sm: "repeat(auto-fill, minmax(9.5rem, 1fr))",
                        },
                        columnGap: 0.5,
                        rowGap: 0.25,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {messageList.map((sender) => {
                        const checked = selected.includes(sender);
                        return (
                          <FormControlLabel
                            key={sender}
                            label={sender}
                            sx={{
                              m: 0,
                              minWidth: 0,
                              minHeight: 36,
                              alignItems: "center",
                              "& .MuiFormControlLabel-label": {
                                fontSize: 13,
                                lineHeight: 1.3,
                                overflowWrap: "anywhere",
                                color: checked ? "text.primary" : "text.secondary",
                                fontWeight: checked ? 600 : 400,
                              },
                            }}
                            control={
                              <Checkbox
                                size="small"
                                checked={checked}
                                onChange={(_, next) => toggleRoute(kind, sender, next)}
                                slotProps={{ input: { "aria-label": `${kindLabel} ${sender}` } }}
                                sx={{ p: 0.75, flexShrink: 0 }}
                              />
                            }
                          />
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", mt: 1.5 }}>
              <Button
                variant="contained"
                onClick={() => void saveRoutes(routes)}
                sx={{
                  minHeight: 36,
                  height: 36,
                  px: 1.75,
                  py: 0,
                  fontSize: 15,
                  lineHeight: 1.35,
                  boxShadow: "none",
                  width: { xs: "100%", sm: "auto" },
                  "&:hover": { boxShadow: "none" },
                }}
              >
                {t("save")}
              </Button>
            </Box>
          </Box>
        ) : null}
      </SettingCard>
      <SettingCard
        title={t("settings.notification.digest_title")}
        description={t("settings.notification.digest_description")}
      >
        <SettingCard.Action>
          <Switch
            checked={digestOn}
            color="primary"
            onChange={(_, checked) => { void toggleDigest(checked); }}
          />
        </SettingCard.Action>
        <Box
          sx={{
            width: "100%",
            mt: 1.5,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography
            component="label"
            variant="body2"
            sx={{ flexShrink: 0, fontWeight: 400, lineHeight: 1.6, color: "text.secondary" }}
          >
            {t("settings.notification.digest_seconds")}
          </Typography>
          <TextField
            value={digestValue}
            disabled={digestSaving}
            size="small"
            onChange={(event) => setDigestValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveDigestSeconds();
              }
            }}
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                "aria-label": t("settings.notification.digest_seconds"),
              },
            }}
            sx={{
              width: 88,
              "& .MuiOutlinedInput-input": {
                padding: "8px 10px",
                fontSize: 14,
              },
            }}
          />
          <Typography
            component="span"
            variant="body2"
            sx={{ fontWeight: 400, lineHeight: 1.6, color: "text.secondary" }}
          >
            {t("time.second")}
          </Typography>
          <Button
            variant="contained"
            disabled={digestSaving}
            onClick={() => void saveDigestSeconds()}
            sx={{
              ml: "auto",
              minHeight: 36,
              height: 36,
              px: 1.75,
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
          >
            {t("save")}
          </Button>
        </Box>
      </SettingCard>
      <SettingCardSelect
        title={t("settings.notification.channel_editor")}
        description={t("settings.notification.channel_editor_description")}
        options={messageList.map((sender) => ({ value: sender, label: sender }))}
        value={editingSender}
        OnSave={async (val: string) => {
          if (val === editingSender) return;
          setEditingSender(val);
        }}
      />
      {renderProviderInputs({
        currentProvider: editingSender,
        providerDefs: messageDefs,
        providerValues: messageValues,
        translationPrefix: `settings.notification.${editingSender}`,
        title: t("settings.notification.provider_fields"),
        description: t("settings.notification.provider_fields_description"),
        setProviderValues: setMessageValues,
        handleSave: handleMessageSave,
        t,
      })}
      <SettingCardButton
        title={t("settings.notification.test_title")}
        description={t("settings.notification.test_description")}
        onClick={async () => {
          try {
            const res = await fetch("/api/admin/test/sendMessage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: editingSender }),
            });
            let data;
            try {
              data = await res.json();
            } catch {
              toast.error(t("common.error"));
              return;
            }
            if (data && data.message && data.code !== 200 && data.status !== "success") {
              toast.error(data.message);
              return;
            }
            toast.success(t("common.success"));
          } catch (error) {
            toast.error(
              t("common.error") +
              ": " +
              (error instanceof Error ? error.message : String(error))
            );
          }
        }}
      >
        {t("settings.notification.test_title")}
      </SettingCardButton>
      <label className="text-muted-foreground text-sm flex flex-row items-center gap-1">
        {t("settings.notification.moved")}
        <Link
          to="/admin/notification/general"
        >
          <SquareArrowOutUpRight size={16} />
        </Link>
      </label>
    </>
  );
};

export default NotificationSettings;
