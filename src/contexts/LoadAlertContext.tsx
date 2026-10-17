import React from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  fetchLoadAlertConfigurations,
  loadAlertBootstrapResource,
  type LoadAlertBootstrapSnapshot,
  type LoadAlertConfiguration,
} from "@/utils/loadAlertBootstrap";

export type LoadAlert = LoadAlertConfiguration;

interface LoadAlertContextType {
  loadAlerts: LoadAlert[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const LoadAlertContext = React.createContext<LoadAlertContextType | undefined>(
  undefined
);

export const LoadAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { account } = useAccount();
  const accountKey = account?.uuid || "__authenticated__";
  const initialSnapshot = loadAlertBootstrapResource.read(accountKey);
  const initialSnapshotRef = React.useRef<LoadAlertBootstrapSnapshot>(initialSnapshot);
  const [loadAlerts, setLoadAlerts] = React.useState<LoadAlert[] | null>(
    initialSnapshot.data,
  );
  const loadAlertsRef = React.useRef<LoadAlert[] | null>(initialSnapshot.data);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(initialSnapshot.error);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLoadAlertConfigurations();
      initialSnapshotRef.current = loadAlertBootstrapResource.update(accountKey, data);
      loadAlertsRef.current = data;
      setLoadAlerts(data);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "An error occurred while fetching load alerts";
      initialSnapshotRef.current = loadAlertBootstrapResource.update(
        accountKey,
        loadAlertsRef.current,
        message,
      );
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accountKey]);

  React.useEffect(() => {
    if (loadAlertBootstrapResource.isStale(initialSnapshotRef.current)) {
      void refresh();
    }
  }, [refresh]);

  return (
    <LoadAlertContext.Provider value={{
      loadAlerts,
      isLoading,
      error,
      refresh,
    }}>
      {children}
    </LoadAlertContext.Provider>
  );
};

export const useLoadAlert = () => {
  const context = React.useContext(LoadAlertContext);
  if (!context) {
    throw new Error("useLoadAlert must be used within a LoadAlertProvider");
  }
  return context;
};
