import ArrowForward from "@mui/icons-material/ArrowForward";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export function settingsSoftBg(theme: Theme) {
  return theme.palette.mode === "dark" ? "rgba(7,141,238,.14)" : "rgba(7,141,238,.09)";
}

export function settingsNeutralBg(theme: Theme) {
  return theme.palette.mode === "dark" ? "#293542" : "#F4F6F8";
}

/** Default letter avatar: same as the admin top-right account chip. */
export const adminLetterAvatarSx = {
  bgcolor: "text.primary",
  color: "background.paper",
  fontWeight: 700,
} as const;

export function SettingsIconTile({
  children,
  accent = false,
  large = false,
}: {
  children: ReactNode;
  accent?: boolean;
  large?: boolean;
}) {
  const size = large ? 48 : 38;
  const icon = large ? 24 : 21;
  return (
    <Box
      sx={(theme) => ({
        width: size,
        height: size,
        borderRadius: large ? "10px" : "8px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: accent ? settingsSoftBg(theme) : settingsNeutralBg(theme),
        color: accent ? "primary.main" : "text.secondary",
        "& svg": { fontSize: icon, width: icon, height: icon },
      })}
    >
      {children}
    </Box>
  );
}

export function SettingsTextButton({
  children,
  onClick,
  danger = false,
  icon,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      color={danger ? "error" : "primary"}
      disabled={disabled}
      startIcon={icon}
      onClick={onClick}
      sx={{
        fontSize: 12,
        minHeight: { xs: 44, sm: 34 },
        px: 0.5,
        fontWeight: 600,
        flexShrink: 0,
        whiteSpace: "nowrap",
        transition: (theme) =>
          theme.transitions.create(["color", "background-color", "transform"], {
            duration: 160,
          }),
      }}
    >
      {children}
    </Button>
  );
}

export function SettingsArrowButton({
  children,
  onClick,
  compact = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <Button
      color="primary"
      startIcon={<ArrowForward sx={{ fontSize: compact ? 15 : 18 }} />}
      onClick={onClick}
      sx={{
        fontSize: compact ? { xs: 10, md: 12 } : 14,
        minHeight: compact ? undefined : { xs: 44, sm: 40 },
        minWidth: compact ? 0 : undefined,
        p: compact ? 0 : 0.5,
        px: compact ? 0 : 0.5,
        fontWeight: 600,
        flexShrink: 0,
        whiteSpace: "nowrap",
        transition: (theme) =>
          theme.transitions.create(["color", "background-color", "transform"], {
            duration: 160,
          }),
      }}
    >
      {children}
    </Button>
  );
}

export function SettingsDetailRow({
  icon,
  title,
  description,
  action,
  border = true,
  large = false,
  selected = false,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  border?: boolean;
  large?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  return (
    <Box
      component={interactive ? "button" : "div"}
      type={interactive ? "button" : undefined}
      onClick={onClick}
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: large ? 1.75 : 1.6,
        width: "100%",
        py: large ? 2.5 : 1.6,
        minHeight: large ? 96 : 76,
        boxSizing: "border-box",
        m: 0,
        px: interactive ? 2 : 0,
        appearance: "none",
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        cursor: interactive ? "pointer" : "default",
        bgcolor: selected ? settingsSoftBg(theme) : "transparent",
        border: "none",
        borderBottom: border ? "1px solid" : "none",
        borderColor: "divider",
        borderRadius: 0,
        "&:hover": interactive
          ? { bgcolor: selected ? settingsSoftBg(theme) : theme.palette.action.hover }
          : undefined,
      })}
    >
      <SettingsIconTile large={large}>{icon}</SettingsIconTile>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: large ? 18 : 13, fontWeight: large ? 700 : 600 }}>{title}</Typography>
        {description ? (
          <Typography
            sx={{
              fontSize: large ? 15 : 11,
              mt: large ? 0.75 : 0.35,
              color: "text.secondary",
              lineHeight: large ? 1.7 : 1.8,
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}

export function SettingsFacts({ rows }: { rows: Array<[ReactNode, ReactNode]> }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, boxShadow: "none" }}>
      {rows.map(([label, value], index) => (
        <Box
          key={index}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            minHeight: 46,
            py: 1,
            borderTop: index ? "1px solid" : "none",
            borderColor: "divider",
          }}
        >
          <Typography sx={{ fontSize: 12, color: "text.secondary", flexShrink: 0 }}>{label}</Typography>
          <Typography sx={{ fontSize: 12, textAlign: "right", minWidth: 0 }}>{value}</Typography>
        </Box>
      ))}
    </Paper>
  );
}

export function SettingsHero({
  icon,
  title,
  description,
  success = false,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  success?: boolean;
}) {
  return (
    <Stack sx={{ py: 1, mb: 1, textAlign: "center", alignItems: "center" }}>
      <Box
        sx={(theme) => ({
          width: 58,
          height: 58,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          mb: 2,
          bgcolor: success
            ? theme.palette.mode === "dark"
              ? "#214234"
              : "#E8F7EE"
            : settingsSoftBg(theme),
          color: success ? "success.main" : "primary.main",
          "& svg": { fontSize: 30, width: 30, height: 30 },
        })}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{title}</Typography>
      {description ? (
        <Typography sx={{ fontSize: 12, lineHeight: 1.8, color: "text.secondary" }}>
          {description}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function SettingsSwitchRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
  border = true,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  border?: boolean;
}) {
  return (
    <SettingsDetailRow
      icon={icon}
      title={title}
      description={description}
      border={border}
      action={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(_, next) => onChange(next)}
        />
      }
    />
  );
}

export function SettingsAlert({
  children,
  severity = "info",
  title,
}: {
  children: ReactNode;
  severity?: "info" | "warning" | "error" | "success";
  title?: ReactNode;
}) {
  return (
    <Alert
      className="km-settings-alert"
      severity={severity}
      variant="standard"
      sx={{
        width: "100%",
        fontSize: 13,
        lineHeight: 1.5,
        alignItems: "center",
        "& .MuiAlert-icon": {
          py: 0,
          paddingBlock: 0,
          alignSelf: "center",
          "& svg": { fontSize: 20, display: "block" },
        },
        "& .MuiAlert-message": {
          minWidth: 0,
          py: 0.75,
          lineHeight: 1.5,
        },
      }}
    >
      {title ? <AlertTitle sx={{ fontSize: 13, mb: 0.4 }}>{title}</AlertTitle> : null}
      {children}
    </Alert>
  );
}

export function SettingsDashedZone({
  icon,
  title,
  description,
  action,
  onDropFiles,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  onDropFiles?: (files: FileList) => void;
}) {
  return (
    <Box
      onDragOver={(event) => {
        if (!onDropFiles) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!onDropFiles) return;
        event.preventDefault();
        if (event.dataTransfer.files.length) onDropFiles(event.dataTransfer.files);
      }}
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed",
        borderColor: "text.disabled",
        borderRadius: 2,
        px: { xs: 3, md: 3.5 },
        pt: { xs: 2.25, md: 2.5 },
        pb: { xs: 3.25, md: 3.75 },
        textAlign: "center",
        bgcolor: settingsNeutralBg(theme),
      })}
    >
      <Box sx={{ color: "primary.main", mb: 1, lineHeight: 0, "& svg": { fontSize: 34, width: 34, height: 34, display: "block" } }}>
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1 }}>{title}</Typography>
      {description ? (
        <Typography sx={{ fontSize: 12, lineHeight: 1.8, color: "text.secondary" }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  );
}

export const settingsFieldSx = {
  mb: 0,
  "& .MuiInputBase-input": { fontSize: 14 },
  "& textarea": { fontSize: 14, lineHeight: 1.8 },
  "& .MuiFormHelperText-root": { fontSize: 11, mx: 0, lineHeight: 1.6 },
};
