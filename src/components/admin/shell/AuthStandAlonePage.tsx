import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { ReactNode } from "react";

import LiteBrand from "@/components/LiteBrand";
import { LITE_NAME } from "@/theme/brand";
import { getAppAssetUrl } from "@/utils/assetUrl";
import { LanguageMenu, ThemeMenu } from "./ChromeActions";

export const authPrimaryButtonSx = {
  mt: 0.25,
  minHeight: 56,
  borderRadius: "8px",
  bgcolor: "#1C252E",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  touchAction: "manipulation",
  "&:hover": { bgcolor: "#141B22" },
  "&.Mui-disabled": {
    bgcolor: "#1C252E",
    color: "#fff",
    opacity: 0.48,
  },
} as const;

function AuthToolbar() {
  const compact = useMediaQuery("(max-width:599.95px)");

  return (
    <Stack
      data-testid="admin-login-toolbar"
      direction="row"
      sx={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        minHeight: { xs: 56, sm: 72 },
        alignItems: "center",
        justifyContent: "space-between",
        pl: {
          xs: "max(12px, var(--safe-area-left))",
          sm: "max(24px, var(--safe-area-left))",
        },
        pr: {
          xs: "max(8px, var(--safe-area-right))",
          sm: "max(24px, var(--safe-area-right))",
        },
        pt: "var(--safe-area-top)",
      }}
    >
      <Link
        href="/"
        underline="none"
        color="inherit"
        aria-label={LITE_NAME}
        sx={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            component="img"
            src={getAppAssetUrl("assets/logo.png?v=lite-icon-0e86dd")}
            alt=""
            sx={{ width: compact ? 32 : 38, height: compact ? 32 : 38, objectFit: "contain" }}
          />
          <LiteBrand size={compact ? "sm" : "md"} />
        </Stack>
      </Link>
      <Stack direction="row" spacing={0} sx={{ alignItems: "center" }}>
        <ThemeMenu />
        <LanguageMenu />
      </Stack>
    </Stack>
  );
}

export default function AuthStandAlonePage({
  title,
  description,
  children,
  testId = "admin-login-page",
  cardTestId = "admin-login-card",
  overlay = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  testId?: string;
  cardTestId?: string;
  overlay?: boolean;
}) {
  return (
    <Box
      data-testid={testId}
      sx={(theme) => ({
        minHeight: "var(--app-viewport-height, 100dvh)",
        height: overlay ? "var(--app-viewport-height, 100dvh)" : undefined,
        width: overlay ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
        position: overlay ? "fixed" : "relative",
        inset: overlay ? 0 : undefined,
        zIndex: overlay ? theme.zIndex.modal : undefined,
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        bgcolor: "background.paper",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            theme.palette.mode === "dark"
              ? "radial-gradient(ellipse 80% 55% at 12% 8%, rgba(7, 141, 238, 0.22), transparent 58%), radial-gradient(ellipse 70% 50% at 92% 6%, rgba(255, 171, 0, 0.1), transparent 52%), radial-gradient(ellipse 60% 45% at 78% 92%, rgba(0, 184, 217, 0.12), transparent 55%)"
              : "radial-gradient(ellipse 80% 55% at 12% 8%, rgba(7, 141, 238, 0.18), transparent 58%), radial-gradient(ellipse 70% 50% at 92% 6%, rgba(255, 171, 0, 0.16), transparent 52%), radial-gradient(ellipse 60% 45% at 78% 92%, rgba(0, 184, 217, 0.14), transparent 55%)",
        },
      })}
    >
      <AuthToolbar />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 1.5, sm: 3 },
          pt: { xs: 3, sm: 4 },
          pb: {
            xs: "max(40px, var(--safe-area-bottom))",
            sm: 6,
          },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Card
          data-testid={cardTestId}
          sx={{
            width: "100%",
            maxWidth: 484,
            borderRadius: "8px",
            border: 0,
            boxShadow:
              "0 2px 4px rgba(28, 37, 46, 0.04), 0 20px 48px rgba(28, 37, 46, 0.10)",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 5.5 }, "&:last-child": { pb: { xs: 2.5, sm: 5.5 } } }}>
            <Box sx={{ mb: { xs: 3, sm: 5 }, textAlign: "center" }}>
              <Box
                component="img"
                src={getAppAssetUrl("assets/logo.png?v=lite-icon-0e86dd")}
                alt=""
                sx={{
                  display: "block",
                  width: { xs: 52, sm: 60 },
                  height: { xs: 52, sm: 60 },
                  mx: "auto",
                  mb: { xs: 2, sm: 2.5 },
                  objectFit: "contain",
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: 20, sm: 23 },
                  lineHeight: { xs: "28px", sm: "32px" },
                  fontWeight: 700,
                  overflowWrap: "anywhere",
                }}
              >
                {title}
              </Typography>
              {description ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, overflowWrap: "anywhere" }}
                >
                  {description}
                </Typography>
              ) : null}
            </Box>
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
