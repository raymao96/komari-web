import type { IDecoration, IMarker, Terminal } from "@xterm/xterm";

export type RemoteHighlightKind =
  | "mac"
  | "ipv4"
  | "ipv6"
  | "port"
  | "proto"
  | "listen"
  | "established"
  | "wait"
  | "closed"
  | "error"
  | "success"
  | "path"
  | "command";

export type RemoteHighlightSpan = {
  kind: RemoteHighlightKind;
  start: number;
  end: number;
};

export const REMOTE_HIGHLIGHT_COLORS: Record<RemoteHighlightKind, string> = {
  mac: "#E6C35C",
  ipv4: "#FF8000",
  ipv6: "#55FF55",
  port: "#0080FF",
  proto: "#00AAAA",
  listen: "#55FF55",
  established: "#55FFFF",
  wait: "#AAAA00",
  closed: "#FF5555",
  error: "#FF5555",
  success: "#55FF55",
  path: "#55FFFF",
  command: "#AAAA00",
};

const MAC_COLON_RE = /(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/g;
const MAC_DOTTED_RE = /\b[0-9A-Fa-f]{4}(?:\.[0-9A-Fa-f]{4}){2}\b/g;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?(?::(\d{1,5}))?\b/g;
const IPV6_RE = /(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6}|:(?::[0-9A-Fa-f]{1,4}){1,7}|::)(?:%[A-Za-z0-9._-]+)?(?:\/\d{1,3})?/g;
const IPV6_MAPPED_RE = /::ffff:(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,3})?/gi;
const BRACKET_IPV6_RE = /\[([0-9A-Fa-f:%.]+)\](?::(\d{1,5}))?/g;
const STAR_PORT_RE = /\*(:(\d{1,5}))\b/g;
const TRIPLE_COLON_PORT_RE = /::(:\d{1,5})\b/g;
const NAMED_PORT_RE = /\b(?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})(:(\d{1,5}))\b/g;
const EXPLICIT_PORT_RE = /(?:^|[\s])(?:-p|--port)[\s]+(\d{1,5})\b|\b(?:dpt|spt|dport|sport)[:\s]+(\d{1,5})\b/gi;
const PROTO_PORT_RE = /\b(tcp|udp)\/(\d{1,5})\b/gi;
const PROTO_RE = /(?<![\w./-])(?:HTTPS?|SFTP|FTPS?|SMTPS?|IMAPS?|POP3|DNS|TLS|SSL|ICMP|IGMP|ARP|DHCP|GRE|ESP|SSH|TCP|UDP)(?![\w.-])/gi;
const STATE_RE = /\b(?:LISTEN(?:ING)?|ESTABLISHED|ESTAB|TIME[-_]WAIT|CLOSE[-_]WAIT|SYN[-_]SENT|SYN[-_]RECV(?:ED)?|FIN[-_]WAIT[-_]?[12]|LAST[-_]ACK|CLOSING|CLOSED|UNCONN)\b/gi;
const ERROR_RE = /\b(?:fatal|segmentation fault|permission denied|undefined reference)\b|\berror:/gi;
const SUCCESS_RE = /\b(?:installed|loaded|accepted|connected|mounted|started)\b/gi;
const PATH_RE = /(?:\/(?:home|var|etc|usr|opt)\/\S+)/g;
const COMMAND_RE = /\b(?:sudo|yum|apt-get|docker|kubectl|systemctl)\b/gi;
const ZONE_OR_MASK_RE = /^(?:%[A-Za-z0-9._-]+)?(?:\/\d{1,3})?/;

function occupies(used: boolean[], start: number, end: number) {
  for (let index = start; index < end; index += 1) {
    if (used[index]) return true;
  }
  return false;
}

function mark(used: boolean[], start: number, end: number) {
  for (let index = start; index < end; index += 1) used[index] = true;
}

function pushSpan(spans: RemoteHighlightSpan[], used: boolean[], kind: RemoteHighlightKind, start: number, end: number) {
  if (end <= start || occupies(used, start, end)) return false;
  spans.push({ kind, start, end });
  mark(used, start, end);
  return true;
}

function validPort(value: string | undefined) {
  if (!value) return false;
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function validIpv4(value: string) {
  const host = value.split("/")[0].split(":")[0];
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const octet = Number(part);
    return octet >= 0 && octet <= 255;
  });
}

function looksLikeMac(value: string) {
  return /^(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(value);
}

function ipv6Host(value: string) {
  return value.split("/")[0].split("%")[0];
}

function pushRegex(
  text: string,
  used: boolean[],
  spans: RemoteHighlightSpan[],
  pattern: RegExp,
  kind: RemoteHighlightKind,
  refine?: (match: RegExpExecArray) => RemoteHighlightSpan[] | null,
) {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (end <= start || occupies(used, start, end)) continue;
    const refined = refine?.(match);
    if (refined) {
      for (const span of refined) pushSpan(spans, used, span.kind, span.start, span.end);
      continue;
    }
    pushSpan(spans, used, kind, start, end);
  }
}

function stateKind(value: string): RemoteHighlightKind {
  const token = value.toUpperCase().replace(/-/g, "_");
  if (token === "LISTEN" || token === "LISTENING") return "listen";
  if (token === "ESTABLISHED" || token === "ESTAB") return "established";
  if (token === "CLOSED" || token === "UNCONN") return "closed";
  return "wait";
}

function pushIpv4Match(match: RegExpExecArray): RemoteHighlightSpan[] {
  if (!validIpv4(match[0])) return [];
  const port = match[1];
  if (!validPort(port)) {
    const hostEnd = port
      ? match.index + match[0].length - `:${port}`.length
      : match.index + match[0].length;
    return [{ kind: "ipv4", start: match.index, end: hostEnd }];
  }
  const portStart = match.index + match[0].length - `:${port}`.length;
  return [
    { kind: "ipv4", start: match.index, end: portStart },
    { kind: "port", start: portStart, end: match.index + match[0].length },
  ];
}

function extendIpv6Groups(text: string, end: number) {
  let cursor = end;
  const head = /^[0-9A-Fa-f]{1,4}/.exec(text.slice(cursor));
  if (head) cursor += head[0].length;
  while (true) {
    const extra = /^:[0-9A-Fa-f]{1,4}/.exec(text.slice(cursor));
    if (!extra) break;
    cursor += extra[0].length;
  }
  return cursor;
}

function pushIpv6Match(text: string, used: boolean[], spans: RemoteHighlightSpan[], match: RegExpExecArray) {
  const start = match.index;
  let end = start + match[0].length;
  if (ipv6Host(match[0]) === "::") {
    const attached = /^:(\d{1,5})\b/.exec(text.slice(end));
    if (attached && validPort(attached[1])) {
      if (!pushSpan(spans, used, "ipv6", start, end)) return;
      pushSpan(spans, used, "port", end, end + attached[0].length);
      return;
    }
  }
  end = extendIpv6Groups(text, end);
  const extra = ZONE_OR_MASK_RE.exec(text.slice(end));
  if (extra?.[0]) end += extra[0].length;
  const host = ipv6Host(text.slice(start, end));
  if (looksLikeMac(host) || !host.includes(":")) return;
  if (!host.includes("::") && (host.match(/:/g) || []).length < 3) return;
  if (!pushSpan(spans, used, "ipv6", start, end)) return;
  const attached = /^:(\d{1,5})\b/.exec(text.slice(end));
  if (!attached || !validPort(attached[1])) return;
  pushSpan(spans, used, "port", end, end + attached[0].length);
}

export function collectRemoteTerminalHighlights(text: string): RemoteHighlightSpan[] {
  const used = Array.from({ length: text.length }, () => false);
  const spans: RemoteHighlightSpan[] = [];

  pushRegex(text, used, spans, MAC_COLON_RE, "mac");
  pushRegex(text, used, spans, MAC_DOTTED_RE, "mac");

  pushRegex(text, used, spans, BRACKET_IPV6_RE, "ipv6", (match) => {
    const inner = match[1];
    const host = ipv6Host(inner);
    if (!host.includes(":") || looksLikeMac(host)) return [];
    const contentStart = match.index + 1;
    const contentEnd = contentStart + inner.length;
    const port = match[2];
    const hits: RemoteHighlightSpan[] = [{ kind: "ipv6", start: contentStart, end: contentEnd }];
    if (validPort(port)) {
      const portStart = match.index + match[0].length - `:${port}`.length;
      hits.push({ kind: "port", start: portStart, end: match.index + match[0].length });
    }
    return hits;
  });

  pushRegex(text, used, spans, IPV6_MAPPED_RE, "ipv6");
  IPV6_RE.lastIndex = 0;
  let ipv6: RegExpExecArray | null;
  while ((ipv6 = IPV6_RE.exec(text))) {
    pushIpv6Match(text, used, spans, ipv6);
  }

  pushRegex(text, used, spans, IPV4_RE, "ipv4", pushIpv4Match);
  pushRegex(text, used, spans, TRIPLE_COLON_PORT_RE, "port", (match) => {
    const portText = match[1];
    const port = portText.slice(1);
    if (!validPort(port)) return [];
    const portStart = match.index + 2;
    return [{ kind: "port", start: portStart, end: portStart + portText.length }];
  });
  pushRegex(text, used, spans, STAR_PORT_RE, "port", (match) => {
    const port = match[2];
    if (!validPort(port)) return [];
    const portStart = match.index + 1;
    return [{ kind: "port", start: portStart, end: match.index + match[0].length }];
  });
  pushRegex(text, used, spans, NAMED_PORT_RE, "port", (match) => {
    const port = match[2];
    if (!validPort(port)) return [];
    const portStart = match.index + match[0].length - `:${port}`.length;
    return [{ kind: "port", start: portStart, end: match.index + match[0].length }];
  });
      EXPLICIT_PORT_RE.lastIndex = 0;
      let named: RegExpExecArray | null;
      while ((named = EXPLICIT_PORT_RE.exec(text))) {
        const port = named[1] || named[2];
        if (!validPort(port)) continue;
        const portStart = named.index + named[0].lastIndexOf(port);
        pushSpan(spans, used, "port", portStart, portStart + port.length);
      }
  pushRegex(text, used, spans, PROTO_PORT_RE, "proto", (match) => {
    const port = match[2];
    if (!validPort(port)) return [];
    const slash = match.index + match[1].length;
    return [
      { kind: "proto", start: match.index, end: slash },
      { kind: "port", start: slash + 1, end: match.index + match[0].length },
    ];
  });
  pushRegex(text, used, spans, STATE_RE, "wait", (match) => [
    { kind: stateKind(match[0]), start: match.index, end: match.index + match[0].length },
  ]);
  pushRegex(text, used, spans, PROTO_RE, "proto");

  pushRegex(text, used, spans, ERROR_RE, "error");
  pushRegex(text, used, spans, SUCCESS_RE, "success");
  pushRegex(text, used, spans, PATH_RE, "path");
  pushRegex(text, used, spans, COMMAND_RE, "command");
  return spans.sort((left, right) => left.start - right.start);
}

type LineHighlight = {
  fingerprint: string;
  items: Array<{ marker: IMarker; decoration: IDecoration }>;
};

function disposeLineHighlight(group: LineHighlight) {
  for (const item of group.items) {
    item.decoration.dispose();
    item.marker.dispose();
  }
  group.items.length = 0;
}

export function attachRemoteTerminalHighlight(terminal: Terminal) {
  const byLine = new Map<number, LineHighlight>();
  let trackedLength = 0;

  const clear = () => {
    for (const group of byLine.values()) disposeLineHighlight(group);
    byLine.clear();
    trackedLength = 0;
  };

  const relocate = () => {
    const next = new Map<number, LineHighlight>();
    for (const group of byLine.values()) {
      const items = group.items.filter((item) => !item.marker.isDisposed && item.marker.line >= 0);
      if (!items.length) {
        disposeLineHighlight(group);
        continue;
      }
      const line = items[0].marker.line;
      const existing = next.get(line);
      if (existing) {
        existing.items.push(...items);
        continue;
      }
      next.set(line, { fingerprint: group.fingerprint, items });
    }
    byLine.clear();
    for (const [line, group] of next) byLine.set(line, group);
  };

  const decorateLine = (lineIndex: number, cursorLine: number, text: string) => {
    const items: LineHighlight["items"] = [];
    for (const hit of collectRemoteTerminalHighlights(text)) {
      const marker = terminal.registerMarker(lineIndex - cursorLine);
      if (!marker) continue;
      let decoration: IDecoration | undefined;
      try {
        decoration = terminal.registerDecoration({
          marker,
          x: hit.start,
          width: hit.end - hit.start,
          foregroundColor: REMOTE_HIGHLIGHT_COLORS[hit.kind],
          layer: "top",
        });
      } catch {
        marker.dispose();
        continue;
      }
      if (!decoration) {
        marker.dispose();
        continue;
      }
      items.push({ marker, decoration });
    }
    byLine.set(lineIndex, { fingerprint: text, items });
  };

  const decorateIndex = (lineIndex: number) => {
    const buffer = terminal.buffer.active;
    if (lineIndex < 0 || lineIndex >= buffer.length) return;
    const line = buffer.getLine(lineIndex);
    if (!line) return;
    const text = line.translateToString(true);
    const existing = byLine.get(lineIndex);
    if (existing?.fingerprint === text) return;
    if (existing) {
      disposeLineHighlight(existing);
      byLine.delete(lineIndex);
    }
    decorateLine(lineIndex, buffer.baseY + buffer.cursorY, text);
  };

  const catchUp = () => {
    const buffer = terminal.buffer.active;
    if (buffer.length < trackedLength) relocate();
    const cursorLine = buffer.baseY + buffer.cursorY;
    const start = Math.min(Math.max(0, trackedLength - 1), buffer.length);
    for (let lineIndex = start; lineIndex < buffer.length; lineIndex += 1) {
      decorateIndex(lineIndex);
    }
    decorateIndex(cursorLine);
    trackedLength = buffer.length;
  };

  const feedDisposable = terminal.onLineFeed(() => {
    const buffer = terminal.buffer.active;
    const cursorLine = buffer.baseY + buffer.cursorY;
    decorateIndex(cursorLine - 1);
    decorateIndex(cursorLine);
    trackedLength = Math.max(trackedLength, buffer.length);
  });
  const writeDisposable = terminal.onWriteParsed(catchUp);
  const resizeDisposable = terminal.onResize(() => {
    clear();
    catchUp();
  });
  catchUp();

  return () => {
    feedDisposable.dispose();
    writeDisposable.dispose();
    resizeDisposable.dispose();
    clear();
  };
}
