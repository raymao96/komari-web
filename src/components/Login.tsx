import * as React from "react";
import {
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { CircleAlert, LoaderCircle, LogIn } from "lucide-react";
import { TablerSettings } from "./Icones/Tabler";
import LanguageSwitch from "./Language";
import LoginIdentityHeader from "./LoginIdentityHeader";
import ThemeSwitch from "./ThemeSwitch";
import {
  AccountProvider,
  useAccount,
  useOptionalAccount,
} from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { submitPasswordLogin } from "@/utils/adminAuth";

type LoginDialogProps = {
  trigger?: React.ReactNode | string;
  autoOpen?: boolean;
  showSettings?: boolean;
  info?: string | React.ReactNode;
  onLoginSuccess?: () => void | Promise<void>;
  redirectAfterLogin?: boolean;
  standalone?: boolean;
};

const LoginDialogContent = ({
  trigger,
  autoOpen = false,
  showSettings = true,
  info,
  onLoginSuccess,
  redirectAfterLogin = true,
  standalone = false,
}: LoginDialogProps) => {
  const { account, loading, error, refresh } = useAccount();
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [twoFac, setTwoFac] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [require2FA, setRequire2FA] = React.useState(false);
  const [open, setOpen] = React.useState(autoOpen);

  const passwordLoginEnabled = !publicInfo?.disable_password_login;
  const oauthEnabled = Boolean(publicInfo?.oauth_enable);
  const onlyOAuthLogin = oauthEnabled && !passwordLoginEnabled;
  const isFormValid =
    passwordLoginEnabled && username.trim() !== "" && password.trim() !== "";

  React.useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

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
        await onLoginSuccess?.();
        if (!onLoginSuccess && redirectAfterLogin) {
          window.location.assign("/admin");
        }
        return;
      }
      if (result.requiresTwoFactor) setRequire2FA(true);
      setErrorMsg(result.message);
    } catch (err) {
      console.error(err);
      setErrorMsg(t("login.network_error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return standalone ? (
      <StandaloneShell publicName={publicInfo?.sitename}>
        <Flex align="center" justify="center" gap="2" py="8">
          <LoaderCircle size={18} className="animate-spin" />
          <Text size="2" color="gray">{t("loading")}</Text>
        </Flex>
      </StandaloneShell>
    ) : (
      <Button disabled>{t("loading")}</Button>
    );
  }

  if (error || !account) {
    const retry = (
      <Flex direction="column" gap="3">
        <Callout.Root color="red" role="alert">
          <Callout.Icon><CircleAlert size={16} /></Callout.Icon>
          <Callout.Text>{t("login.account_status_failed")}</Callout.Text>
        </Callout.Root>
        <Button variant="soft" onClick={() => void refresh()}>
          {t("common.retry")}
        </Button>
      </Flex>
    );
    return standalone ? (
      <StandaloneShell publicName={publicInfo?.sitename}>{retry}</StandaloneShell>
    ) : retry;
  }

  if (account.logged_in) {
    if (!showSettings) return null;
    return (
      <a href="/admin" target="_blank" rel="noreferrer">
        <IconButton><TablerSettings /></IconButton>
      </a>
    );
  }

  const oauthProvider =
    publicInfo?.oauth_provider === "generic"
      ? "OAuth"
      : publicInfo?.oauth_provider
        ? publicInfo.oauth_provider.charAt(0).toUpperCase() +
          publicInfo.oauth_provider.slice(1)
        : "OAuth";

  const loginForm = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isLoading) void handleLogin();
      }}
    >
      <Flex direction="column" gap="3">
        {passwordLoginEnabled ? (
          <>
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                {t("login.username")}
              </Text>
              <TextField.Root
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("login.username_placeholder")}
                disabled={isLoading}
                autoComplete="username"
                autoFocus
                size="3"
                className="text-[15px]"
              />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                {t("login.password")}
              </Text>
              <TextField.Root
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder={t("login.password_placeholder")}
                disabled={isLoading}
                autoComplete="current-password"
                size="3"
                className="text-[15px]"
              />
            </label>
            {require2FA ? (
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  {t("login.two_factor")}
                </Text>
                <TextField.Root
                  value={twoFac}
                  onChange={(event) => setTwoFac(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  disabled={isLoading}
                  size="3"
                />
              </label>
            ) : null}
            {errorMsg ? <Text size="2" color="red">{errorMsg}</Text> : null}
            <Button type="submit" size="3" disabled={isLoading || !isFormValid}>
              {isLoading ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isLoading ? t("login.logging_in") : t("login.title")}
            </Button>
          </>
        ) : null}
        {oauthEnabled ? (
          <Button
            onClick={() => { window.location.href = "/api/oauth"; }}
            variant={passwordLoginEnabled ? "soft" : "solid"}
            disabled={isLoading}
            type="button"
            size="3"
          >
            <LogIn size={16} />
            {t("login.login_with", { provider: oauthProvider })}
          </Button>
        ) : null}
      </Flex>
    </form>
  );

  if (standalone) {
    return (
      <StandaloneShell publicName={publicInfo?.sitename} info={info}>
        {loginForm}
      </StandaloneShell>
    );
  }

  if (onlyOAuthLogin && !autoOpen) {
    const redirect = () => { window.location.href = "/api/oauth"; };
    if (trigger) {
      return typeof trigger === "string" ? (
        <Button onClick={redirect}>{trigger}</Button>
      ) : (
        <span onClick={redirect} style={{ cursor: "pointer", display: "inline-flex" }}>
          {trigger}
        </span>
      );
    }
    return <Button onClick={redirect}>{t("login.title")}</Button>;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        {trigger || <Button>{t("login.title")}</Button>}
      </Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <LoginIdentityHeader dialog />
        {info ? <Text as="div" size="2" color="gray" mb="4">{info}</Text> : null}
        {loginForm}
      </Dialog.Content>
    </Dialog.Root>
  );
};

const StandaloneShell = ({
  info,
  children,
}: {
  publicName?: string;
  info?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="w-full max-w-[420px] px-4 py-8 sm:px-0">
      <div className="fixed right-4 top-4 z-10 flex gap-2 sm:right-6 sm:top-6">
        <LanguageSwitch />
        <ThemeSwitch />
      </div>
      <section className="rounded-lg border border-[var(--gray-a5)] bg-[var(--color-panel-solid)] p-5 shadow-lg sm:p-7">
        <LoginIdentityHeader />
        {info ? <Text as="div" size="2" color="gray" mb="4">{info}</Text> : null}
        {children}
      </section>
    </div>
  );
};

const LoginDialog = (props: LoginDialogProps) => {
  const inheritedAccount = useOptionalAccount();
  if (inheritedAccount) return <LoginDialogContent {...props} />;
  return (
    <AccountProvider>
      <LoginDialogContent {...props} />
    </AccountProvider>
  );
};

export default LoginDialog;
