import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import {
  SettingsArrowButton,
  SettingsIconTile,
  settingsSoftBg,
} from "./SettingsChrome";

export default function SettingsFeatureCard({
  icon,
  title,
  description,
  meta,
  actionLabel,
  onAction,
  chip,
  chipTone = "primary",
  accent = false,
  layout = "account",
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  meta?: ReactNode;
  actionLabel: ReactNode;
  onAction: () => void;
  chip?: ReactNode;
  chipTone?: "primary" | "success";
  accent?: boolean;
  layout?: "account" | "site";
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
        transition: (theme) =>
          theme.transitions.create(["border-color", "box-shadow"], { duration: 180 }),
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.25 }}>
        {layout === "site" ? (
          <Box
            sx={{
              color: "primary.main",
              display: "flex",
              flexShrink: 0,
              lineHeight: 0,
              "& svg": { fontSize: 24, width: 24, height: 24, display: "block" },
            }}
          >
            {icon}
          </Box>
        ) : (
          <SettingsIconTile large accent={accent}>
            {icon}
          </SettingsIconTile>
        )}
        <Typography sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.35, flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        {chip ? (
          <Chip
            size="small"
            label={chip}
            sx={{
              fontSize: 12,
              height: 26,
              fontWeight: 600,
              flexShrink: 0,
              color: chipTone === "success" ? "success.main" : "primary.main",
              bgcolor: (theme: { palette: { mode: string } }) =>
                chipTone === "success"
                  ? theme.palette.mode === "dark"
                    ? "#214234"
                    : "#E8F7EE"
                  : settingsSoftBg(theme as never),
            }}
          />
        ) : null}
      </Stack>
      <Typography sx={{ fontSize: 15, color: "text.secondary", lineHeight: 1.7 }}>
        {description}
      </Typography>
      <Box sx={{ minHeight: 40 }} />
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          pt: 1.5,
          minHeight: 40,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography sx={{ fontSize: 14, color: "text.secondary", minWidth: 0 }}>{meta}</Typography>
        <SettingsArrowButton onClick={onAction}>{actionLabel}</SettingsArrowButton>
      </Stack>
    </Paper>
  );
}
