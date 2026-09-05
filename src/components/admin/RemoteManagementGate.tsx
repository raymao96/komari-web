import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SettingsPageSkeleton from "@/components/admin/SettingsPageSkeleton";
import { useSettings } from "@/lib/api";
import {
  ALLOW_REMOTE_MANAGEMENT_SETTING_PATH,
  isAllowRemoteManagementEnabled,
  isRemoteManagementPath,
} from "@/utils/allowRemoteManagement";

type GateValue = {
  enabled: boolean;
  loading: boolean;
  ensureEnabled: () => boolean;
};

const RemoteManagementGateContext = createContext<GateValue | null>(null);

export function useOptionalRemoteManagementGate(): GateValue | null {
  return useContext(RemoteManagementGateContext);
}

export function useRemoteManagementGate(): GateValue {
  const context = useContext(RemoteManagementGateContext);
  if (!context) {
    throw new Error(
      "useRemoteManagementGate must be used within RemoteManagementGateProvider",
    );
  }
  return context;
}

function RemoteManagementRequiredDialog({
  open,
  onGoEnable,
  onDismiss,
}: {
  open: boolean;
  onGoEnable: () => void;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onDismiss}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {t("settings.general.allow_remote_management_required_title")}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 15, lineHeight: 1.6 }}>
          {t("settings.general.allow_remote_management_required_description")}
        </Typography>
      </DialogContent>
      <DialogActions>
        {onDismiss ? (
          <Button onClick={onDismiss}>{t("common.cancel")}</Button>
        ) : null}
        <Button variant="contained" onClick={onGoEnable}>
          {t("settings.general.allow_remote_management_go_enable")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function RemoteManagementGateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { settings, loading } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const enabled = isAllowRemoteManagementEnabled(settings);

  const ensureEnabled = useCallback(() => {
    if (loading || enabled) return true;
    setOpen(true);
    return false;
  }, [enabled, loading]);

  const value = useMemo(
    () => ({ enabled, loading, ensureEnabled }),
    [enabled, loading, ensureEnabled],
  );

  const goEnable = useCallback(() => {
    setOpen(false);
    navigate(ALLOW_REMOTE_MANAGEMENT_SETTING_PATH);
  }, [navigate]);

  return (
    <RemoteManagementGateContext.Provider value={value}>
      {children}
      <RemoteManagementRequiredDialog
        open={open}
        onGoEnable={goEnable}
        onDismiss={() => setOpen(false)}
      />
    </RemoteManagementGateContext.Provider>
  );
}

export function guardRemoteManagementNav(
  event: Pick<MouseEvent, "preventDefault">,
  path: string,
  ensureEnabled: () => boolean,
): boolean {
  if (!isRemoteManagementPath(path)) return false;
  if (ensureEnabled()) return false;
  event.preventDefault();
  return true;
}

export function RequireAllowRemoteManagement({
  children,
  loadingFallback,
}: {
  children: ReactNode;
  loadingFallback?: ReactNode;
}) {
  const { settings, loading } = useSettings();
  const navigate = useNavigate();
  if (loading) return <>{loadingFallback ?? <SettingsPageSkeleton />}</>;
  if (isAllowRemoteManagementEnabled(settings)) return <>{children}</>;
  return (
    <>
      {loadingFallback ?? <SettingsPageSkeleton />}
      <RemoteManagementRequiredDialog
        open
        onGoEnable={() => navigate(ALLOW_REMOTE_MANAGEMENT_SETTING_PATH)}
      />
    </>
  );
}
