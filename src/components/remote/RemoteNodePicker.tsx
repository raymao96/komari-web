import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Layers3,
  Network,
  Search,
  SearchX,
  SquareTerminal,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Flag from "@/components/Flag";
import {
  displayRemoteAddress,
  filterRemoteNodes,
  orderRemoteNodes,
  paginateRemoteNodes,
  type RemoteNodePickerItem,
  type RemoteNodeStatusFilter,
} from "@/utils/remoteNodePicker";
import "./RemoteNodePicker.css";

type RemoteNodePickerProps<T extends RemoteNodePickerItem> = {
  nodes: readonly T[];
  onlineSet: ReadonlySet<string>;
  selectedUUID?: string;
  pageSize?: number;
  rowsPerPage?: number;
  onSelect: (node: T) => void;
};

export default function RemoteNodePicker<T extends RemoteNodePickerItem>({
  nodes,
  onlineSet,
  selectedUUID,
  pageSize = 16,
  rowsPerPage,
  onSelect,
}: RemoteNodePickerProps<T>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RemoteNodeStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [responsivePageSize, setResponsivePageSize] = useState(pageSize);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsGridRef = useRef<HTMLDivElement>(null);
  const searchID = useId();
  const orderedNodes = useMemo(() => orderRemoteNodes(nodes), [nodes]);
  const filteredNodes = useMemo(
    () => filterRemoteNodes(orderedNodes, query, status, onlineSet),
    [onlineSet, orderedNodes, query, status],
  );
  const onlineCount = useMemo(
    () => nodes.filter((node) => onlineSet.has(node.uuid)).length,
    [nodes, onlineSet],
  );
  const offlineCount = nodes.length - onlineCount;
  const noMatches = nodes.length > 0 && filteredNodes.length === 0;
  const hasResults = filteredNodes.length > 0;
  const effectivePageSize = rowsPerPage ? responsivePageSize : pageSize;
  const nodePage = useMemo(
    () => paginateRemoteNodes(filteredNodes, page, effectivePageSize),
    [effectivePageSize, filteredNodes, page],
  );
  const { currentPage, totalPages, nodes: visibleNodes } = nodePage;

  useEffect(() => {
    if (!rowsPerPage || !hasResults || !resultsGridRef.current) return;

    const grid = resultsGridRef.current;
    const updatePageSize = () => {
      const columns = window
        .getComputedStyle(grid)
        .gridTemplateColumns
        .trim()
        .split(/\s+/)
        .filter((track) => track && track !== "none").length;
      const nextPageSize = Math.max(1, columns) * rowsPerPage;
      setResponsivePageSize((current) =>
        current === nextPageSize ? current : nextPageSize,
      );
    };

    updatePageSize();
    const observer = new ResizeObserver(updatePageSize);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [hasResults, rowsPerPage]);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t("copy_success"));
    } catch {
      // Clipboard access can be unavailable outside a secure browser context.
    }
  };

  return (
    <div className="remote-node-picker">
      <div className="remote-node-picker-controls">
        <div className="remote-node-picker-search">
          <Search size={16} aria-hidden="true" />
          <label className="remote-node-picker-sr-only" htmlFor={searchID}>
            {t("terminal.search_placeholder")}
          </label>
          <input
            id={searchID}
            ref={searchRef}
            type="search"
            value={query}
            placeholder={t("terminal.search_placeholder")}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          {query ? (
            <button
              type="button"
              aria-label={t("terminal.clear_search")}
              onClick={() => {
                setQuery("");
                setPage(1);
                searchRef.current?.focus();
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="remote-node-picker-filter" role="group" aria-label={t("terminal.status_filter")}>
          {([
            ["all", t("common.all"), nodes.length],
            ["online", t("nodeCard.online"), onlineCount],
            ["offline", t("nodeCard.offline"), offlineCount],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              className={status === value ? "is-selected" : undefined}
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label} <span>{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="remote-node-picker-results">
        {filteredNodes.length > 0 ? (
          <div ref={resultsGridRef} className="remote-node-picker-grid">
          {visibleNodes.map((node) => {
            const online = onlineSet.has(node.uuid);
            const selected = selectedUUID === node.uuid;
            const flag = node.region_override?.trim() || node.region?.trim() || "UN";
            const ipv4 = displayRemoteAddress(node.ipv4);
            const ipv6 = displayRemoteAddress(node.ipv6);
            const addresses = [
              ipv4 ? { type: "IPv4" as const, value: ipv4 } : null,
              ipv6 ? { type: "IPv6" as const, value: ipv6 } : null,
            ].filter((address): address is { type: "IPv4" | "IPv6"; value: string } => Boolean(address));

            return (
              <article
                key={node.uuid}
                className={`remote-node-picker-card${selected ? " is-selected" : ""}${online ? "" : " is-offline"}`}
              >
                <header className="remote-node-picker-card-header">
                  <span className="remote-node-picker-identity">
                    <span className="remote-node-picker-flag">
                      <Flag flag={flag} compact />
                    </span>
                    <strong title={node.name}>{node.name}</strong>
                  </span>
                  <span className={`remote-node-picker-status ${online ? "is-online" : "is-offline"}`}>
                    <span aria-hidden="true" />
                    {online ? t("nodeCard.online") : t("nodeCard.offline")}
                  </span>
                </header>

                <div className="remote-node-picker-address-panel">
                  <div className="remote-node-picker-address-title">
                    <Network size={15} aria-hidden="true" />
                    <span>{t("terminal.ip_address")}</span>
                  </div>
                  <div className={`remote-node-picker-addresses${addresses.length === 0 ? " is-empty" : ""}`}>
                    {addresses.length > 0 ? addresses.map(({ type, value }) => (
                      <div className="remote-node-picker-address" key={type}>
                        <span>{type}</span>
                        <code title={value}>{value}</code>
                        <button
                          type="button"
                          title={t("terminal.copy_address", { type })}
                          aria-label={t("terminal.copy_address", { type })}
                          onClick={() => void copyAddress(value)}
                        >
                          <Copy size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )) : (
                      <span>{t("terminal.address_unreported")}</span>
                    )}
                  </div>
                </div>

                <footer className="remote-node-picker-card-footer">
                  <span className="remote-node-picker-group">
                    <Layers3 size={14} aria-hidden="true" />
                    <span title={node.group || t("terminal.ungrouped")}>
                      {node.group?.trim() || t("terminal.ungrouped")}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="remote-node-picker-enter"
                    disabled={!online}
                    title={online ? t("terminal.open_terminal") : t("nodeCard.offline")}
                    aria-label={online ? t("terminal.open_terminal") : t("nodeCard.offline")}
                    onClick={() => onSelect(node)}
                  >
                    <SquareTerminal size={19} aria-hidden="true" />
                  </button>
                </footer>
              </article>
            );
          })}
          </div>
        ) : (
          <div className="remote-node-picker-empty">
            <SearchX size={26} aria-hidden="true" />
            <strong>
              {noMatches ? t("terminal.no_results") : t("terminal.no_servers")}
            </strong>
            {noMatches ? <span>{t("terminal.try_different")}</span> : null}
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="remote-node-picker-footer">
          <nav className="remote-node-picker-pagination" aria-label={t("terminal.pagination")}>
            <button
              type="button"
              disabled={currentPage === 1}
              title={t("terminal.previous_page")}
              aria-label={t("terminal.previous_page")}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span>{t("terminal.page_status", { page: currentPage, total: totalPages })}</span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              title={t("terminal.next_page")}
              aria-label={t("terminal.next_page")}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
