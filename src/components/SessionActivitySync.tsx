import { useEffect } from "react";

import { useAccount } from "@/contexts/AccountContext";
import { subscribeSessionTouch, useSessionActivity } from "@/hooks/useSessionActivity";

export default function SessionActivitySync() {
  const { account, refresh } = useAccount();
  useSessionActivity(Boolean(account?.logged_in));

  useEffect(() => {
    return subscribeSessionTouch((payload) => {
      if (payload.expired) void refresh();
    });
  }, [refresh]);

  return null;
}
