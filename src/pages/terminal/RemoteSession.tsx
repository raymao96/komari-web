import AppDialogContent from "@/components/AppDialogContent";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Terminal } from "@xterm/xterm";
import type { ITerminalOptions } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  Button,
  Dialog,
  IconButton,
  TextArea,
} from "@radix-ui/themes";
import {
  ClipboardCopy,
  ClipboardList,
  ClipboardPaste,
  Copy,
  CornerDownLeft,
  Files,
  PanelRightClose,
  RotateCw,
  TextSelect,
} from "@/components/admin/muiIcons";
import { toast } from "sonner";
import type { Record as LiveRecord } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";
import {
  createRemoteSessionLease,
  localizeRemoteError,
  remoteAgentWaitTimeoutMs,
} from "@/utils/remoteSession";
import { TerminalContext } from "@/contexts/TerminalContext";
import {
  defaultXtermjsSettings,
  isTransparentBackground,
  useXtermjsSettings,
} from "@/hooks/useXtermjsSettings";
import CommandClipboardPanel from "./CommandClipboard";
import FileManager, { type FileManagerHandle } from "./FileManager";
import { useTranslation } from "react-i18next";

export type RemoteNode = {
  uuid: string;
  name: string;
  ipv4?: string;
  ipv6?: string;
  group?: string;
  tags?: string;
  region?: string;
  region_override?: string;
  mem_total?: number;
  disk_total?: number;
  remote_protocol?: number;
  remote_control_enabled?: boolean;
};

type Props = {
  node: RemoteNode;
  live?: LiveRecord;
  online: boolean;
  active: boolean;
  grant: string;
  pageId: string;
  onDuplicate: () => void;
};

type ConnectionState = "connecting" | "waiting" | "connected" | "disconnected" | "error";
type SidePanel = "files" | "commands" | null;
type ContextMenuState = { x: number; y: number } | null;
type TerminalTouchState = {
  identifier: number;
  startX: number;
  startY: number;
  lastY: number;
  scrollRemainder: number;
  moved: boolean;
};

const compactTerminalQuery = "(max-width: 900px)";
const compactTerminalFontSize = 14;
const compactTerminalPadding = 8;

function percentage(used = 0, total = 0) {
  if (!total) return "0.0%";
  return `${Math.min(100, Math.max(0, (used / total) * 100)).toFixed(1)}%`;
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through for HTTP origins and browsers that deny the async API.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("clipboard unavailable");
}

function stateLabel(state: ConnectionState, t: (key: string) => string) {
  switch (state) {
    case "connected": return t("terminal.session.connected");
    case "waiting": return t("terminal.session.waiting_agent");
    case "connecting": return t("terminal.session.connecting");
    case "error": return t("terminal.session.connection_failed");
    default: return t("terminal.disconnect");
  }
}

function isPermanentRemoteError(message: string, t: (key: string) => string) {
  const keys = [
    "terminal.session.errors.agent_too_old",
    "terminal.session.errors.agent_disabled",
    "terminal.session.errors.server_disabled",
    "terminal.session.errors.grant_required",
  ];
  return keys.some((key) => message === t(key));
}

function isEditableElement(element: Element | null) {
  return element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable) ||
    Boolean(element?.closest('[role="dialog"]'));
}

export default function RemoteSession({ node, live, online, active, grant, pageId, onDuplicate }: Props) {
  const { t } = useTranslation();
  const { settings, loading: settingsLoading, error: settingsError } = useXtermjsSettings();
  const terminalHost = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const fileManager = useRef<FileManagerHandle>(null);
  const mobileCommandInput = useRef<HTMLInputElement>(null);
  const mobileComposing = useRef(false);
  const terminalTouch = useRef<TerminalTouchState | null>(null);
  const activeRef = useRef(active);
  const [terminalReady, setTerminalReady] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [sidePanel, setSidePanel] = useState<SidePanel>(() => window.innerWidth >= 900 ? "files" : null);
  const [sideWidth, setSideWidth] = useState(400);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [remoteReady, setRemoteReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [manualPasteOpen, setManualPasteOpen] = useState(false);
  const [manualPasteText, setManualPasteText] = useState("");
  const [mobileCommand, setMobileCommand] = useState("");
  const [mobileKeyboardInset, setMobileKeyboardInset] = useState(0);
  const remoteReadyRef = useRef(false);
  const dragging = useRef(false);

  activeRef.current = active;

  const resizeTerminal = useCallback(() => {
    if (!activeRef.current) return;
    window.requestAnimationFrame(() => {
      fitAddon.current?.fit();
      const term = terminal.current;
      const ws = socket.current;
      if (term && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
  }, []);

  const copyTerminalSelection = useCallback(async () => {
    const instance = terminal.current;
    if (!instance?.hasSelection()) {
      toast.info(t("terminal.session.select_content_first"));
      instance?.focus();
      return;
    }
    try {
      await writeClipboardText(instance.getSelection());
      instance.clearSelection();
    } catch {
      toast.error(t("terminal.session.paste_clipboard_denied"));
    } finally {
      instance.focus();
    }
  }, [t]);

  const sendTerminalText = useCallback((text: string) => {
    const ws = socket.current;
    if (!text || ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(new TextEncoder().encode(text.replace(/\r?\n/g, "\r")));
    return true;
  }, []);

  const pasteTerminalClipboard = useCallback(async () => {
    const instance = terminal.current;
    try {
      if (!navigator.clipboard?.readText) throw new Error("clipboard unavailable");
      const text = await navigator.clipboard.readText();
      sendTerminalText(text);
    } catch {
      setManualPasteText("");
      setManualPasteOpen(true);
    } finally {
      instance?.focus();
    }
  }, [sendTerminalText]);

  const submitMobileCommand = useCallback(() => {
    if (mobileComposing.current || !mobileCommand) return;
    if (sendTerminalText(`${mobileCommand}\r`)) {
      setMobileCommand("");
      window.requestAnimationFrame(() => mobileCommandInput.current?.focus({ preventScroll: true }));
    }
  }, [mobileCommand, sendTerminalText]);

  useEffect(() => {
    if (settingsLoading || !terminalHost.current || terminal.current) return;
    const resolved = settingsError ? defaultXtermjsSettings : settings;
    const compactLayout = window.matchMedia(compactTerminalQuery);
    const configuredFontSize = resolved.terminalOptions.fontSize ?? compactTerminalFontSize;
    const configuredPadding = resolved.terminalPadding;
    const terminalFontSize = () => compactLayout.matches
      ? Math.min(configuredFontSize, compactTerminalFontSize)
      : configuredFontSize;
    const terminalPadding = () => compactLayout.matches
      ? Math.min(configuredPadding, compactTerminalPadding)
      : configuredPadding;
    const options: Partial<ITerminalOptions> = {
      cursorBlink: resolved.terminalOptions.cursorBlink,
      convertEol: resolved.terminalOptions.convertEol,
      fontFamily: resolved.terminalOptions.fontFamily,
      fontSize: terminalFontSize(),
      macOptionIsMeta: resolved.terminalOptions.macOptionIsMeta,
      scrollback: resolved.terminalOptions.scrollback,
      theme: resolved.terminalOptions.theme,
    };
    if (resolved.transparentBackground || isTransparentBackground(resolved.terminalOptions.theme?.background)) {
      options.allowTransparency = true;
    }
    const instance = new Terminal(options);
    const fit = new FitAddon();
    instance.loadAddon(fit);
    instance.loadAddon(new WebLinksAddon());
    instance.open(terminalHost.current);
    terminal.current = instance;
    fitAddon.current = fit;
    terminalHost.current.style.setProperty("--xterm-padding", `${terminalPadding()}px`);

    const updateTerminalDensity = () => {
      instance.options.fontSize = terminalFontSize();
      terminalHost.current?.style.setProperty("--xterm-padding", `${terminalPadding()}px`);
      resizeTerminal();
    };
    compactLayout.addEventListener("change", updateTerminalDensity);

    const style = document.createElement("style");
    style.dataset.remoteTerminal = node.uuid;
    style.textContent = resolved.customCss;
    document.head.appendChild(style);

    const inputDisposable = instance.onData((data) => {
      const ws = socket.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data));
      }
    });
    instance.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const key = event.key.toLowerCase();
      const copyWithSelection = event.ctrlKey && !event.shiftKey && key === "c" && instance.hasSelection();
      const copyShortcut = copyWithSelection ||
        ((event.ctrlKey && event.shiftKey) || event.metaKey) && key === "c" ||
        event.ctrlKey && event.key === "Insert";
      if (copyShortcut) {
        event.preventDefault();
        event.stopPropagation();
        void copyTerminalSelection();
        return false;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "v") {
        // Let the browser emit a ClipboardEvent. Its clipboardData works on
        // HTTP deployments where navigator.clipboard.readText is unavailable.
        return false;
      }
      return true;
    });
    const resizeObserver = new ResizeObserver(() => resizeTerminal());
    resizeObserver.observe(terminalHost.current);
    const host = terminalHost.current;
    const paste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text/plain") || "";
      if (!text) return;
      event.preventDefault();
      event.stopPropagation();
      sendTerminalText(text);
    };
    const contextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        x: Math.min(event.clientX, window.innerWidth - 176),
        y: Math.min(event.clientY, window.innerHeight - 132),
      });
    };
    const touchStart = (event: TouchEvent) => {
      if (!window.matchMedia(compactTerminalQuery).matches || event.touches.length !== 1) {
        terminalTouch.current = null;
        return;
      }
      const touch = event.touches[0];
      terminalTouch.current = {
        identifier: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        scrollRemainder: 0,
        moved: false,
      };
    };
    const touchMove = (event: TouchEvent) => {
      const state = terminalTouch.current;
      if (!state || !window.matchMedia(compactTerminalQuery).matches) return;
      const touch = Array.from(event.touches).find((item) => item.identifier === state.identifier);
      if (!touch) return;

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      if (!state.moved && Math.hypot(touch.clientX - state.startX, touch.clientY - state.startY) < 8) return;
      state.moved = true;

      const screen = host.querySelector<HTMLElement>(".xterm-screen");
      const lineHeight = screen
        ? screen.getBoundingClientRect().height / Math.max(instance.rows, 1)
        : compactTerminalFontSize * 1.2;
      state.scrollRemainder += (state.lastY - touch.clientY) / Math.max(lineHeight, 1);
      state.lastY = touch.clientY;

      const lines = state.scrollRemainder > 0
        ? Math.floor(state.scrollRemainder)
        : Math.ceil(state.scrollRemainder);
      if (lines !== 0) {
        instance.scrollLines(lines);
        state.scrollRemainder -= lines;
      }
    };
    const touchEnd = (event: TouchEvent) => {
      const state = terminalTouch.current;
      if (!state || !Array.from(event.changedTouches).some((item) => item.identifier === state.identifier)) return;
      terminalTouch.current = null;
      if (!state.moved) window.requestAnimationFrame(() => mobileCommandInput.current?.focus({ preventScroll: true }));
    };
    const touchCancel = () => {
      terminalTouch.current = null;
    };
    host.addEventListener("paste", paste, true);
    host.addEventListener("contextmenu", contextMenu);
    host.addEventListener("touchstart", touchStart, { capture: true, passive: true });
    host.addEventListener("touchmove", touchMove, { capture: true, passive: false });
    host.addEventListener("touchend", touchEnd, { capture: true, passive: true });
    host.addEventListener("touchcancel", touchCancel, { capture: true, passive: true });
    setTerminalReady(true);
    return () => {
      compactLayout.removeEventListener("change", updateTerminalDensity);
      resizeObserver.disconnect();
      inputDisposable.dispose();
      host.removeEventListener("paste", paste, true);
      host.removeEventListener("contextmenu", contextMenu);
      host.removeEventListener("touchstart", touchStart, true);
      host.removeEventListener("touchmove", touchMove, true);
      host.removeEventListener("touchend", touchEnd, true);
      host.removeEventListener("touchcancel", touchCancel, true);
      instance.dispose();
      style.remove();
      terminal.current = null;
      fitAddon.current = null;
    };
  }, [copyTerminalSelection, node.uuid, resizeTerminal, sendTerminalText, settings, settingsError, settingsLoading]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const compactLayout = window.matchMedia(compactTerminalQuery).matches;
      const pageZoomed = viewport
        ? Math.abs(viewport.scale - 1) > 0.01
        : false;
      const keyboardInset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      setMobileKeyboardInset(compactLayout && !pageZoomed ? keyboardInset : 0);
      resizeTerminal();
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [resizeTerminal]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", keydown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!terminalReady) return;
    let disposed = false;
    let heartbeat: number | undefined;
    let agentWaitTimeout: number | undefined;
    let ws: WebSocket | undefined;
    let sessionLease: ReturnType<typeof createRemoteSessionLease> | undefined;
    const abortController = new AbortController();
    const clearHeartbeat = () => {
      if (heartbeat !== undefined) {
        window.clearInterval(heartbeat);
        heartbeat = undefined;
      }
    };
    const clearAgentWaitTimeout = () => {
      if (agentWaitTimeout !== undefined) {
        window.clearTimeout(agentWaitTimeout);
        agentWaitTimeout = undefined;
      }
    };

    const connect = async () => {
      setConnectionState("connecting");
      setConnectionError("");
      remoteReadyRef.current = false;
      setRemoteReady(false);
      try {
        if (!grant) {
          throw new Error(t("terminal.session.errors.grant_required"));
        }
        if (node.remote_protocol !== 2) {
          throw new Error(t("terminal.session.errors.agent_too_old"));
        }
        if (node.remote_control_enabled === false) {
          throw new Error(t("terminal.session.errors.agent_disabled"));
        }
        const response = await fetch("/api/admin/client/remote/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ uuid: node.uuid, grant, page_id: pageId }),
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(t("terminal.session.session_full"));
          }
          throw new Error(localizeRemoteError(payload?.message, t));
        }
        sessionLease = createRemoteSessionLease(payload.data.session_id);
        if (disposed) {
          sessionLease.release();
          return;
        }
        const sessionID = sessionLease.sessionID;
        const browserTicket = payload.data.browser_ticket;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${protocol}//${window.location.host}/api/admin/client/remote`);
        ws.binaryType = "arraybuffer";
        socket.current = ws;
        ws.onopen = () => {
          if (disposed) {
            ws?.close();
            return;
          }
          ws?.send(JSON.stringify({ type: "auth", session_id: sessionID, ticket: browserTicket }));
          setConnectionState("waiting");
          agentWaitTimeout = window.setTimeout(() => {
            if (disposed || remoteReadyRef.current) return;
            const message = t("terminal.session.agent_timeout");
            setConnectionState("error");
            setConnectionError(message);
            terminal.current?.writeln(`\r\n${message}`);
            sessionLease?.release();
            ws?.close();
          }, remoteAgentWaitTimeoutMs);
          heartbeat = window.setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "heartbeat", timestamp: Date.now() }));
            }
          }, 10_000);
        };
        ws.onmessage = (event) => {
          if (disposed) return;
          if (event.data instanceof ArrayBuffer) {
            terminal.current?.write(new Uint8Array(event.data));
            return;
          }
          try {
            const message = JSON.parse(event.data);
            if (message.type === "remote.ready") {
              clearAgentWaitTimeout();
              setConnectionState("connected");
              remoteReadyRef.current = true;
              setRemoteReady(true);
              fileManager.current?.initialize(message.roots || [], message.home || message.roots?.[0], message.separator || "/");
              resizeTerminal();
              if (activeRef.current && !isEditableElement(document.activeElement)) {
                window.requestAnimationFrame(() => terminal.current?.focus());
              }
            } else if (message.type === "remote.status") {
              setConnectionState(message.status === "waiting" ? "waiting" : "connecting");
            } else if (message.type === "remote.error") {
              clearAgentWaitTimeout();
              remoteReadyRef.current = false;
              setRemoteReady(false);
              setConnectionState("error");
              const localizedMessage = localizeRemoteError(message.message, t);
              setConnectionError(localizedMessage);
              terminal.current?.writeln(`\r\n${localizedMessage}`);
              sessionLease?.release();
            } else if (message.type?.startsWith("file.")) {
              fileManager.current?.handleMessage(message);
            }
          } catch {
            terminal.current?.write(event.data);
          }
        };
        ws.onerror = () => {
          if (disposed) return;
          clearAgentWaitTimeout();
          sessionLease?.release();
          setConnectionState("error");
          setConnectionError(t("terminal.session.connection_error"));
        };
        ws.onclose = () => {
          clearHeartbeat();
          clearAgentWaitTimeout();
          sessionLease?.release();
          if (!disposed) {
            remoteReadyRef.current = false;
            setRemoteReady(false);
            setConnectionState((current) => current === "error" ? current : "disconnected");
            terminal.current?.writeln(`\r\n${t("terminal.session.disconnected_notice")}`);
          }
        };
      } catch (error) {
        sessionLease?.release();
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setConnectionState("error");
          setConnectionError(error instanceof Error ? error.message : t("terminal.session.connection_failed"));
        }
      }
    };
    void connect();
    return () => {
      disposed = true;
      abortController.abort();
      remoteReadyRef.current = false;
      clearHeartbeat();
      clearAgentWaitTimeout();
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) ws.close();
      sessionLease?.release();
      if (socket.current === ws) socket.current = null;
    };
  }, [grant, pageId, node.remote_control_enabled, node.remote_protocol, node.uuid, reconnectKey, resizeTerminal, t, terminalReady]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      resizeTerminal();
      if (!isEditableElement(document.activeElement)) terminal.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [active, sidePanel, sideWidth, resizeTerminal]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragging.current) return;
      setSideWidth(Math.min(620, Math.max(320, window.innerWidth - event.clientX)));
    };
    const stop = () => { dragging.current = false; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, []);

  const send = useCallback((message: Record<string, unknown>) => {
    const ws = socket.current;
    if (ws?.readyState !== WebSocket.OPEN || !remoteReadyRef.current) return false;
    ws.send(JSON.stringify(message));
    return true;
  }, []);

  const sendCommand = useCallback((command: string) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(new TextEncoder().encode(`${command}\r`));
    }
  }, []);

  const contextValue = useMemo(
    () => ({ terminal: terminalReady ? terminal.current : null, sendCommand }),
    [sendCommand, terminalReady],
  );
  const reconnect = () => {
    terminal.current?.reset();
    setReconnectKey((value) => value + 1);
  };
  const togglePanel = (panel: Exclude<SidePanel, null>) => {
    setSidePanel((current) => current === panel ? null : panel);
  };

  return (
    <TerminalContext.Provider value={contextValue}>
      <div className="remote-session" style={{ display: active ? "flex" : "none" }}>
        <header className="remote-session-header">
          <div className="remote-node-heading">
            <strong>{node.name}</strong>
            <span className={`remote-status is-${connectionState}`}><i />{stateLabel(connectionState, t)}</span>
          </div>
          <div className="remote-metrics">
            <span><small>CPU</small>{(live?.cpu.usage || 0).toFixed(1)}%</span>
            <span><small>{t("nodeCard.ram")}</small>{percentage(live?.ram.used, node.mem_total)}</span>
            <span><small>{t("nodeCard.disk")}</small>{percentage(live?.disk.used, node.disk_total)}</span>
            <span className="is-up"><small>{t("terminal.session.net_up")}</small>{formatBytes(live?.network.up || 0)}/s</span>
            <span className="is-down"><small>{t("terminal.session.net_down")}</small>{formatBytes(live?.network.down || 0)}/s</span>
          </div>
          <div className="remote-session-actions">
            <IconButton size="2" variant="ghost" title={t("terminal.session.copy_selection")} aria-label={t("terminal.session.copy_selection")} onClick={() => void copyTerminalSelection()}><ClipboardCopy size={16} /></IconButton>
            <IconButton size="2" variant="ghost" title={t("terminal.session.paste")} aria-label={t("terminal.session.paste")} disabled={!remoteReady} onClick={() => void pasteTerminalClipboard()}><ClipboardPaste size={16} /></IconButton>
            <IconButton size="2" variant="ghost" title={t("terminal.session.copy_tab")} aria-label={t("terminal.session.copy_tab")} onClick={onDuplicate}><Copy size={16} /></IconButton>
            <IconButton size="2" variant="ghost" title={t("terminal.session.reconnect")} onClick={reconnect}><RotateCw size={16} /></IconButton>
            <Button size="1" variant={sidePanel === "files" ? "solid" : "soft"} onClick={() => togglePanel("files")}><Files size={15} />{t("terminal.session.files")}</Button>
            <Button size="1" variant={sidePanel === "commands" ? "solid" : "soft"} onClick={() => togglePanel("commands")}><ClipboardList size={15} />{t("terminal.session.commands")}</Button>
            {sidePanel && <IconButton size="2" variant="ghost" title={t("terminal.session.close_sidebar")} onClick={() => setSidePanel(null)}><PanelRightClose size={16} /></IconButton>}
          </div>
        </header>

        <main className="remote-session-body">
          <div
            className="remote-terminal-pane"
            style={{ "--mobile-keyboard-inset": `${mobileKeyboardInset}px` } as CSSProperties}
          >
            <div
              ref={terminalHost}
              className="terminal-page terminal-xterm-host"
              style={{ "--xterm-padding": "16px" } as CSSProperties}
            />
            <form
              className="remote-mobile-command"
              onSubmit={(event) => {
                event.preventDefault();
                submitMobileCommand();
              }}
            >
              <input
                ref={mobileCommandInput}
                type="text"
                value={mobileCommand}
                placeholder={t("terminal.session.input_command")}
                aria-label={t("terminal.session.input_command_aria")}
                inputMode="text"
                enterKeyHint="send"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                disabled={!remoteReady}
                onChange={(event) => setMobileCommand(event.target.value)}
                onFocus={resizeTerminal}
                onBlur={resizeTerminal}
                onCompositionStart={() => { mobileComposing.current = true; }}
                onCompositionEnd={() => { mobileComposing.current = false; }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.nativeEvent.isComposing || mobileComposing.current || event.keyCode === 229)) {
                    event.stopPropagation();
                  }
                }}
              />
              <IconButton type="submit" size="2" aria-label={t("terminal.session.send_command")} disabled={!remoteReady || !mobileCommand}>
                <CornerDownLeft size={16} />
              </IconButton>
            </form>
            {(connectionState === "error" || connectionState === "disconnected") && (
              <div className="remote-reconnect">
                <span>{connectionError || t("terminal.disconnect")}</span>
                {!isPermanentRemoteError(connectionError, t) && (
                  <Button size="1" onClick={reconnect}><RotateCw size={14} />{t("terminal.session.reconnect")}</Button>
                )}
              </div>
            )}
          </div>
          {sidePanel && <div className="remote-divider" onPointerDown={() => { dragging.current = true; }} />}
          <aside className="remote-side-panel" style={{ width: sidePanel ? sideWidth : 0, display: sidePanel ? "block" : "none" }}>
            <div style={{ display: sidePanel === "files" ? "block" : "none", height: "100%" }}>
              <FileManager ref={fileManager} send={send} connected={remoteReady} />
            </div>
            {sidePanel === "commands" && <div className="remote-command-panel"><CommandClipboardPanel className="h-full w-full" /></div>}
          </aside>
        </main>

        <Dialog.Root open={manualPasteOpen} onOpenChange={setManualPasteOpen}>
          <AppDialogContent maxWidth="440px">
            <Dialog.Title>{t("terminal.session.paste_to_terminal")}</Dialog.Title>
            <TextArea autoFocus value={manualPasteText} onChange={(event) => setManualPasteText(event.target.value)} rows={7} />
            <div className="remote-dialog-actions">
              <Button variant="soft" onClick={() => setManualPasteOpen(false)}>{t("common.cancel")}</Button>
              <Button disabled={!manualPasteText} onClick={() => {
                if (sendTerminalText(manualPasteText)) {
                  setManualPasteOpen(false);
                  setManualPasteText("");
                  terminal.current?.focus();
                }
              }}>{t("terminal.session.insert")}</Button>
            </div>
          </AppDialogContent>
        </Dialog.Root>

        {contextMenu && (
          <div
            className="remote-terminal-context-menu"
            role="menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button type="button" role="menuitem" disabled={!terminal.current?.hasSelection()} onClick={() => {
              setContextMenu(null);
              void copyTerminalSelection();
            }}><ClipboardCopy size={15} />{t("common.copy")}</button>
            <button type="button" role="menuitem" disabled={!remoteReady} onClick={() => {
              setContextMenu(null);
              void pasteTerminalClipboard();
            }}><ClipboardPaste size={15} />{t("terminal.session.paste")}</button>
            <button type="button" role="menuitem" onClick={() => {
              terminal.current?.selectAll();
              setContextMenu(null);
            }}><TextSelect size={15} />{t("common.select_all")}</button>
          </div>
        )}

        {!online && connectionState !== "connected" && <span className="sr-only">{t("terminal.session.node_offline")}</span>}
      </div>
    </TerminalContext.Provider>
  );
}
