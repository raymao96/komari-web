import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AccountProvider,
  useAccount,
  useOptionalAccount,
} from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { submitPasswordLogin } from "@/utils/adminAuth";
import { getAppAssetUrl } from "@/utils/assetUrl";
import { sameOriginApiPath } from "@/utils/security";
import { LITE_NAME } from "@/theme/brand";
import LiteBrand from "@/components/LiteBrand";
import { LanguageMenu, ThemeMenu } from "./ChromeActions";

const loginFieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 60,
    bgcolor: "transparent",
    "& input": {
      px: 2,
      py: 1.75,
    },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 600,
  },
} as const;

function LoginToolbar() {
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

function AdminLoginForm() {
  const { account, loading, error, refresh } = useAccount();
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const compact = useMediaQuery("(max-width:599.95px)");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFac, setTwoFac] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordLoginEnabled = !publicInfo?.disable_password_login;
  const oauthEnabled = Boolean(publicInfo?.oauth_enable);
  const isFormValid =
    passwordLoginEnabled && username.trim() !== "" && password.trim() !== "";

  const handleLogin = async () => {
    if (!isFormValid) {
      setErrorMsg(t("login.required"));
      return;
    }
    setErrorMsg("");
    setIsLoading(true);
    try {
      const result = await submitPasswordLogin({
        username,
        password,
        twoFactorCode: twoFac,
        twoFactorEnabled: account?.["2fa_enabled"],
        refreshAccount: refresh,
      });
      if (result.ok) {
        setPassword("");
        setTwoFac("");
        return;
      }
      if (result.requiresTwoFactor) setRequire2FA(true);
      setErrorMsg(result.message);
    } catch {
      setErrorMsg(t("login.network_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const oauthProvider =
    publicInfo?.oauth_provider === "generic"
      ? "OAuth"
      : publicInfo?.oauth_provider
        ? publicInfo.oauth_provider.charAt(0).toUpperCase() +
          publicInfo.oauth_provider.slice(1)
        : "OAuth";

  let body;
  if (loading) {
    body = (
      <Stack spacing={1.5} sx={{ py: 8, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          {t("loading")}
        </Typography>
      </Stack>
    );
  } else if (error || !account) {
    body = (
      <Stack spacing={2}>
        <Alert severity="error">{t("login.account_status_failed")}</Alert>
        <Button variant="outlined" onClick={() => void refresh()}>
          {t("common.retry")}
        </Button>
      </Stack>
    );
  } else {
    body = (
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isLoading) void handleLogin();
        }}
      >
        <Stack spacing={3}>
          {passwordLoginEnabled ? (
            <>
              <TextField
                id="admin-login-username"
                fullWidth
                label={t("login.username")}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("login.username_placeholder")}
                disabled={isLoading}
                autoComplete="username"
                autoFocus={!compact}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={loginFieldSx}
              />
              <TextField
                id="admin-login-password"
                fullWidth
                label={t("login.password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("login.password_placeholder")}
                disabled={isLoading}
                autoComplete="current-password"
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={t("login.password")}
                          onClick={() => setShowPassword((current) => !current)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={loginFieldSx}
              />
              {require2FA ? (
                <TextField
                  id="admin-login-2fa"
                  fullWidth
                  label={t("login.two_factor")}
                  value={twoFac}
                  onChange={(event) => setTwoFac(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  disabled={isLoading}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={loginFieldSx}
                />
              ) : null}
              {errorMsg ? (
                <Typography variant="body2" color="error">
                  {errorMsg}
                </Typography>
              ) : null}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading}
                sx={{
                  mt: 0.25,
                  minHeight: 56,
                  bgcolor: "#1C252E",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#141B22" },
                  "&.Mui-disabled": {
                    bgcolor: "#1C252E",
                    color: "#fff",
                    opacity: 0.48,
                  },
                }}
              >
                {isLoading ? t("login.logging_in") : t("login.title")}
              </Button>
            </>
          ) : null}
          {oauthEnabled ? (
            <Stack spacing={2}>
              {passwordLoginEnabled ? (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Box sx={{ flex: 1, borderTop: "1px solid", borderColor: "divider" }} />
                  <Typography variant="caption" color="text.secondary">
                    {t("login.or_continue", "或使用以下方式继续")}
                  </Typography>
                  <Box sx={{ flex: 1, borderTop: "1px solid", borderColor: "divider" }} />
                </Stack>
              ) : null}
              <Button
                type="button"
                variant="outlined"
                size="large"
                fullWidth
                disabled={isLoading}
                onClick={() => {
                  window.location.assign(sameOriginApiPath("/api/oauth"));
                }}
                sx={{ minHeight: 52, color: "text.primary", borderColor: "divider" }}
              >
                {t("login.login_with", { provider: oauthProvider })}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      data-testid="admin-login-page"
      sx={(theme) => ({
        minHeight: "var(--app-viewport-height, 100dvh)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
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
      <LoginToolbar />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "center",
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 4 },
          pb: {
            xs: "max(24px, var(--safe-area-bottom))",
            sm: 6,
          },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Card
          data-testid="admin-login-card"
          sx={{
            width: "100%",
            maxWidth: 484,
            borderRadius: "8px",
            border: 0,
            boxShadow:
              "0 2px 4px rgba(28, 37, 46, 0.04), 0 20px 48px rgba(28, 37, 46, 0.10)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5.5 }, "&:last-child": { pb: { xs: 3, sm: 5.5 } } }}>
            <Box sx={{ mb: { xs: 4, sm: 5 }, textAlign: "center" }}>
              <Box
                component="img"
                src={getAppAssetUrl("assets/logo.png?v=lite-icon-0e86dd")}
                alt=""
                sx={{
                  display: "block",
                  width: 60,
                  height: 60,
                  mx: "auto",
                  mb: 2.5,
                  objectFit: "contain",
                }}
              />
              <Typography variant="h4" sx={{ fontSize: 23, lineHeight: "32px", fontWeight: 700 }}>
                {t("login.heading")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t("login.desc")}
              </Typography>
            </Box>
            {body}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default function AdminLoginPage() {
  const inheritedAccount = useOptionalAccount();
  if (inheritedAccount) return <AdminLoginForm />;
  return (
    <AccountProvider>
      <AdminLoginForm />
    </AccountProvider>
  );
}
