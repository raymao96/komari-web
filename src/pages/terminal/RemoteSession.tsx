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
  TextField,
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
} from "lucide-react";
import { toast } from "sonner";
import type { Record as LiveRecord } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";
import { TerminalContext } from "@/contexts/TerminalContext";
import {
  defaultXtermjsSettings,
  isTransparentBackground,
  useXtermjsSettings,
} from "@/hooks/useXtermjsSettings";
import CommandClipboardPanel from "./CommandClipboard";
import FileManager, { type FileManagerHandle } from "./FileManager";

export type RemoteNode = {
  uuid: string;
  name: string;
  mem_total?: number;
  disk_total?: number;
  remote_control_protected?: boolean;
};

type Props = {
  node: RemoteNode;
  live?: LiveRecord;
  online: boolean;
  active: boolean;
  onDuplicate: () => void;
};

type ConnectionState = "connecting" | "waiting" | "connected" | "disconnected" | "error";
type SidePanel = "files" | "commands" | null;
type ContextMenuState = { x: number; y: number } | null;

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

function stateLabel(state: ConnectionState) {
  switch (state) {
    case "connected": return "已连接";
    case "waiting": return "等待 Agent";
    case "connecting": return "正在连接";
    case "error": return "连接失败";
    default: return "已断开";
  }
}

function isEditableElement(element: Element | null) {
  return element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable) ||
    Boolean(element?.closest('[role="dialog"]'));
}

export default function RemoteSession({ node, live, online, active, onDuplicate }: Props) {
  const { settings, loading: settingsLoading, error: settingsError } = useXtermjsSettings();
  const terminalHost = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const fileManager = useRef<FileManagerHandle>(null);
  const mobileCommandInput = useRef<HTMLInputElement>(null);
  const mobileComposing = useRef(false);
  const terminalTouch = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const activeRef = useRef(active);
  const [terminalReady, setTerminalReady] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [sidePanel, setSidePanel] = useState<SidePanel>(() => window.innerWidth >= 900 ? "files" : null);
  const [sideWidth, setSideWidth] = useState(400);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpCode, setOtpCode] = useState<string | undefined>();
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
      toast.info("请先选中终端内容");
      instance?.focus();
      return;
    }
    try {
      await writeClipboardText(instance.getSelection());
      instance.clearSelection();
    } catch {
      toast.error("浏览器未授权写入剪贴板");
    } finally {
      instance.focus();
    }
  }, []);

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
    host.addEventListener("paste", paste, true);
    host.addEventListener("contextmenu", contextMenu);
    setTerminalReady(true);
    return () => {
      compactLayout.removeEventListener("change", updateTerminalDensity);
      resizeObserver.disconnect();
      inputDisposable.dispose();
      host.removeEventListener("paste", paste, true);
      host.removeEventListener("contextmenu", contextMenu);
      instance.dispose();
      style.remove();
      terminal.current = null;
      fitAddon.current = null;
    };
  }, [copyTerminalSelection, node.uuid, resizeTerminal, sendTerminalText, settings, settingsError, settingsLoading]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const pageZoomed = Math.abs(viewport.scale - 1) > 0.01;
      setMobileKeyboardInset(pageZoomed ? 0 : Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
      if (!pageZoomed) resizeTerminal();
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
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
    let ws: WebSocket | undefined;

    const connect = async () => {
      setConnectionState("connecting");
      setConnectionError("");
      remoteReadyRef.current = false;
      setRemoteReady(false);
      try {
        const response = await fetch("/api/admin/client/remote/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid: node.uuid, ...(otpCode ? { "2fa_code": otpCode } : {}) }),
        });
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            setOtpOpen(true);
            setConnectionState("waiting");
            return;
          }
          throw new Error(payload?.message || "无法创建远程会话");
        }
        if (disposed) return;
        setOtpOpen(false);
        const sessionID = payload.data.session_id;
        const browserTicket = payload.data.browser_ticket;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${protocol}//${window.location.host}/api/admin/client/remote`);
        ws.binaryType = "arraybuffer";
        socket.current = ws;
        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: "auth", session_id: sessionID, ticket: browserTicket }));
          setConnectionState("waiting");
          heartbeat = window.setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "heartbeat", timestamp: Date.now() }));
            }
          }, 10_000);
        };
        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            terminal.current?.write(new Uint8Array(event.data));
            return;
          }
          try {
            const message = JSON.parse(event.data);
            if (message.type === "remote.ready") {
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
              remoteReadyRef.current = false;
              setRemoteReady(false);
              setConnectionState("error");
              setConnectionError(message.message || "远程连接失败");
              terminal.current?.writeln(`\r\n${message.message || "Remote connection failed"}`);
            } else if (message.type?.startsWith("file.")) {
              fileManager.current?.handleMessage(message);
            }
          } catch {
            terminal.current?.write(event.data);
          }
        };
        ws.onerror = () => {
          setConnectionState("error");
          setConnectionError("远程连接发生错误");
        };
        ws.onclose = () => {
          if (!disposed) {
            remoteReadyRef.current = false;
            setRemoteReady(false);
            setConnectionState((current) => current === "error" ? current : "disconnected");
            terminal.current?.writeln("\r\n远程连接已断开");
          }
        };
      } catch (error) {
        if (!disposed) {
          setConnectionState("error");
          setConnectionError(error instanceof Error ? error.message : "远程连接失败");
        }
      }
    };
    void connect();
    return () => {
      disposed = true;
      remoteReadyRef.current = false;
      if (heartbeat) window.clearInterval(heartbeat);
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) ws.close();
      if (socket.current === ws) socket.current = null;
    };
  }, [node.uuid, otpCode, reconnectKey, resizeTerminal, terminalReady]);

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
    setOtpCode(undefined);
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
            <span className={`remote-status is-${connectionState}`}><i />{stateLabel(connectionState)}</span>
          </div>
          <div className="remote-metrics">
            <span><small>CPU</small>{(live?.cpu.usage || 0).toFixed(1)}%</span>
            <span><small>内存</small>{percentage(live?.ram.used, node.mem_total)}</span>
            <span><small>硬盘</small>{percentage(live?.disk.used, node.disk_total)}</span>
            <span className="is-up"><small>实时上行</small>{formatBytes(live?.network.up || 0)}/s</span>
            <span className="is-down"><small>实时下行</small>{formatBytes(live?.network.down || 0)}/s</span>
          </div>
          <div className="remote-session-actions">
            <IconButton size="2" variant="ghost" title="复制选中内容" aria-label="复制选中内容" onClick={() => void copyTerminalSelection()}><ClipboardCopy size={16} /></IconButton>
            <IconButton size="2" variant="ghost" title="粘贴" aria-label="粘贴" disabled={!remoteReady} onClick={() => void pasteTerminalClipboard()}><ClipboardPaste size={16} /></IconButton>
            <IconButton size="2" variant="ghost" title="复制为独立标签" aria-label="复制为独立标签" onClick={onDuplicate}><Copy size={16} /></IconButton>
            <IconButton size="2" variant="ghost" title="重新连接" onClick={reconnect}><RotateCw size={16} /></IconButton>
            <Button size="1" variant={sidePanel === "files" ? "solid" : "soft"} onClick={() => togglePanel("files")}><Files size={15} />文件</Button>
            <Button size="1" variant={sidePanel === "commands" ? "solid" : "soft"} onClick={() => togglePanel("commands")}><ClipboardList size={15} />命令</Button>
            {sidePanel && <IconButton size="2" variant="ghost" title="关闭侧栏" onClick={() => setSidePanel(null)}><PanelRightClose size={16} /></IconButton>}
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
              onPointerDown={(event) => {
                if (event.pointerType === "mouse" || !event.isPrimary || !window.matchMedia("(pointer: coarse)").matches) return;
                terminalTouch.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  moved: false,
                };
              }}
              onPointerMove={(event) => {
                const touch = terminalTouch.current;
                if (!touch || touch.pointerId !== event.pointerId || touch.moved) return;
                if (Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) >= 8) touch.moved = true;
              }}
              onPointerUp={(event) => {
                const touch = terminalTouch.current;
                if (!touch || touch.pointerId !== event.pointerId) return;
                terminalTouch.current = null;
                if (!touch.moved) window.requestAnimationFrame(() => mobileCommandInput.current?.focus({ preventScroll: true }));
              }}
              onPointerCancel={() => { terminalTouch.current = null; }}
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
                placeholder="输入命令"
                aria-label="输入终端命令"
                enterKeyHint="send"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={!remoteReady}
                onChange={(event) => setMobileCommand(event.target.value)}
                onCompositionStart={() => { mobileComposing.current = true; }}
                onCompositionEnd={() => { mobileComposing.current = false; }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.nativeEvent.isComposing || mobileComposing.current || event.keyCode === 229)) {
                    event.stopPropagation();
                  }
                }}
              />
              <IconButton type="submit" size="2" aria-label="发送命令" disabled={!remoteReady || !mobileCommand}>
                <CornerDownLeft size={16} />
              </IconButton>
            </form>
            {(connectionState === "error" || connectionState === "disconnected") && (
              <div className="remote-reconnect">
                <span>{connectionError || "连接已断开"}</span>
                <Button size="1" onClick={reconnect}><RotateCw size={14} />重新连接</Button>
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

        <Dialog.Root open={otpOpen} onOpenChange={(open) => { if (!open) setOtpOpen(false); }}>
          <Dialog.Content maxWidth="400px">
            <Dialog.Title>双重身份验证</Dialog.Title>
            <Dialog.Description>请输入身份验证应用生成的动态口令。本次验证在 10 分钟内有效。</Dialog.Description>
            <TextField.Root type="text" inputMode="numeric" autoFocus value={otpInput} onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => {
              if (event.key === "Enter" && otpInput) { setOtpCode(otpInput); setOtpOpen(false); }
            }} />
            <div className="remote-dialog-actions"><Button variant="soft" onClick={() => setOtpOpen(false)}>取消</Button><Button disabled={!otpInput} onClick={() => { setOtpCode(otpInput); setOtpOpen(false); }}>连接</Button></div>
          </Dialog.Content>
        </Dialog.Root>

        <Dialog.Root open={manualPasteOpen} onOpenChange={setManualPasteOpen}>
          <Dialog.Content maxWidth="440px">
            <Dialog.Title>粘贴到终端</Dialog.Title>
            <TextArea autoFocus value={manualPasteText} onChange={(event) => setManualPasteText(event.target.value)} rows={7} />
            <div className="remote-dialog-actions">
              <Button variant="soft" onClick={() => setManualPasteOpen(false)}>取消</Button>
              <Button disabled={!manualPasteText} onClick={() => {
                if (sendTerminalText(manualPasteText)) {
                  setManualPasteOpen(false);
                  setManualPasteText("");
                  terminal.current?.focus();
                }
              }}>插入终端</Button>
            </div>
          </Dialog.Content>
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
            }}><ClipboardCopy size={15} />复制</button>
            <button type="button" role="menuitem" disabled={!remoteReady} onClick={() => {
              setContextMenu(null);
              void pasteTerminalClipboard();
            }}><ClipboardPaste size={15} />粘贴</button>
            <button type="button" role="menuitem" onClick={() => {
              terminal.current?.selectAll();
              setContextMenu(null);
            }}>全选</button>
          </div>
        )}

        {!online && connectionState !== "connected" && <span className="sr-only">节点当前离线</span>}
      </div>
    </TerminalContext.Provider>
  );
}
