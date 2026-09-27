import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import Loading from "@/components/loading";
import {
  SettingCard,
  SettingCardLabel,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { toast } from "sonner";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
const GeneralNotification = () => {
  return (
    <Stack spacing={2.5} className="p-0 md:p-4">
      <Inner />
    </Stack>
  );
};

const Inner = () => {
  const { t } = useTranslation();
  const { settings, loading, error } = useSettings();

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  return (
    <>
      <AdminPageTitle
        description={t(
          "admin.notification.page_description",
          "管理到期、登录和流量用量等通用通知规则。",
        )}
      >
        {t("settings.general.title")}
      </AdminPageTitle>
      <SettingCardLabel>
        {t("admin.notification.expire_title")}
      </SettingCardLabel>
      <SettingCardSwitch
        defaultChecked={settings.expire_notification_enabled}
        title={t("admin.notification.expire_enable")}
        description={t("admin.notification.expire_enable_description")}
        onChange={async (checked) => {
          await updateSettingsWithToast(
            { expire_notification_enabled: checked },
            t
          );
        }}
      />
      <SettingCardShortTextInput
        type="number"
        title={t("admin.notification.expire_time")}
        description={t("admin.notification.expire_time_description")}
        defaultValue={settings.expire_notification_lead_days}
        OnSave={async (value) => {
          const numValue = Number(value);
          if (isNaN(numValue) || numValue < 0) {
            toast.error("Please enter a valid non-negative number");
            return;
          }
          await updateSettingsWithToast(
            { expire_notification_lead_days: numValue },
            t
          );
        }}
      />
      <SettingCardLabel>{t("admin.notification.login")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("admin.notification.login")}
        description={t("admin.notification.login_description")}
        defaultChecked={settings.login_notification}
        onChange={async (checked) => {
          await updateSettingsWithToast(
            { login_notification: checked },
            t
          );
        }}
      />
      <SettingCardLabel>{t("admin.notification.traffic")}</SettingCardLabel>
      <TrafficUsageFields
        percentage={settings.traffic_limit_percentage}
        step={settings.traffic_reminder_step ?? 5}
      />
    </>
  );
};

function TrafficUsageFields({
  percentage,
  step,
}: {
  percentage: number | string | undefined;
  step: number | string;
}) {
  const { t } = useTranslation();
  const [startValue, setStartValue] = useState(String(percentage ?? ""));
  const [stepValue, setStepValue] = useState(String(step ?? 5));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartValue(String(percentage ?? ""));
    setStepValue(String(step ?? 5));
  }, [percentage, step]);

  const save = async () => {
    const startNumber = Number(startValue);
    const stepNumber = Number(stepValue);
    if (startValue.trim() === "" || !Number.isFinite(startNumber) || startNumber < 0) {
      toast.error(t("admin.notification.traffic_start_invalid"));
      return;
    }
    if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > 100) {
      toast.error(t("admin.notification.traffic_step_invalid"));
      return;
    }
    setSaving(true);
    try {
      await updateSettingsWithToast(
        {
          traffic_limit_percentage: startNumber,
          traffic_reminder_step: stepNumber,
        },
        t,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingCard
      title={t("admin.notification.traffic")}
      description={t("admin.notification.traffic_description")}
    >
      <Box
        sx={{
          width: "100%",
          mt: 1.5,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
        }}
      >
        <TrafficPlainField
          label={t("admin.notification.traffic_start")}
          value={startValue}
          disabled={saving}
          inputMode="decimal"
          onChange={setStartValue}
        />
        <TrafficPlainField
          label={t("admin.notification.traffic_step")}
          value={stepValue}
          disabled={saving}
          inputMode="numeric"
          onChange={setStepValue}
        />
        <Button
          variant="contained"
          disabled={saving}
          onClick={() => void save()}
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
  );
}

function TrafficPlainField({
  label,
  value,
  disabled,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  inputMode: "decimal" | "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
      <Typography
        component="label"
        variant="body2"
        sx={{
          flexShrink: 0,
          fontWeight: 400,
          lineHeight: 1.6,
          letterSpacing: 0,
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <TextField
        value={value}
        disabled={disabled}
        size="small"
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ htmlInput: { inputMode, "aria-label": label } }}
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
        sx={{ fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, color: "text.secondary" }}
      >
        %
      </Typography>
    </Stack>
  );
}

export default GeneralNotification;
