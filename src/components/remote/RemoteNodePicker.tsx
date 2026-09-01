import { useEffect, useId, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import Flag from "@/components/Flag";
import AdminNodeStatusSummary from "@/components/admin/AdminNodeStatusSummary";
import { ADMIN_LIST_SEARCH_SX } from "@/components/admin/adminListLayout";
import { CustomTags } from "@/components/PriceTags";
import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  Search,
  SearchX,
  X,
} from "@/components/admin/muiIcons";
import { NODE_OFFLINE, NODE_ONLINE } from "@/theme/brand";
import {
  displayRemoteAddress,
  filterRemoteNodes,
  orderRemoteNodes,
  paginateRemoteNodes,
  type RemoteNodePickerItem,
  type RemoteNodeStatusFilter,
} from "@/utils/remoteNodePicker";

type RemoteNodePickerProps<T extends RemoteNodePickerItem> = {
  nodes: readonly T[];
  onlineSet: ReadonlySet<string>;
  available?: boolean;
  selectedUUID?: string;
  pageSize?: number;
  rowsPerPage?: number;
  columns?: 2;
  onSelect: (node: T) => void;
};

export default function RemoteNodePicker<T extends RemoteNodePickerItem>({
  nodes,
  onlineSet,
  available = true,
  selectedUUID,
  pageSize = 16,
  rowsPerPage,
  columns,
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
    () =>
      filterRemoteNodes(
        orderedNodes,
        query,
        available ? status : "all",
        onlineSet,
      ),
    [available, onlineSet, orderedNodes, query, status],
  );
  const onlineCount = useMemo(
    () => nodes.filter((node) => onlineSet.has(node.uuid)).length,
    [nodes, onlineSet],
  );
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

  return (
    <Box className="remote-node-picker" sx={{ display: "flex", minWidth: 0, minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Stack
        className="remote-node-picker-controls"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 1.5 }}
        sx={{
          mb: { xs: 1.25, sm: 2.5 },
          flex: "0 0 auto",
          flexShrink: 0,
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: { xs: "flex-start", sm: "space-between" },
        }}
      >
        <TextField
          inputRef={searchRef}
          id={searchID}
          size="small"
          type="search"
          value={query}
          placeholder={t("terminal.search_placeholder")}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          sx={{
            ...ADMIN_LIST_SEARCH_SX,
            flex: { xs: "0 0 auto", sm: "1 1 280px" },
            width: { xs: "100%", sm: "auto" },
            maxWidth: { sm: 520 },
            minWidth: { xs: 0, sm: 160 },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label={t("terminal.clear_search")}
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <AdminNodeStatusSummary
          total={nodes.length}
          online={onlineCount}
          available={available}
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </Stack>

      <Box className="remote-node-picker-results" sx={{ minHeight: 0, flex: 1, overflow: "auto" }}>
        {filteredNodes.length > 0 ? (
          <Box
            ref={resultsGridRef}
            className="remote-node-picker-grid"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: columns === 2
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
              },
              gap: 1.5,
            }}
          >
            {visibleNodes.map((node) => {
              const online = onlineSet.has(node.uuid);
              const knownOnline = available && online;
              const knownOffline = available && !online;
              const selected = selectedUUID === node.uuid;
              const flag = node.region_override?.trim() || node.region?.trim() || "UN";
              const ipv4 = displayRemoteAddress(node.ipv4);
              const ipv6 = displayRemoteAddress(node.ipv6);

              return (
                <Paper
                  key={node.uuid}
                  className="remote-node-picker-card"
                  variant="outlined"
                  role="button"
                  tabIndex={knownOnline ? 0 : -1}
                  aria-disabled={!knownOnline}
                  aria-label={knownOnline ? t("terminal.open_terminal") : t("nodeCard.offline")}
                  onClick={() => {
                    if (knownOnline) onSelect(node);
                  }}
                  onKeyDown={(event) => {
                    if (!knownOnline || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    onSelect(node);
                  }}
                  sx={{
                    display: "flex",
                    minHeight: { xs: 0, sm: 204 },
                    height: "100%",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: "8px",
                    borderColor: selected ? "primary.main" : "divider",
                    bgcolor: "background.paper",
                    cursor: knownOnline ? "pointer" : "not-allowed",
                    opacity: knownOffline ? 0.72 : 1,
                    boxShadow: selected
                      ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`
                      : "none",
                    "&:hover": knownOnline
                      ? { borderColor: "primary.main" }
                      : undefined,
                    "&:focus-visible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: "2px",
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                    sx={{ p: 1.5, alignItems: "center", bgcolor: "action.hover" }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box className="admin-node-country-flag" sx={{ flexShrink: 0, lineHeight: 0 }}>
                        <Flag flag={flag} compact />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }} title={node.name}>
                          {node.name}
                        </Typography>
                        <Typography
                          noWrap
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            fontSize: 12,
                            color: online ? NODE_ONLINE : NODE_OFFLINE,
                            visibility: available ? "visible" : "hidden",
                          }}
                        >
                          <Box
                            component="span"
                            sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "currentColor" }}
                          />
                          {online ? t("nodeCard.online") : t("nodeCard.offline")}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                  <Box aria-label={t("terminal.ip_address")} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, minHeight: 0 }}>
                    {[
                      ["IPv4", ipv4],
                      ["IPv6", ipv6],
                    ].map(([label, value], index) => (
                      <Box
                        key={label}
                        sx={{
                          p: 1.35,
                          borderTop: 1,
                          borderRight: index % 2 === 0 ? 1 : 0,
                          borderColor: "divider",
                          minWidth: 0,
                        }}
                      >
                        <Typography color="text.secondary" sx={{ mb: 0.4, fontSize: 11.5 }}>
                          {label}
                        </Typography>
                        <Typography
                          noWrap
                          title={value || undefined}
                          sx={{ fontSize: 13.5, fontWeight: 400, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
                        >
                          {value || t("terminal.address_unreported")}
                        </Typography>
                      </Box>
                    ))}
                    <Box
                      sx={{
                        p: 1.35,
                        borderTop: 1,
                        borderRight: 1,
                        borderColor: "divider",
                        minWidth: 0,
                      }}
                    >
                      <Typography color="text.secondary" sx={{ mb: 0.4, fontSize: 11.5 }}>
                        {t("common.group", "分组")}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", minWidth: 0 }}>
                        <Layers3 size={14} />
                        <Typography noWrap title={node.group || t("terminal.ungrouped")} sx={{ fontSize: 13.5 }}>
                          {node.group?.trim() || t("terminal.ungrouped")}
                        </Typography>
                      </Stack>
                    </Box>
                    <Box
                      sx={{
                        p: 1.35,
                        borderTop: 1,
                        borderColor: "divider",
                        minWidth: 0,
                      }}
                    >
                      <Typography color="text.secondary" sx={{ mb: 0.4, fontSize: 11.5 }}>
                        {t("common.tags", "标签")}
                      </Typography>
                      {(node.tags || "").trim() ? (
                        <Box
                          className="admin-cell-clip-row"
                          title={node.tags}
                          sx={{ minWidth: 0 }}
                        >
                          <CustomTags tags={node.tags || ""} />
                        </Box>
                      ) : (
                        <Typography noWrap sx={{ fontSize: 13.5, color: "text.secondary" }}>
                          --
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <Stack
            spacing={1}
            sx={{ minHeight: 260, alignItems: "center", justifyContent: "center", color: "text.secondary", textAlign: "center" }}
          >
            <SearchX size={26} />
            <Typography sx={{ fontWeight: 500, color: "text.primary" }}>
              {noMatches ? t("terminal.no_results") : t("terminal.no_servers")}
            </Typography>
            {noMatches ? (
              <Typography variant="body2">{t("terminal.try_different")}</Typography>
            ) : null}
          </Stack>
        )}
      </Box>

      {totalPages > 1 ? (
        <Stack
          className="remote-node-picker-footer"
          direction="row"
          spacing={1}
          sx={{ mt: 1.5, flexShrink: 0, justifyContent: "flex-end", alignItems: "center" }}
        >
          <IconButton
            size="small"
            disabled={currentPage === 1}
            title={t("terminal.previous_page")}
            aria-label={t("terminal.previous_page")}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 54, textAlign: "center", color: "text.secondary" }}>
            {t("terminal.page_status", { page: currentPage, total: totalPages })}
          </Typography>
          <IconButton
            size="small"
            disabled={currentPage === totalPages}
            title={t("terminal.next_page")}
            aria-label={t("terminal.next_page")}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            <ChevronRight size={16} />
          </IconButton>
        </Stack>
      ) : null}
    </Box>
  );
}
