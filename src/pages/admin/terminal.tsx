import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Callout } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import Loading from "@/components/loading";
import RemoteNodePicker from "@/components/remote/RemoteNodePicker";
import { useNodeList } from "@/contexts/NodeListContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import type { LiveDataResponse } from "@/types/LiveData";
import { mergeLatestStatus } from "@/utils/liveData";
import { remoteTerminalPath } from "@/utils/remoteLaunch";

const statusRefreshInterval = 3_000;

export default function AdminRemoteTerminal() {
  const { t } = useTranslation();
  const { nodeList, isLoading, error } = useNodeList();
  const { call } = useRPC2Call();
  const liveDataRef = useRef<LiveDataResponse | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [statusReady, setStatusReady] = useState(false);

  const refreshStatus = useCallback(async () => {
    const result = await call<undefined, Record<string, unknown>>(
      "common:getNodesLatestStatus",
    );
    const live = mergeLatestStatus(result, liveDataRef.current);
    liveDataRef.current = live;
    setOnline(new Set(live.data.online));
    setStatusReady(true);
  }, [call]);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;

    const run = async () => {
      try {
        await refreshStatus();
      } catch {
        if (!stopped) setStatusReady(true);
      } finally {
        if (!stopped) timer = window.setTimeout(run, statusRefreshInterval);
      }
    };

    void run();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [refreshStatus]);

  const nodes = useMemo(() => nodeList ?? [], [nodeList]);

  if (isLoading || (!statusReady && nodes.length > 0)) return <Loading />;

  return (
    <div className="flex w-full flex-col gap-3 p-0 md:p-4">
      <div>
        <AdminPageTitle>{t("terminal.remote_title")}</AdminPageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("terminal.portal_subtitle")}
        </p>
      </div>

      {error ? (
        <Callout.Root color="red" role="alert">
          <Callout.Icon><CircleAlert size={16} /></Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      ) : null}

      <RemoteNodePicker
        nodes={nodes}
        onlineSet={online}
        rowsPerPage={3}
        onSelect={(node) => window.location.assign(remoteTerminalPath(node.uuid))}
      />
    </div>
  );
}
