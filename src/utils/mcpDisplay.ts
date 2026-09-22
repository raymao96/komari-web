export type MCPNodeRef = {
  uuid: string;
  name?: string;
  ipv4?: string;
  ipv6?: string;
};

function compactIPv6(value: string): string {
  if (value.length <= 22) return value;
  const segments = value.split(":");
  return segments.length > 3
    ? `${segments.slice(0, 2).join(":")}:...${segments[segments.length - 1]}`
    : value;
}

export function nodeDisplayIP(node?: MCPNodeRef | null): string {
  const ipv4 = node?.ipv4?.trim();
  if (ipv4) return ipv4;
  const ipv6 = node?.ipv6?.trim();
  if (!ipv6) return "";
  return compactIPv6(ipv6);
}

export function nodeDisplayName(node?: MCPNodeRef | null, fallback = "—"): string {
  const name = node?.name?.trim();
  if (name) return name;
  return nodeDisplayIP(node) || fallback;
}

export function nodeLookup(nodes: readonly MCPNodeRef[]): Map<string, MCPNodeRef> {
  const map = new Map<string, MCPNodeRef>();
  for (const node of nodes) map.set(node.uuid, node);
  return map;
}

export function nodeNameList(
  uuids: readonly string[],
  nodes: Map<string, MCPNodeRef>,
): string[] {
  return uuids.map((uuid) => nodeDisplayName(nodes.get(uuid)));
}

export function formatClockTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const ANSI_ESCAPE = /\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export function stripANSI(value: string): string {
  if (!value) return "";
  return value.replace(ANSI_ESCAPE, "").replace(/\r/g, "");
}

export function previewLine(preview?: string): string {
  const line = stripANSI(preview || "")
    .split("\n")
    .find((item) => item.trim());
  return line?.replace(/^\$\s*/, "").trim() || "";
}

export function formatClockDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function leaseDurationMinutes(createdAt: string, expiresAt: string): number {
  const created = Date.parse(createdAt);
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(created) || !Number.isFinite(expires) || expires <= created) {
    return 0;
  }
  return Math.max(1, Math.round((expires - created) / 60_000));
}

export function operationToolKey(toolName: string): "exec" | "file_read" | "file_write" | "file" | "terminal" | "grant" | "other" {
  const name = toolName.trim().toLowerCase();
  if (name === "exec") return "exec";
  if (name === "grant" || name === "authorize") return "grant";
  if (name.startsWith("terminal")) return "terminal";
  if (name.includes("file.read") || name === "file_read") return "file_read";
  if (name.includes("file.write") || name === "file_write") return "file_write";
  if (name.includes("file")) return "file";
  return "other";
}

export function operationResultKey(
  state: string,
  exitCode?: number,
): "success" | "running" | "failed" | "authorized" | "denied" {
  const normalized = state.trim().toLowerCase();
  if (normalized === "authorized" || normalized === "granted") return "authorized";
  if (normalized === "denied" || normalized === "rejected") return "denied";
  if (["running", "accepted", "cancel_requested"].includes(normalized)) return "running";
  if (["failed", "error", "expired", "cancelled", "canceled"].includes(normalized)) {
    return "failed";
  }
  if (normalized === "success" || normalized === "succeeded" || normalized === "completed") {
    return exitCode && exitCode !== 0 ? "failed" : "success";
  }
  if (typeof exitCode === "number" && exitCode !== 0) return "failed";
  return "success";
}

export function nodeSupportsMCP(node: {
  remote_control_enabled?: boolean;
  mcp_full?: boolean;
  mcp_full_version?: number;
}): boolean {
  return nodeMCPUnavailableReason(node) == null;
}

export function nodeMCPUnavailableReason(node: {
  remote_control_enabled?: boolean;
  mcp_full?: boolean;
  mcp_full_version?: number;
}): "remote_off" | "agent_old" | null {
  if (node.remote_control_enabled !== true) return "remote_off";
  if (node.mcp_full !== true || Number(node.mcp_full_version || 0) < 1) return "agent_old";
  return null;
}
