import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { useOutlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AdminShell from "@/components/admin/shell/AdminShell";
import AdminLoginPage from "@/components/admin/shell/AdminLoginPage";
import AdminRouteViewport from "@/components/admin/AdminRouteViewport";
import FullPageLoading from "@/components/FullPageLoading";
import { useAccount } from "@/contexts/AccountContext";
import { NodeDetailsProvider } from "@/contexts/NodeDetailsContext";
import { PingTaskProvider } from "@/contexts/PingTaskContext";
import { AdminNodeLiveDataProvider } from "@/hooks/use-admin-node-live-data";
import {
  SettingsProvider,
  updateSettingsWithToast,
  useSettings,
} from "@/lib/api";
import { resolveAdminAuthView } from "@/utils/adminAuth";
import { Eula } from "@/utils/field";
import { normalizeLanguage, readStoredLanguage } from "@/utils/language";

const AuthStatusScreen = ({
  failed = false,
  onRetry,
}: {
  failed?: boolean;
  onRetry?: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Stack
      spacing={2}
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        px: 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {failed ? (
        <>
          <Alert severity="error">
            {t("login.account_status_failed")}
          </Alert>
          <Button variant="outlined" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </>
      ) : null}
    </Stack>
  );
};

const AdminRouteLoading = () => (
  <div data-admin-route-pending="true" hidden />
);

const AdminAuthenticatedContent = () => {
  const outlet = useOutlet();
  const [firstRouteReady, setFirstRouteReady] = useState(false);
  const { settings, loading, error, setSettings } = useSettings();
  const lang = readStoredLanguage() || "en";
  const [open, setOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (loading || error || settings.eula_accepted !== false) {
      setOpen(false);
      return;
    }
    if (normalizeLanguage(lang).startsWith("zh")) {
      setOpen(true);
    }
  }, [loading, error, settings.eula_accepted, lang]);

  const acceptEula = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      await updateSettingsWithToast({ eula_accepted: true }, (key) => key);
      setSettings((current) => ({ ...current, eula_accepted: true }));
      setOpen(false);
    } catch {
      setOpen(true);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <>
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogTitle>法律声明与合规指引</DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            <pre className="text-wrap">{Eula}</pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => window.close()}>
            不接受
          </Button>
          <Button
            variant="contained"
            disabled={accepting}
            onClick={() => void acceptEula()}
          >
            我已详细阅读并接受
          </Button>
        </DialogActions>
      </Dialog>
      {!firstRouteReady ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
          }}
        >
          <FullPageLoading />
        </Box>
      ) : null}
      <Box
        aria-hidden={firstRouteReady ? undefined : true}
        sx={{ visibility: firstRouteReady ? "visible" : "hidden" }}
      >
        <AdminShell
          content={
            <AdminRouteViewport
              fallback={<AdminRouteLoading />}
              outlet={outlet}
              onFirstReady={() => setFirstRouteReady(true)}
            />
          }
        />
      </Box>
    </>
  );
};

const AdminAuthenticatedLayout = () => (
  <PingTaskProvider>
    <AdminNodeLiveDataProvider>
      <AdminAuthenticatedContent />
    </AdminNodeLiveDataProvider>
  </PingTaskProvider>
);

const AdminGuard = () => {
  const accountState = useAccount();
  const view = resolveAdminAuthView(accountState);

  return (
    <SettingsProvider>
      <NodeDetailsProvider>
        {view === "loading" ? (
          <FullPageLoading />
        ) : view === "error" ? (
          <AuthStatusScreen
            failed
            onRetry={() => {
              void accountState.refresh();
            }}
          />
        ) : view === "login" ? (
          <AdminLoginPage />
        ) : (
          <AdminAuthenticatedLayout />
        )}
      </NodeDetailsProvider>
    </SettingsProvider>
  );
};

const AdminLayout = () => <AdminGuard />;

export default AdminLayout;
