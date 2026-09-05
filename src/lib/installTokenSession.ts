import {
  fetchClientToken,
  isClientTokenTwoFactorInvalid,
  isClientTokenTwoFactorRequired,
} from "./clientToken.ts";

export type InstallTokenSnapshot = {
  token: string | null;
  loading: boolean;
  error: string | null;
  twoFactorOpen: boolean;
  twoFactorInvalid: boolean;
  submitting: boolean;
};

export type InstallTokenFetcher = (
  uuid: string,
  options?: { signal?: AbortSignal; twoFactorCode?: string },
) => Promise<string>;

const idleSnapshot = (): InstallTokenSnapshot => ({
  token: null,
  loading: false,
  error: null,
  twoFactorOpen: false,
  twoFactorInvalid: false,
  submitting: false,
});

export function installCommandCopyAllowed(snapshot: InstallTokenSnapshot): boolean {
  return (
    Boolean(snapshot.token) &&
    !snapshot.loading &&
    !snapshot.error &&
    !snapshot.twoFactorOpen &&
    !snapshot.submitting
  );
}

export function createInstallTokenSession(
  fetchToken: InstallTokenFetcher = fetchClientToken,
) {
  const tokenAbortControllerRef: { current: AbortController | null } = {
    current: null,
  };
  let tokenRequestId = 0;
  let dialogOpen = false;
  let snapshot = idleSnapshot();
  const listeners = new Set<(snapshot: InstallTokenSnapshot) => void>();

  const emit = (next: InstallTokenSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener(snapshot);
  };

  const abortCurrent = () => {
    tokenAbortControllerRef.current?.abort();
    tokenAbortControllerRef.current = null;
  };

  const invalidateLateResponses = () => {
    abortCurrent();
    tokenRequestId += 1;
  };

  const resetVisibleState = () => {
    emit(idleSnapshot());
  };

  const stillCurrent = (requestId: number) =>
    requestId === tokenRequestId && dialogOpen;

  const requestToken = async (uuid: string, twoFactorCode?: string) => {
    abortCurrent();
    const controller = new AbortController();
    tokenAbortControllerRef.current = controller;
    const requestId = ++tokenRequestId;
    const submitting = Boolean(twoFactorCode);
    emit({
      ...snapshot,
      token: null,
      loading: !submitting,
      submitting,
      error: null,
      twoFactorInvalid: false,
    });

    try {
      const token = await fetchToken(uuid, {
        signal: controller.signal,
        twoFactorCode,
      });
      if (!stillCurrent(requestId)) return snapshot;
      emit({
        token,
        loading: false,
        error: null,
        twoFactorOpen: false,
        twoFactorInvalid: false,
        submitting: false,
      });
      return snapshot;
    } catch (error: unknown) {
      if (controller.signal.aborted || !stillCurrent(requestId)) {
        return snapshot;
      }
      if (isClientTokenTwoFactorRequired(error)) {
        emit({
          token: null,
          loading: false,
          error: null,
          twoFactorOpen: true,
          twoFactorInvalid: false,
          submitting: false,
        });
        return snapshot;
      }
      if (isClientTokenTwoFactorInvalid(error)) {
        emit({
          token: null,
          loading: false,
          error: null,
          twoFactorOpen: true,
          twoFactorInvalid: true,
          submitting: false,
        });
        return snapshot;
      }
      emit({
        token: null,
        loading: false,
        error: error instanceof Error ? error.message : "token load failed",
        twoFactorOpen: false,
        twoFactorInvalid: false,
        submitting: false,
      });
      return snapshot;
    } finally {
      if (tokenAbortControllerRef.current === controller) {
        tokenAbortControllerRef.current = null;
      }
      if (stillCurrent(requestId) && snapshot.loading) {
        emit({ ...snapshot, loading: false, submitting: false });
      }
    }
  };

  const beginDeployTokenFetch = (uuid: string) => {
    dialogOpen = true;
    if (snapshot.token) return Promise.resolve(snapshot);
    return requestToken(uuid);
  };

  return {
    tokenAbortControllerRef,
    getRequestId: () => tokenRequestId,
    getSnapshot: () => snapshot,
    subscribe(listener: (snapshot: InstallTokenSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
    beginDeployTokenFetch,
    openDialog: beginDeployTokenFetch,
    submitTwoFactor(uuid: string, code: string) {
      dialogOpen = true;
      return requestToken(uuid, code);
    },
    cancelTwoFactor() {
      invalidateLateResponses();
      resetVisibleState();
    },
    closeDialog() {
      dialogOpen = false;
      invalidateLateResponses();
      resetVisibleState();
    },
    switchNode() {
      invalidateLateResponses();
      resetVisibleState();
    },
    dispose() {
      dialogOpen = false;
      invalidateLateResponses();
      resetVisibleState();
    },
  };
}

export type InstallTokenSession = ReturnType<typeof createInstallTokenSession>;
