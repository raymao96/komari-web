import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRPC2Call } from "@/contexts/RPC2Context";
import type { LiveDataResponse } from "@/types/LiveData";
import { nodeOnlineState } from "@/utils/adminNodeOnlineState";
import { mergeLatestStatus } from "@/utils/liveData";

export { nodeOnlineState };

export const ADMIN_NODE_LIVE_INTERVAL_MS = 5000;

type AdminNodeLiveDataValue = {
  liveData: LiveDataResponse | null;
  available: boolean;
};

const AdminNodeLiveDataContext = createContext<AdminNodeLiveDataValue | null>(
  null,
);

let cachedLiveData: LiveDataResponse | null = null;
let cachedAvailable = false;

function AdminNodeLiveDataPoller({ children }: { children: ReactNode }) {
  const { call } = useRPC2Call();
  const [liveData, setLiveData] = useState<LiveDataResponse | null>(
    () => cachedLiveData,
  );
  const [available, setAvailable] = useState(() => cachedAvailable);
  const liveDataRef = useRef<LiveDataResponse | null>(cachedLiveData);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let running = false;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const scheduleNext = () => {
      clearTimer();
      if (!stopped && !document.hidden) {
        timer = window.setTimeout(fetchLatest, ADMIN_NODE_LIVE_INTERVAL_MS);
      }
    };

    const fetchLatest = async () => {
      if (running || stopped || document.hidden) return;
      running = true;
      try {
        const result = await call<
          { compact: true },
          Record<string, unknown>
        >("common:getNodesLatestStatus", { compact: true });
        if (stopped) return;
        const next = mergeLatestStatus(result, liveDataRef.current);
        if (next !== liveDataRef.current) {
          liveDataRef.current = next;
          cachedLiveData = next;
          setLiveData(next);
        }
        cachedAvailable = true;
        setAvailable(true);
      } catch {
        if (!stopped && !liveDataRef.current) setAvailable(false);
      } finally {
        running = false;
        scheduleNext();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
      } else if (!running) {
        void fetchLatest();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!document.hidden) void fetchLatest();

    return () => {
      stopped = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [call]);

  const value = useMemo(
    () => ({ liveData, available }),
    [liveData, available],
  );

  return createElement(
    AdminNodeLiveDataContext.Provider,
    { value },
    children,
  );
}

export function AdminNodeLiveDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const existing = useContext(AdminNodeLiveDataContext);
  if (existing) return children;
  return createElement(AdminNodeLiveDataPoller, null, children);
}

export function useAdminNodeLiveData() {
  const context = useContext(AdminNodeLiveDataContext);
  if (!context) {
    throw new Error(
      "useAdminNodeLiveData must be used within AdminNodeLiveDataProvider",
    );
  }
  return context;
}
