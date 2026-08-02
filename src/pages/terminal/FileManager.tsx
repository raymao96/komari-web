import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  ClipboardPaste,
  Copy,
  Download,
  File as FileIcon,
  FilePlus2,
  Folder,
  FolderPlus,
  HardDrive,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Dialog, IconButton, TextField } from "@radix-ui/themes";
import { toast } from "sonner";
import { formatBytes } from "@/utils/unitHelper";

export type FileEntry = {
  name: string;
  path: string;
  size: number;
  mode: string;
  modified_at: string;
  directory: boolean;
  symlink: boolean;
  hidden: boolean;
  protected: boolean;
};

type FileResponse = {
  type: string;
  id: string;
  operation?: string;
  ok?: boolean;
  error?: string;
  data?: any;
  name?: string;
  size?: number;
};

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  timeout: number;
};

type DownloadState = {
  name: string;
  size: number;
  received: number;
  chunks: Uint8Array[];
};

type FileContextMenuState = {
  x: number;
  y: number;
};

type SelectionBoxState = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type SelectionDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startClientX: number;
  startClientY: number;
  base: Set<string>;
  moved: boolean;
};

export type FileManagerHandle = {
  handleMessage: (message: FileResponse) => void;
  initialize: (roots: string[], home: string, separator: string) => void;
  refresh: () => void;
};

type Props = {
  send: (message: Record<string, unknown>) => boolean;
  connected: boolean;
};

const requestTimeout = 30_000;
const uploadChunkSize = 256 * 1024;

function joinRemotePath(base: string, name: string, separator: string) {
  if (!base) return name;
  if (base.endsWith(separator)) return `${base}${name}`;
  return `${base}${separator}${name}`;
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function nextCopyName(entry: FileEntry, reservedNames: Set<string>) {
  const dot = entry.directory ? -1 : entry.name.lastIndexOf(".");
  const hasExtension = dot > 0;
  const stem = hasExtension ? entry.name.slice(0, dot) : entry.name;
  const extension = hasExtension ? entry.name.slice(dot) : "";
  for (let index = 1; index < 10_000; index += 1) {
    const suffix = index === 1 ? " - 副本" : ` - 副本 (${index})`;
    const candidate = `${stem}${suffix}${extension}`;
    if (!reservedNames.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${stem} - 副本-${Date.now()}${extension}`;
}

const FileManager = forwardRef<FileManagerHandle, Props>(({ send, connected }, ref) => {
  const pending = useRef(new Map<string, PendingRequest>());
  const downloads = useRef(new Map<string, DownloadState>());
  const [roots, setRoots] = useState<string[]>([]);
  const [separator, setSeparator] = useState("/");
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [createKind, setCreateKind] = useState<"file" | "folder" | null>(null);
  const [createName, setCreateName] = useState("");
  const [renameEntry, setRenameEntry] = useState<FileEntry | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferLabel, setTransferLabel] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [pendingOverwriteFiles, setPendingOverwriteFiles] = useState<File[] | null>(null);
  const [copiedEntries, setCopiedEntries] = useState<FileEntry[]>([]);
  const [contextMenu, setContextMenu] = useState<FileContextMenuState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const lastDirectoryClick = useRef<{ path: string; time: number } | null>(null);
  const selectionAnchor = useRef<string | null>(null);
  const selectionDrag = useRef<SelectionDragState | null>(null);
  const suppressClick = useRef(false);

  const request = (type: string, payload: Record<string, unknown> = {}) => {
    const id = crypto.randomUUID();
    return new Promise<any>((resolve, reject) => {
      if (!send({ type, id, ...payload })) {
        reject(new Error("远程连接尚未就绪"));
        return;
      }
      const timeout = window.setTimeout(() => {
        const waiting = pending.current.get(id);
        if (waiting) {
          pending.current.delete(id);
          waiting.reject(new Error("文件操作超时"));
        }
      }, requestTimeout);
      pending.current.set(id, { resolve, reject, timeout });
    });
  };

  const load = async (path = currentPath) => {
    if (!path) return;
    setLoading(true);
    try {
      const data = await request("file.list", { path });
      setCurrentPath(data.path);
      setPathInput(data.path);
      setParentPath(data.parent || "");
      setRoots(data.roots || roots);
      setEntries(data.entries || []);
      setSelected(new Set());
      selectionAnchor.current = null;
      setContextMenu(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "目录加载失败");
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleMessage(message) {
      if (message.type === "file.response") {
        const waiting = pending.current.get(message.id);
        if (!waiting) return;
        pending.current.delete(message.id);
        window.clearTimeout(waiting.timeout);
        if (message.ok) waiting.resolve(message.data);
        else waiting.reject(new Error(message.error || "文件操作失败"));
        return;
      }
      if (message.type === "file.download.begin") {
        downloads.current.set(message.id, {
          name: message.name || "download",
          size: message.size || 0,
          received: 0,
          chunks: [],
        });
        setTransferLabel(`正在下载 ${message.name || "文件"}`);
        return;
      }
      if (message.type === "file.download.chunk") {
        const download = downloads.current.get(message.id);
        if (!download || typeof (message as any).data !== "string") return;
        const chunk = fromBase64((message as any).data);
        download.chunks.push(chunk);
        download.received += chunk.byteLength;
        setTransferLabel(`正在下载 ${download.name} ${Math.round((download.received / Math.max(1, download.size)) * 100)}%`);
        return;
      }
      if (message.type === "file.download.end") {
        const download = downloads.current.get(message.id);
        if (!download) return;
        downloads.current.delete(message.id);
        const blob = new Blob(download.chunks as BlobPart[]);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = download.name;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setTransferLabel("");
        toast.success(`${download.name} 下载完成`);
        return;
      }
      if (message.type === "file.download.error") {
        downloads.current.delete(message.id);
        setTransferLabel("");
        toast.error((message as any).error || "下载失败");
      }
    },
    initialize(nextRoots, home, nextSeparator) {
      setRoots(nextRoots);
      setSeparator(nextSeparator || "/");
      void load(home || nextRoots[0]);
    },
    refresh() {
      void load();
    },
  }));

  useEffect(() => () => {
    for (const waiting of pending.current.values()) {
      window.clearTimeout(waiting.timeout);
      waiting.reject(new Error("远程连接已关闭"));
    }
    pending.current.clear();
    downloads.current.clear();
  }, []);

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

  const visibleEntries = useMemo(
    () => entries.filter((entry) => showHidden || !entry.hidden),
    [entries, showHidden],
  );
  const selectedEntries = entries.filter((entry) => selected.has(entry.path));
  const actionableEntries = selectedEntries.filter((entry) => !entry.protected);

  const toggleSelected = (entry: FileEntry) => {
    if (entry.protected) return;
    selectionAnchor.current = entry.path;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(entry.path)) next.delete(entry.path);
      else next.add(entry.path);
      return next;
    });
  };

  const selectEntry = (entry: FileEntry, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (entry.protected || suppressClick.current || (event.target as HTMLElement).closest("input, button")) return;
    const visibleIndex = visibleEntries.findIndex((item) => item.path === entry.path);
    const anchorIndex = visibleEntries.findIndex((item) => item.path === selectionAnchor.current);
    if (event.shiftKey && anchorIndex >= 0 && visibleIndex >= 0) {
      const start = Math.min(anchorIndex, visibleIndex);
      const end = Math.max(anchorIndex, visibleIndex);
      setSelected((current) => {
        const next = event.ctrlKey || event.metaKey ? new Set(current) : new Set<string>();
        for (const item of visibleEntries.slice(start, end + 1)) {
          if (!item.protected) next.add(item.path);
        }
        return next;
      });
      return;
    }
    selectionAnchor.current = entry.path;
    if (event.ctrlKey || event.metaKey) {
      toggleSelected(entry);
    } else {
      setSelected(new Set([entry.path]));
    }
  };

  const showContextMenu = (event: React.MouseEvent, entry?: FileEntry) => {
    event.preventDefault();
    event.stopPropagation();
    if (entry?.protected) {
      setSelected(new Set());
      selectionAnchor.current = null;
    } else if (entry && !selected.has(entry.path)) {
      setSelected(new Set([entry.path]));
      selectionAnchor.current = entry.path;
    } else if (!entry) {
      setSelected(new Set());
      selectionAnchor.current = null;
    }
    setContextMenu({
      x: Math.max(4, Math.min(event.clientX, window.innerWidth - 196)),
      y: Math.max(4, Math.min(event.clientY, window.innerHeight - 274)),
    });
  };

  const copySelected = () => {
    if (!actionableEntries.length) return;
    setCopiedEntries(actionableEntries);
    setContextMenu(null);
    toast.success(`已复制 ${actionableEntries.length} 个项目`);
  };

  const pasteCopied = async () => {
    if (!copiedEntries.length || !currentPath) return;
    setContextMenu(null);
    const reservedNames = new Set(entries.map((entry) => entry.name.toLocaleLowerCase()));
    let copied = 0;
    try {
      for (const entry of copiedEntries) {
        let name = entry.name;
        if (reservedNames.has(name.toLocaleLowerCase())) name = nextCopyName(entry, reservedNames);
        reservedNames.add(name.toLocaleLowerCase());
        setTransferLabel(`正在复制 ${entry.name}`);
        await request("file.copy", {
          path: entry.path,
          destination: joinRemotePath(currentPath, name, separator),
        });
        copied += 1;
      }
      await load();
      toast.success(`已粘贴 ${copied} 个项目`);
    } catch (error) {
      if (copied > 0) await load();
      toast.error(error instanceof Error ? error.message : "粘贴失败");
    } finally {
      setTransferLabel("");
    }
  };

  const createEntry = async () => {
    if (!createKind || !createName.trim()) return;
    try {
      await request(createKind === "folder" ? "file.mkdir" : "file.create", {
        path: joinRemotePath(currentPath, createName.trim(), separator),
      });
      setCreateKind(null);
      setCreateName("");
      await load();
      toast.success(createKind === "folder" ? "文件夹已创建" : "文件已创建");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  const rename = async () => {
    if (!renameEntry || !renameName.trim()) return;
    try {
      await request("file.rename", {
        path: renameEntry.path,
        destination: joinRemotePath(currentPath, renameName.trim(), separator),
      });
      setRenameEntry(null);
      await load();
      toast.success("重命名完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重命名失败");
    }
  };

  const removeSelected = async () => {
    try {
      for (const entry of actionableEntries) {
        await request("file.delete", { path: entry.path, recursive: entry.directory });
      }
      setDeleteOpen(false);
      await load();
      toast.success("删除完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const downloadSelected = () => {
    setContextMenu(null);
    for (const entry of actionableEntries.filter((item) => !item.directory && !item.symlink)) {
      const id = crypto.randomUUID();
      if (!send({ type: "file.download", id, path: entry.path })) {
        toast.error("远程连接尚未就绪");
        return;
      }
    }
  };

  const uploadFiles = async (files: File[], allowOverwrite: boolean) => {
    if (!files.length) return;
    try {
      for (const file of files) {
        setTransferLabel(`正在上传 ${file.name} 0%`);
        const start = await request("file.upload.start", {
          path: joinRemotePath(currentPath, file.name, separator),
          size: file.size,
          overwrite: allowOverwrite,
        });
        const uploadID = start.upload_id;
        let sent = 0;
        while (sent < file.size) {
          const buffer = await file.slice(sent, sent + uploadChunkSize).arrayBuffer();
          await request("file.upload.chunk", {
            upload_id: uploadID,
            data: toBase64(buffer),
          });
          sent += buffer.byteLength;
          setTransferLabel(`正在上传 ${file.name} ${Math.round((sent / Math.max(1, file.size)) * 100)}%`);
        }
        await request("file.upload.finish", { upload_id: uploadID });
        toast.success(`${file.name} 上传完成`);
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setTransferLabel("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const queueUpload = (files: File[]) => {
    if (!connected || !currentPath || !files.length) return;
    const existing = new Set(entries.map((entry) => entry.name.toLocaleLowerCase()));
    const hasConflict = files.some((file) => existing.has(file.name.toLocaleLowerCase()));
    if (hasConflict && !overwrite) {
      setPendingOverwriteFiles(files);
      return;
    }
    void uploadFiles(files, overwrite);
  };

  const hasDraggedDirectory = (items: DataTransferItemList) => Array.from(items).some((item) => {
    const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => { isDirectory?: boolean } | null }).webkitGetAsEntry?.();
    return entry?.isDirectory === true;
  });

  const handleDragEnter = (event: React.DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDropActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDropActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDropActive(false);
    if (!connected) return;
    if (hasDraggedDirectory(event.dataTransfer.items)) {
      toast.error("暂不支持拖拽上传文件夹");
      return;
    }
    queueUpload(Array.from(event.dataTransfer.files));
  };

  const handleEntryClick = (entry: FileEntry, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (suppressClick.current) return;
    event.currentTarget.focus({ preventScroll: true });
    selectEntry(entry, event);
    if (!entry.directory || event.shiftKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest("input, button")) return;
    const now = window.performance.now();
    const previous = lastDirectoryClick.current;
    if (previous?.path === entry.path && now - previous.time <= 500) {
      lastDirectoryClick.current = null;
      event.preventDefault();
      event.stopPropagation();
      void load(entry.path);
      return;
    }

    lastDirectoryClick.current = { path: entry.path, time: now };
  };

  const beginSelectionDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0 ||
      (event.target as HTMLElement).closest("input, button, select, textarea, .remote-file-context-menu")) return;
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    selectionDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX - rect.left + wrap.scrollLeft,
      startY: event.clientY - rect.top + wrap.scrollTop,
      startClientX: event.clientX,
      startClientY: event.clientY,
      base: event.ctrlKey || event.metaKey ? new Set(selected) : new Set<string>(),
      moved: false,
    };
  };

  const moveSelectionDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDrag.current;
    const wrap = tableWrapRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !wrap) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) < 5) return;
    if (!drag.moved) wrap.setPointerCapture(event.pointerId);
    drag.moved = true;
    event.preventDefault();
    lastDirectoryClick.current = null;
    const wrapRect = wrap.getBoundingClientRect();
    const edge = 28;
    if (event.clientY < wrapRect.top + edge) wrap.scrollTop = Math.max(0, wrap.scrollTop - 12);
    else if (event.clientY > wrapRect.bottom - edge) wrap.scrollTop += 12;
    const currentX = event.clientX - wrapRect.left + wrap.scrollLeft;
    const currentY = event.clientY - wrapRect.top + wrap.scrollTop;
    const box = {
      left: Math.min(drag.startX, currentX),
      top: Math.min(drag.startY, currentY),
      width: Math.abs(currentX - drag.startX),
      height: Math.abs(currentY - drag.startY),
    };
    setSelectionBox(box);
    const next = new Set(drag.base);
    const boxRight = box.left + box.width;
    const boxBottom = box.top + box.height;
    for (const row of wrap.querySelectorAll<HTMLTableRowElement>("tr[data-file-path]")) {
      if (row.dataset.protected === "true") continue;
      const rowRect = row.getBoundingClientRect();
      const left = rowRect.left - wrapRect.left + wrap.scrollLeft;
      const top = rowRect.top - wrapRect.top + wrap.scrollTop;
      if (left <= boxRight && left + rowRect.width >= box.left && top <= boxBottom && top + rowRect.height >= box.top) {
        const path = row.dataset.filePath;
        if (path) next.add(path);
      }
    }
    setSelected(next);
  };

  const endSelectionDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDrag.current;
    const wrap = tableWrapRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !wrap) return;
    if (wrap.hasPointerCapture(event.pointerId)) wrap.releasePointerCapture(event.pointerId);
    selectionDrag.current = null;
    setSelectionBox(null);
    if (drag.moved) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    }
  };

  return (
    <section
      className={`remote-files${dropActive ? " is-drop-active" : ""}`}
      aria-label="文件管理"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = connected ? "copy" : "none";
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="remote-files-title">
        <div>
          <strong>文件管理</strong>
          <span>{connected ? "已连接" : "未连接"}</span>
        </div>
        <IconButton size="1" variant="ghost" title="刷新" onClick={() => void load()} disabled={!connected || loading}>
          <RefreshCw size={15} className={loading ? "remote-spin" : ""} />
        </IconButton>
      </div>

      <div className="remote-file-path">
        <IconButton size="1" variant="soft" title="上一级" disabled={!parentPath} onClick={() => void load(parentPath)}>
          <ArrowUp size={15} />
        </IconButton>
        <select disabled={!connected} value={roots.includes(currentPath) ? currentPath : ""} onChange={(event) => event.target.value && void load(event.target.value)} title="磁盘或根目录">
          <option value="">根目录</option>
          {roots.map((root) => <option key={root} value={root}>{root}</option>)}
        </select>
        <TextField.Root
          size="1"
          disabled={!connected}
          value={pathInput}
          onChange={(event) => setPathInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void load(pathInput)}
        />
      </div>

      <div className="remote-file-toolbar">
        <input ref={inputRef} type="file" multiple hidden onChange={(event) => queueUpload(Array.from(event.target.files || []))} />
        <Button size="1" variant="soft" onClick={() => inputRef.current?.click()} disabled={!connected}>
          <Upload size={14} /> 上传
        </Button>
        <IconButton size="1" variant="soft" title="新建文件" disabled={!connected} onClick={() => setCreateKind("file")}><FilePlus2 size={14} /></IconButton>
        <IconButton size="1" variant="soft" title="新建文件夹" disabled={!connected} onClick={() => setCreateKind("folder")}><FolderPlus size={14} /></IconButton>
        <IconButton size="1" variant="soft" title="下载" disabled={!actionableEntries.some((entry) => !entry.directory && !entry.symlink)} onClick={downloadSelected}><Download size={14} /></IconButton>
        <IconButton size="1" variant="soft" title="重命名" disabled={actionableEntries.length !== 1} onClick={() => {
          const entry = actionableEntries[0];
          if (entry) { setRenameEntry(entry); setRenameName(entry.name); }
        }}><Pencil size={14} /></IconButton>
        <IconButton size="1" color="red" variant="soft" title="删除" disabled={actionableEntries.length === 0} onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></IconButton>
      </div>

      <div className="remote-file-options">
        <label><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} /> 显示隐藏文件</label>
        <label><input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} /> 覆盖同名文件</label>
      </div>

      {transferLabel && <div className="remote-transfer-status">{transferLabel}</div>}

      {dropActive && connected && (
        <div className="remote-file-drop-overlay" aria-hidden="true">
          <Upload size={24} />
          <strong>释放以上传到当前目录</strong>
        </div>
      )}

      <div
        ref={tableWrapRef}
        className={`remote-file-table-wrap${selectionBox ? " is-selecting" : ""}`}
        onPointerDown={beginSelectionDrag}
        onPointerMove={moveSelectionDrag}
        onPointerUp={endSelectionDrag}
        onPointerCancel={endSelectionDrag}
        onContextMenu={(event) => {
          if (!(event.target as HTMLElement).closest("tr[data-file-path]")) showContextMenu(event);
        }}
      >
        {selectionBox && <div className="remote-file-selection-box" style={selectionBox} aria-hidden="true" />}
        <table className="remote-file-table">
          <thead><tr><th aria-label="选择" /><th>名称</th><th>大小</th><th>修改时间</th></tr></thead>
          <tbody>
            {visibleEntries.map((entry) => (
              <tr
                key={entry.path}
                data-file-path={entry.path}
                data-protected={entry.protected ? "true" : "false"}
                className={`${entry.protected ? "is-protected" : ""}${entry.directory ? " is-directory" : ""}${selected.has(entry.path) ? " is-selected" : ""}`}
                tabIndex={0}
                onClick={(event) => handleEntryClick(entry, event)}
                onContextMenu={(event) => showContextMenu(event, entry)}
                onKeyDown={(event) => {
                  if (entry.directory && event.key === "Enter") {
                    event.preventDefault();
                    void load(entry.path);
                  }
                }}
              >
                <td><input type="checkbox" checked={selected.has(entry.path)} disabled={entry.protected} onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(entry)} /></td>
                <td title={entry.protected ? "SQLite 数据库已受保护" : undefined}>
                  {entry.protected ? <LockKeyhole size={15} /> : entry.directory ? <Folder size={15} /> : <FileIcon size={15} />}
                  <span>{entry.name}</span>
                </td>
                <td>{entry.directory ? "-" : formatBytes(entry.size)}</td>
                <td>{formatDate(entry.modified_at)}</td>
              </tr>
            ))}
            {!loading && visibleEntries.length === 0 && <tr><td colSpan={4} className="remote-file-empty"><HardDrive size={18} /> 当前目录为空</td></tr>}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          className="remote-file-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" disabled={!connected} onClick={() => {
            setContextMenu(null);
            setCreateName("");
            setCreateKind("file");
          }}><FilePlus2 size={15} />新建文件</button>
          <button type="button" role="menuitem" disabled={!connected} onClick={() => {
            setContextMenu(null);
            setCreateName("");
            setCreateKind("folder");
          }}><FolderPlus size={15} />新建文件夹</button>
          <div className="remote-file-context-separator" role="separator" />
          <button type="button" role="menuitem" disabled={actionableEntries.length === 0} onClick={copySelected}>
            <Copy size={15} />复制
          </button>
          <button type="button" role="menuitem" disabled={!connected || !currentPath || copiedEntries.length === 0} onClick={() => void pasteCopied()}>
            <ClipboardPaste size={15} />粘贴
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!actionableEntries.some((entry) => !entry.directory && !entry.symlink)}
            onClick={downloadSelected}
          >
            <Download size={15} />下载所选文件
          </button>
          <button type="button" role="menuitem" disabled={actionableEntries.length !== 1} onClick={() => {
            const entry = actionableEntries[0];
            if (!entry) return;
            setContextMenu(null);
            setRenameEntry(entry);
            setRenameName(entry.name);
          }}><Pencil size={15} />重命名</button>
          <div className="remote-file-context-separator" role="separator" />
          <button type="button" className="is-danger" role="menuitem" disabled={actionableEntries.length === 0} onClick={() => {
            setContextMenu(null);
            setDeleteOpen(true);
          }}><Trash2 size={15} />删除</button>
        </div>
      )}

      <Dialog.Root open={createKind !== null} onOpenChange={(open) => !open && setCreateKind(null)}>
        <Dialog.Content maxWidth="380px">
          <Dialog.Title>{createKind === "folder" ? "新建文件夹" : "新建文件"}</Dialog.Title>
          <TextField.Root autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void createEntry()} />
          <div className="remote-dialog-actions"><Button variant="soft" onClick={() => setCreateKind(null)}>取消</Button><Button onClick={() => void createEntry()}>创建</Button></div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={renameEntry !== null} onOpenChange={(open) => !open && setRenameEntry(null)}>
        <Dialog.Content maxWidth="380px">
          <Dialog.Title>重命名</Dialog.Title>
          <TextField.Root autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void rename()} />
          <div className="remote-dialog-actions"><Button variant="soft" onClick={() => setRenameEntry(null)}>取消</Button><Button onClick={() => void rename()}>保存</Button></div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>删除所选项目</Dialog.Title>
          <Dialog.Description>将永久删除 {actionableEntries.length} 个项目，文件夹会连同内容一起删除。</Dialog.Description>
          <div className="remote-dialog-actions"><Button variant="soft" onClick={() => setDeleteOpen(false)}>取消</Button><Button color="red" onClick={() => void removeSelected()}>删除</Button></div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={pendingOverwriteFiles !== null} onOpenChange={(open) => !open && setPendingOverwriteFiles(null)}>
        <Dialog.Content maxWidth="430px">
          <Dialog.Title>覆盖同名文件</Dialog.Title>
          <Dialog.Description>所选文件中存在与当前目录同名的文件。继续后将覆盖同名文件，其余文件正常上传。</Dialog.Description>
          <div className="remote-dialog-actions">
            <Button variant="soft" onClick={() => setPendingOverwriteFiles(null)}>取消</Button>
            <Button onClick={() => {
              const files = pendingOverwriteFiles || [];
              setPendingOverwriteFiles(null);
              void uploadFiles(files, true);
            }}>覆盖并上传</Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </section>
  );
});

FileManager.displayName = "FileManager";

export default FileManager;
