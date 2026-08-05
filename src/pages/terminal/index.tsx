import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog, IconButton, TextField, Theme } from "@radix-ui/themes";
import { Plus, Server, X } from "lucide-react";
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
import { useRPC2Call } from "@/contexts/RPC2Context";
import { mergeLatestStatus } from "@/utils/liveData";
import RemoteNodePicker from "@/components/remote/RemoteNodePicker";
import "./Terminal.css";

type RemoteTab = {
  id: string;
  uuid: string;
};

const maxTabs = 16;
const liveStatusInterval = 3_000;
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
          title="关闭标签"
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

export default function TerminalWorkspace() {
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
  const [otpError, setOtpError] = useState("");
  const initialized = useRef(false);
  const authorizationStarted = useRef(false);
  const liveDataRef = useRef<LiveDataResponse | null>(null);
  const { callViaHTTP } = useRPC2Call();
  const tabSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {}),
  );

  useEffect(() => {
    document.documentElement.classList.add("remote-terminal-open");
    return () => document.documentElement.classList.remove("remote-terminal-open");
  }, []);

  const addTab = useCallback((uuid: string) => {
    if (!uuid) return;
    if (tabs.length >= maxTabs) {
      toast.error(`最多同时打开 ${maxTabs} 个远程标签`);
      return;
    }
    const tab = { id: crypto.randomUUID(), uuid };
    setTabs((current) => [...current, tab]);
    setActiveID(tab.id);
  }, [tabs.length]);

  useEffect(() => {
    fetch("/api/admin/client/list")
      .then((response) => response.json())
      .then((payload) => {
        const data = Array.isArray(payload) ? payload : payload?.data;
        const list = Array.isArray(data) ? data : [];
        setNodes(list);
        setNodesLoaded(true);
      })
      .catch(() => toast.error("无法加载服务器列表"));
  }, []);

  const authorizeRemote = useCallback(async (code?: string) => {
    setOtpError("");
    try {
      const response = await fetch("/api/admin/client/remote/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(code ? { "2fa_code": code } : {}),
      });
      const payload = await response.json();
      if (response.ok) {
        setAuthorization("authorized");
        setOtpInput("");
        return;
      }
      if (response.status === 401) {
        setAuthorization("required");
        if (code) setOtpError(payload?.message === "Invalid 2FA code" ? "动态口令无效，请重新输入" : (payload?.message || "验证失败"));
        return;
      }
      throw new Error(payload?.message || "无法验证远程管理权限");
    } catch (error) {
      setAuthorization("error");
      setOtpError(error instanceof Error ? error.message : "无法验证远程管理权限");
    }
  }, []);

  useEffect(() => {
    if (!nodesLoaded || authorizationStarted.current) return;
    authorizationStarted.current = true;
    void authorizeRemote();
  }, [authorizeRemote, initialUUID, nodes, nodesLoaded]);

  useEffect(() => {
    if (!nodesLoaded || authorization !== "authorized" || initialized.current) return;
    initialized.current = true;
    if (!initialUUID) return;
    const requested = nodes.find((node) => node.uuid === initialUUID);
    if (!requested) {
      toast.error("指定的服务器不存在");
      return;
    }
    addTab(requested.uuid);
  }, [addTab, authorization, initialUUID, nodes, nodesLoaded]);

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
  }, [callViaHTTP]);

  useEffect(() => {
    const active = tabs.find((tab) => tab.id === activeID);
    if (!active) return;
    const node = nodes.find((item) => item.uuid === active.uuid);
    document.title = `${node?.name || "服务器"} - 远程终端`;
  }, [activeID, nodes, tabs]);

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
      toast.error("指定的服务器不存在");
      return;
    }
    addTab(uuid);
  }, [addTab, nodes]);

  const openPicker = () => {
    setPickerUUID(
      nodes.find((node) => online.has(node.uuid))?.uuid ||
      nodes[0]?.uuid ||
      "",
    );
    setPickerOpen(true);
  };

  return (
    <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="small">
      <Toaster theme="dark" />
      <div className="remote-workspace">
        <nav className="remote-tabbar" aria-label="远程服务器标签">
          <div className="remote-brand"><Server size={17} /><span>Komari Lite 远程管理</span></div>
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
              <IconButton className="remote-add-tab" size="2" variant="ghost" title="打开服务器" aria-label="打开服务器" disabled={authorization !== "authorized"} onClick={openPicker}><Plus size={17} /></IconButton>
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
                onDuplicate={() => openNode(tab.uuid)}
              />
            );
          })}
          {tabs.length === 0 && (
            <div className="remote-empty-workspace">
              <Server size={28} />
              <strong>尚未打开远程服务器</strong>
              <Button disabled={authorization !== "authorized"} onClick={openPicker}><Plus size={15} />打开服务器</Button>
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Dialog.Content className="remote-server-picker-dialog" maxWidth="1040px">
          <Dialog.Title>打开远程服务器</Dialog.Title>
          <Dialog.Description>可重复选择同一台服务器，每个标签都会建立独立的终端与文件会话。</Dialog.Description>
          <RemoteNodePicker
            nodes={nodes}
            onlineSet={online}
            selectedUUID={pickerUUID}
            pageSize={6}
            onSelect={(node) => setPickerUUID(node.uuid)}
          />
          <div className="remote-dialog-actions">
            <Button variant="soft" onClick={() => setPickerOpen(false)}>取消</Button>
            <Button disabled={!pickerUUID || !online.has(pickerUUID)} onClick={() => { openNode(pickerUUID); setPickerOpen(false); }}>打开</Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={authorization === "required"}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>双重身份验证</Dialog.Title>
          <Dialog.Description>请输入身份验证应用生成的动态口令。本次验证在 10 分钟内有效。</Dialog.Description>
          <TextField.Root
            type="text"
            inputMode="numeric"
            autoFocus
            value={otpInput}
            color={otpError ? "red" : undefined}
            onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => event.key === "Enter" && otpInput && void authorizeRemote(otpInput)}
          />
          {otpError && <p className="remote-dialog-error">{otpError}</p>}
          <div className="remote-dialog-actions">
            <Button variant="soft" onClick={() => {
              window.close();
              window.setTimeout(() => { if (!window.closed) window.location.assign("/admin"); }, 100);
            }}>取消</Button>
            <Button disabled={!otpInput} onClick={() => void authorizeRemote(otpInput)}>验证并进入</Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={authorization === "error"}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>无法进入远程管理</Dialog.Title>
          <Dialog.Description>{otpError || "远程管理权限验证失败"}</Dialog.Description>
          <div className="remote-dialog-actions"><Button onClick={() => {
            setAuthorization("checking");
            void authorizeRemote();
          }}>重试</Button></div>
        </Dialog.Content>
      </Dialog.Root>

    </Theme>
  );
}
