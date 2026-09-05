import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { Theme } from "@mui/material/styles";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AccountProvider,
  useAccount,
  useOptionalAccount,
} from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { localizeLoginError, submitPasswordLogin } from "@/utils/adminAuth";
import { sameOriginApiPath } from "@/utils/security";
import AuthStandAlonePage, { authPrimaryButtonSx } from "./AuthStandAlonePage";

const loginFieldSx = (theme: Theme) => {
  const fill = theme.palette.background.paper;
  const text = theme.palette.text.primary;
  return {
    "& .MuiOutlinedInput-root": {
      minHeight: 60,
      bgcolor: fill,
      "& input": {
        px: 2,
        py: 1.75,
      },
      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active":
        {
          WebkitTextFillColor: text,
          caretColor: text,
          borderRadius: "inherit",
          WebkitBoxShadow: `0 0 0 100px ${fill} inset`,
          transition: "background-color 99999s ease-out 0s",
        },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 600,
    },
  };
};

function AdminLoginForm() {
  const { account, loading, error, refresh } = useAccount();
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const compact = useMediaQuery("(max-width:599.95px)");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFac, setTwoFac] = useState("");
  const [needTwoFactor, setNeedTwoFactor] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const twoFactorFieldRef = useRef<HTMLInputElement>(null);

  const passwordLoginEnabled = !publicInfo?.disable_password_login;
  const oauthEnabled = Boolean(publicInfo?.oauth_enable);
  const isFormValid =
    passwordLoginEnabled && username.trim() !== "" && password.trim() !== "";

  useEffect(() => {
    if (!needTwoFactor) return;
    twoFactorFieldRef.current?.focus();
  }, [needTwoFactor]);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (needTwoFactor) {
      setNeedTwoFactor(false);
      setTwoFac("");
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (needTwoFactor) {
      setNeedTwoFactor(false);
      setTwoFac("");
    }
  };

  const handleLogin = async () => {
    if (!isFormValid) {
      setErrorMsg(t("login.required"));
      return;
    }
    if (needTwoFactor && twoFac.trim() === "") {
      setErrorMsg(t("login.two_factor_prompt"));
      return;
    }
    setErrorMsg("");
    setIsLoading(true);
    try {
      const result = await submitPasswordLogin({
        username,
        password,
        twoFactorCode: twoFac,
        refreshAccount: refresh,
      });
      if (result.ok) {
        setPassword("");
        setTwoFac("");
        setNeedTwoFactor(false);
        return;
      }
      if (result.requiresTwoFactor) {
        setNeedTwoFactor(true);
        setTwoFac("");
        return;
      }
      setErrorMsg(localizeLoginError(result.message, t));
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
                onChange={(event) => handleUsernameChange(event.target.value)}
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
                onChange={(event) => handlePasswordChange(event.target.value)}
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
              {needTwoFactor ? (
                <TextField
                  id="admin-login-2fa"
                  inputRef={twoFactorFieldRef}
                  fullWidth
                  label={t("login.two_factor")}
                  value={twoFac}
                  onChange={(event) =>
                    setTwoFac(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
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
                sx={authPrimaryButtonSx}
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
    <AuthStandAlonePage title={t("login.heading")} description={t("login.desc")}>
      {body}
    </AuthStandAlonePage>
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
