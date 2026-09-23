import { createContext, useContext } from "react";

export type RemoteManagementGateValue = {
  enabled: boolean;
  mcpEnabled: boolean;
  loading: boolean;
  ensureEnabled: () => boolean;
  ensureMCPEnabled: () => boolean;
};

export const RemoteManagementGateContext =
  createContext<RemoteManagementGateValue | null>(null);

let latestGate: RemoteManagementGateValue | null = null;

export function rememberRemoteManagementGate(
  value: RemoteManagementGateValue | null,
) {
  latestGate = value;
}

const inactiveGate: RemoteManagementGateValue = {
  enabled: true,
  mcpEnabled: true,
  loading: true,
  ensureEnabled: () => true,
  ensureMCPEnabled: () => true,
};

export function useOptionalRemoteManagementGate(): RemoteManagementGateValue | null {
  return useContext(RemoteManagementGateContext) ?? latestGate;
}

export function useRemoteManagementGate(): RemoteManagementGateValue {
  return useOptionalRemoteManagementGate() ?? inactiveGate;
}
