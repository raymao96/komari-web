import AppDialogContent from "@/components/AppDialogContent";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Button, Dialog, IconButton, TextField, Theme } from "@radix-ui/themes";
import { ThemeProvider } from "@mui/material/styles";
import { Plus, Server, X } from "@/components/admin/muiIcons";
import { Toaster, toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LiveDataResponse, Record as LiveRecord } from "@/types/LiveData";
import RemoteSession, { type RemoteNode } from "./RemoteSession";
import { getRemoteLaunchTarget } from "@/utils/remoteLaunch";
import { createRandomId } from "@/utils/randomId";
import { localizeRemoteError } from "@/utils/remoteSession";
import { useAccount } from "@/contexts/AccountContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { SettingsProvider } from "@/lib/api";
import { RequireAllowRemoteManagement } from "@/components/admin/RemoteManagementGate";
import Loading from "@/components/loading";
import { mergeLatestStatus } from "@/utils/liveData";
import { resolveAdminAuthView } from "@/utils/adminAuth";
import RemoteNodePicker from "@/components/remote/RemoteNodePicker";
import { createAppTheme } from "@/theme/createAppTheme";
import { useTranslation } from "react-i18next";
import "./Terminal.css";

type RemoteTab = {
  id: string;
  uuid: string;
};

const maxTabs = 16;
const liveStatusInterval = 3_000;
const terminalMuiTheme = createAppTheme("dark");
type AuthorizationState = "checking" | "required" | "authorized" | "error";

type SortableRemoteTabProps = {
  tab: RemoteTab;
  label: string;
  active: boolean;
  online: boolean;
  onActivate: () => void;
  onClose: () => void;
};

function SortableRemoteTab({ tab, label, active, online, onActivate, onClose }: SortableRemoteTabProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`remote-tab${active ? " is-active" : ""}${isDragging ? " is-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onActivate}
      {...attributes}
      {...listeners}
    >
      <i className={online ? "is-online" : ""} />
      <span title={label}>{label}</span>
      <IconButton asChild size="1" variant="ghost" color="gray">
        <span
          role="button"
          tabIndex={0}
          title={t("terminal.session.close_tab")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); onClose(); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.stopPropagation();
              onClose();
            }
          }}
        ><X size={13} /></span>
      </IconButton>
    </button>
  );
}

function TerminalChrome({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={terminalMuiTheme}>
      <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="small">
        {children}
      </Theme>
    </ThemeProvider>
  );
}

export default function TerminalWorkspace() {
  const { t } = useTranslation();
  const accountState = useAccount();
  const view = resolveAdminAuthView(accountState);

  if (view === "loading") {
    return (
      <TerminalChrome>
        <Loading fullscreen />
      </TerminalChrome>
    );
  }
  if (view === "error") {
    return (
      <TerminalChrome>
        <div className="remote-empty-workspace">
          <strong>{t("login.account_status_failed")}</strong>
          <Button onClick={() => void accountState.refresh()}>{t("common.retry")}</Button>
        </div>
      </TerminalChrome>
    );
  }
  if (view === "login") {
    return <Navigate to="/admin" replace />;
  }
  return (
    <SettingsProvider>
      <RequireAllowRemoteManagement loadingFallback={<Loading fullscreen />}>
        <TerminalWorkspaceInner />
      </RequireAllowRemoteManagement>
    </SettingsProvider>
  );
}

function TerminalWorkspaceInner() {
  const { t } = useTranslation();
  const { account } = useAccount();
  useEffect(() => {
    document.documentElement.classList.add("remote-terminal-open");
    return () => document.documentElement.classList.remove("remote-terminal-open");
  }, []);
  const twoFaEnabled = Boolean(account?.["2fa_enabled"]);
  const initialUUID = useMemo(() => getRemoteLaunchTarget(), []);
  const [nodes, setNodes] = useState<RemoteNode[]>([]);
  const [tabs, setTabs] = useState<RemoteTab[]>([]);
  const [activeID, setActiveID] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerUUID, setPickerUUID] = useState("");
  const [live, setLive] = useState<Record<string, LiveRecord>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [nodesLoaded, setNodesLoaded] = useState(false);
  const [authorization, setAuthorization] = useState<AuthorizationState>("checking");
  const [otpInput, setOtpInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [grant, setGrant] = useState("");
  const initialized = useRef(false);
  const authorizationStarted = useRef(false);
  const grantRef = useRef("");
  const pageInstanceIdRef = useRef(createRandomId());
  const grantExpiresAtRef = useRef(0);
  const liveDataRef = useRef<LiveDataResponse | null>(null);
  const { callViaHTTP } = useRPC2Call();
  const tabSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {}),
  );

  const addTab = useCallback((uuid: string) => {
    if (!uuid) return;
    if (tabs.length >= maxTabs) {
      toast.error(t("terminal.session.max_tabs", { count: maxTabs }));
      return;
    }
    const tab = { id: createRandomId(), uuid };
    setTabs((current) => [...current, tab]);
    setActiveID(tab.id);
  }, [t, tabs.length]);

  useEffect(() => {
    fetch("/api/admin/client/list")
      .then((response) => response.json())
      .then((payload) => {
        const data = Array.isArray(payload) ? payload : payload?.data;
        const list = Array.isArray(data) ? data : [];
        setNodes(list);
        setNodesLoaded(true);
      })
      .catch(() => toast.error(t("terminal.session.load_nodes_failed")));
  }, [t]);

  const authorizeRemote = useCallback(async (credentials?: { password?: string; otp?: string }) => {
    setOtpError("");
    const password = credentials?.password || passwordInput;
    const otp = credentials?.otp || otpInput;
    setPasswordInput("");
    setOtpInput("");
    try {
      const response = await fetch("/api/admin/client/remote/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          scope: "remote",
          page_id: pageInstanceIdRef.current,
          password: password || undefined,
          otp: otp || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const nextGrant = payload?.data?.grant;
        if (typeof nextGrant !== "string" || !nextGrant) {
          throw new Error(t("terminal.session.auth_failed"));
        }
        grantRef.current = nextGrant;
        setGrant(nextGrant);
        const expiresAt = Date.parse(String(payload?.data?.expires_at ?? ""));
        grantExpiresAtRef.current = Number.isFinite(expiresAt) ? expiresAt : 0;
        setAuthorization("authorized");
        return;
      }
      if (response.status === 429) {
        setAuthorization("required");
        setOtpError(
          localizeRemoteError(payload?.message, t) || t("terminal.session.auth_rate_limited"),
        );
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setAuthorization("required");
        setOtpError(localizeRemoteError(payload?.message, t) || t("common.error"));
        return;
      }
      throw new Error(localizeRemoteError(payload?.message, t) || t("terminal.session.auth_failed"));
    } catch (error) {
      setAuthorization("error");
      setOtpError(
        error instanceof Error
          ? localizeRemoteError(error.message, t)
          : t("terminal.session.auth_failed"),
      );
    } finally {
      setPasswordInput("");
      setOtpInput("");
    }
  }, [otpInput, passwordInput, t]);

  useEffect(() => {
    if (!nodesLoaded || authorizationStarted.current) return;
    authorizationStarted.current = true;
    setAuthorization("required");
  }, [nodesLoaded]);

  useEffect(() => {
    const revoke = () => {
      const currentGrant = grantRef.current;
      if (!currentGrant) return;
      grantRef.current = "";
      grantExpiresAtRef.current = 0;
      void fetch("/api/admin/client/remote/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant: currentGrant }),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", revoke);
    return () => {
      window.removeEventListener("pagehide", revoke);
      revoke();
    };
  }, []);

  useEffect(() => {
    if (authorization !== "authorized") return;
    const expiresAt = grantExpiresAtRef.current;
    if (!expiresAt) return;
    const timer = window.setInterval(() => {
      if (Date.now() < grantExpiresAtRef.current) return;
      grantRef.current = "";
      setGrant("");
      grantExpiresAtRef.current = 0;
      setAuthorization("required");
      setOtpError("");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [authorization]);

  useEffect(() => {
    if (!nodesLoaded || authorization !== "authorized" || initialized.current) return;
    initialized.current = true;
    if (!initialUUID) return;
    const requested = nodes.find((node) => node.uuid === initialUUID);
    if (!requested) {
      toast.error(t("terminal.session.node_not_found"));
      return;
    }
    addTab(requested.uuid);
  }, [addTab, authorization, initialUUID, nodes, nodesLoaded, t]);

  useEffect(() => {
    if (authorization !== "authorized") return;

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
        timer = window.setTimeout(refresh, liveStatusInterval);
      }
    };

    const refresh = async () => {
      if (running || stopped || document.hidden) return;
      running = true;
      try {
        const result = await callViaHTTP<undefined, Record<string, any>>(
          "common:getNodesLatestStatus",
        );
        if (stopped) return;
        const payload = mergeLatestStatus(result, liveDataRef.current);
        liveDataRef.current = payload;
        setLive(payload.data.data);
        setOnline(new Set(payload.data.online));
      } catch {
        // The remote session remains usable; the next poll refreshes status.
      } finally {
        running = false;
        scheduleNext();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
      } else if (!running) {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!document.hidden) void refresh();

    return () => {
      stopped = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authorization, callViaHTTP]);

  useEffect(() => {
    const active = tabs.find((tab) => tab.id === activeID);
    if (!active) return;
    const node = nodes.find((item) => item.uuid === active.uuid);
    document.title = `${node?.name || t("common.server")} - ${t("terminal.remote_title")}`;
  }, [activeID, nodes, t, tabs]);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.uuid, node])), [nodes]);
  const labels = useMemo(() => {
    const counts = new Map<string, number>();
    return tabs.map((tab) => {
      const count = (counts.get(tab.uuid) || 0) + 1;
      counts.set(tab.uuid, count);
      const name = nodeMap.get(tab.uuid)?.name || tab.uuid.slice(0, 8);
      return count === 1 ? name : `${name} (${count})`;
    });
  }, [nodeMap, tabs]);

  const closeTab = useCallback((id: string) => {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index === -1) return;
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (activeID === id) {
      setActiveID(next[Math.min(index, next.length - 1)]?.id || "");
    }
  }, [activeID, tabs]);

  const reorderTabs = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setTabs((current) => {
      const oldIndex = current.findIndex((tab) => tab.id === active.id);
      const newIndex = current.findIndex((tab) => tab.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  }, []);

  const openNode = useCallback((uuid: string) => {
    const node = nodes.find((item) => item.uuid === uuid);
    if (!node) {
      toast.error(t("terminal.session.node_not_found"));
      return;
    }
    addTab(uuid);
  }, [addTab, nodes, t]);

  const openPicker = () => {
    setPickerUUID(
      nodes.find((node) => online.has(node.uuid))?.uuid ||
      nodes[0]?.uuid ||
      "",
    );
    setPickerOpen(true);
  };

  return (
    <TerminalChrome>
      <Toaster theme="dark" />
      <div className="remote-workspace">
        <nav className="remote-tabbar" aria-label={t("terminal.session.tabbar")}>
          <div className="remote-brand"><Server size={17} /><span>{t("terminal.session.brand")}</span></div>
          <DndContext sensors={tabSensors} collisionDetection={closestCenter} onDragEnd={reorderTabs}>
            <div className="remote-tabs">
              <SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
                {tabs.map((tab, index) => (
                  <SortableRemoteTab
                    key={tab.id}
                    tab={tab}
                    label={labels[index]}
                    active={activeID === tab.id}
                    online={online.has(tab.uuid)}
                    onActivate={() => setActiveID(tab.id)}
                    onClose={() => closeTab(tab.id)}
                  />
                ))}
              </SortableContext>
              <IconButton className="remote-add-tab" size="2" variant="ghost" title={t("terminal.session.open_server")} aria-label={t("terminal.session.open_server")} disabled={authorization !== "authorized"} onClick={openPicker}><Plus size={17} /></IconButton>
            </div>
          </DndContext>
        </nav>

        <div className="remote-content">
          {tabs.map((tab) => {
            const node = nodeMap.get(tab.uuid) || { uuid: tab.uuid, name: tab.uuid.slice(0, 8) };
            return (
              <RemoteSession
                key={tab.id}
                node={node}
                live={live[tab.uuid]}
                online={online.has(tab.uuid)}
                active={activeID === tab.id}
                grant={grant}
                pageId={pageInstanceIdRef.current}
                onDuplicate={() => openNode(tab.uuid)}
              />
            );
          })}
          {tabs.length === 0 && (
            <div className="remote-empty-workspace">
              <Server size={28} />
              <strong>{t("terminal.session.workspace_empty")}</strong>
              <Button disabled={authorization !== "authorized"} onClick={openPicker}><Plus size={15} />{t("terminal.session.open_server")}</Button>
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <AppDialogContent className="remote-server-picker-dialog" maxWidth="1040px">
          <Dialog.Title>{t("terminal.session.open_server")}</Dialog.Title>
          <Dialog.Description>{t("terminal.session.open_description")}</Dialog.Description>
          <RemoteNodePicker
            nodes={nodes}
            onlineSet={online}
            selectedUUID={pickerUUID}
            columns={2}
            pageSize={6}
            rowsPerPage={3}
            onSelect={(node) => setPickerUUID(node.uuid)}
          />
          <div className="remote-dialog-actions">
            <Button variant="soft" onClick={() => setPickerOpen(false)}>{t("common.cancel")}</Button>
            <Button disabled={!pickerUUID || !online.has(pickerUUID)} onClick={() => { openNode(pickerUUID); setPickerOpen(false); }}>{t("terminal.session.open")}</Button>
          </div>
        </AppDialogContent>
      </Dialog.Root>

      <Dialog.Root open={authorization === "required"}>
        <AppDialogContent maxWidth="400px">
          <Dialog.Title>{twoFaEnabled ? t("login.two_factor") : t("terminal.session.reauth_title")}</Dialog.Title>
          <Dialog.Description>
            {twoFaEnabled
              ? `${t("account.2fa_otp_input_prompt")} ${t("terminal.session.two_factor_valid_for")}`
              : t("terminal.session.reauth_password_prompt")}
          </Dialog.Description>
          {twoFaEnabled ? (
            <TextField.Root
              type="text"
              inputMode="numeric"
              autoFocus
              autoComplete="one-time-code"
              value={otpInput}
              color={otpError ? "red" : undefined}
              onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ""))}
              onKeyDown={(event) => event.key === "Enter" && otpInput && void authorizeRemote({ otp: otpInput })}
            />
          ) : (
            <TextField.Root
              type="password"
              autoFocus
              autoComplete="current-password"
              value={passwordInput}
              color={otpError ? "red" : undefined}
              onChange={(event) => setPasswordInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && passwordInput && void authorizeRemote({ password: passwordInput })}
            />
          )}
          {otpError && <p className="remote-dialog-error">{otpError}</p>}
          <div className="remote-dialog-actions">
            <Button variant="soft" onClick={() => {
              window.close();
              window.setTimeout(() => { if (!window.closed) window.location.assign("/admin"); }, 100);
            }}>{t("common.cancel")}</Button>
            <Button
              disabled={twoFaEnabled ? !otpInput : !passwordInput}
              onClick={() => void authorizeRemote(twoFaEnabled ? { otp: otpInput } : { password: passwordInput })}
            >
              {t("terminal.session.verify_and_enter")}
            </Button>
          </div>
        </AppDialogContent>
      </Dialog.Root>

      <Dialog.Root open={authorization === "error"}>
        <AppDialogContent maxWidth="400px">
          <Dialog.Title>{t("terminal.session.auth_failed_title")}</Dialog.Title>
          <Dialog.Description>{otpError || t("terminal.session.auth_failed")}</Dialog.Description>
          <div className="remote-dialog-actions"><Button onClick={() => {
            setAuthorization("required");
            setOtpError("");
          }}>{t("common.retry")}</Button></div>
        </AppDialogContent>
      </Dialog.Root>

    </TerminalChrome>
  );
}
