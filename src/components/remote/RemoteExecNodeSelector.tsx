import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import MuiButton from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import Flag from "@/components/Flag";
import { CustomTags } from "@/components/PriceTags";
import AdminNodeListFilters, {
  type AdminNodeStatusValue,
} from "@/components/admin/AdminNodeListFilters";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import { AdminListShell } from "@/components/admin/AdminListShell";
import { ADMIN_LIST_OUTLINE_SX } from "@/components/admin/adminListLayout";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import { ListChecks } from "@/components/admin/muiIcons";
import { Flex } from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NodeDetail } from "@/contexts/NodeDetailsContext";
import {
  nodeOnlineState,
  useAdminNodeLiveData,
} from "@/hooks/use-admin-node-live-data";
import {
  matchesRemoteExecNode,
  orderRemoteExecNodes,
} from "@/utils/remoteExecNodes";
import { getRegionCode } from "@/utils/regionHelper";
import "./RemoteExecNodeSelector.css";

type RemoteExecNodeSelectorProps = {
  nodes: readonly NodeDetail[];
  value: string[];
  onChange: (uuids: string[]) => void;
};

const compactIPv6 = (value: string) => {
  if (value.length <= 22) return value;
  const segments = value.split(":");
  return segments.length > 3
    ? `${segments.slice(0, 2).join(":")}:...${segments[segments.length - 1]}`
    : value;
};

export default function RemoteExecNodeSelector({
  nodes,
  value,
  onChange,
}: RemoteExecNodeSelectorProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { liveData, available } = useAdminNodeLiveData();
  const [query, setQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<AdminNodeStatusValue[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const onlineSet = useMemo(
    () => new Set(liveData?.data.online ?? []),
    [liveData?.data.online],
  );
  const orderedNodes = useMemo(() => orderRemoteExecNodes(nodes), [nodes]);
  const filteredNodes = useMemo(
    () =>
      orderedNodes.filter((node) => {
        const matchesSearch = matchesRemoteExecNode(node, query);
        const isOnline = nodeOnlineState(available, onlineSet, node.uuid);
        const matchesStatus =
          statusFilters.length === 0 ||
          isOnline === null ||
          statusFilters.includes(isOnline ? "online" : "offline");
        const matchesRegion =
          regionFilters.length === 0 ||
          regionFilters.includes(getRegionCode(node.region));
        const nodeGroup = node.group?.trim() ? node.group.trim() : "__none__";
        const matchesGroup =
          groupFilters.length === 0 || groupFilters.includes(nodeGroup);
        return matchesSearch && matchesStatus && matchesRegion && matchesGroup;
      }),
    [available, groupFilters, onlineSet, orderedNodes, query, regionFilters, statusFilters],
  );
  const {
    page,
    setPage,
    pageItems,
    pageSize,
    setPageSize,
  } = useAdminPagination(filteredNodes);

  useEffect(() => {
    setPage(1);
  }, [groupFilters, query, regionFilters, setPage, statusFilters]);

  const filteredIds = useMemo(
    () => filteredNodes.map((node) => node.uuid),
    [filteredNodes],
  );
  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedFilteredCount = filteredIds.filter((uuid) => selectedSet.has(uuid)).length;
  const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length;

  const toggleNode = (uuid: string) => {
    if (selectedSet.has(uuid)) {
      onChange(value.filter((item) => item !== uuid));
    } else {
      onChange([...value, uuid]);
    }
  };

  const toggleFiltered = (checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, ...filteredIds])));
    } else {
      const filteredSet = new Set(filteredIds);
      onChange(value.filter((uuid) => !filteredSet.has(uuid)));
    }
  };

  return (
    <AdminListShell className="remote-exec-node-selector">
      <AdminNodeListFilters
        nodes={[...orderedNodes]}
        onlineSet={onlineSet}
        available={available}
        resultCount={filteredNodes.length}
        searchTerm={query}
        onSearchTermChange={setQuery}
        statusFilters={statusFilters}
        onStatusFiltersChange={setStatusFilters}
        regionFilters={regionFilters}
        onRegionFiltersChange={setRegionFilters}
        groupFilters={groupFilters}
        onGroupFiltersChange={setGroupFilters}
        searchPlaceholder={t("exec.nodeSearchPlaceholder")}
        endAction={
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
            <span className="tabular-nums text-sm text-muted-foreground">
              {t("common.selected_total", { count: value.length, total: nodes.length })}
            </span>
            <MuiButton
              type="button"
              variant="outlined"
              disabled={filteredIds.length === 0}
              onClick={() => toggleFiltered(!allFilteredSelected)}
              startIcon={<ListChecks size={16} />}
              sx={ADMIN_LIST_OUTLINE_SX}
            >
              {allFilteredSelected ? t("common.deselect_all") : t("common.select_all")}
            </MuiButton>
          </Stack>
        }
      />

      {filteredNodes.length > 0 ? (
        <>
          {isMobile ? (
            <AdminMobileCardStack>
              {pageItems.map((node) => {
                const selected = selectedSet.has(node.uuid);
                const online = nodeOnlineState(available, onlineSet, node.uuid);
                return (
                  <div
                    key={node.uuid}
                    data-state={selected ? "selected" : undefined}
                    aria-selected={selected}
                    className="remote-exec-node-row"
                    onClick={() => toggleNode(node.uuid)}
                  >
                    <AdminMobileListCard
                      title={
                        <RemoteExecNodeIdentity node={node} online={online} />
                      }
                      headerExtra={
                        <Checkbox
                          checked={selected}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => toggleNode(node.uuid)}
                          aria-label={`${t("common.select")} ${node.name}`}
                        />
                      }
                      cells={[
                        [t("admin.nodeTable.network", "网络"), <RemoteExecNodeAddresses key="net" node={node} />],
                        [t("common.group"), node.group || "--"],
                        [t("common.remark"), node.remark || "--"],
                        [
                          t("admin.nodeTable.tags", "标签"),
                          (node.tags || "").trim() ? (
                            <Flex gap="1" wrap="wrap">
                              <CustomTags tags={node.tags || ""} />
                            </Flex>
                          ) : (
                            "--"
                          ),
                        ],
                      ]}
                    />
                  </div>
                );
              })}
            </AdminMobileCardStack>
          ) : (
          <div className="admin-responsive-table-wrap remote-exec-node-table-wrap overflow-x-auto overflow-y-hidden">
            <Table container={false} className="admin-responsive-table admin-selection-table remote-exec-node-table min-w-[980px] table-fixed text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%] text-center">
                    <span className="sr-only">{t("common.select")}</span>
                  </TableHead>
                  <TableHead className="w-[18%]">{t("admin.nodeTable.name")}</TableHead>
                  <TableHead className="w-[23%]">{t("terminal.ip_address")}</TableHead>
                  <TableHead className="w-[12%]">{t("common.group")}</TableHead>
                  <TableHead className="w-[18%]">{t("common.remark")}</TableHead>
                  <TableHead className="w-[24%]">{t("admin.nodeTable.tags", "标签")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((node) => {
                  const selected = selectedSet.has(node.uuid);
                  const online = nodeOnlineState(available, onlineSet, node.uuid);
                  return (
                    <TableRow
                      key={node.uuid}
                      data-state={selected ? "selected" : undefined}
                      aria-selected={selected}
                      className="remote-exec-node-row [&>td]:align-middle [&>td]:py-1.5"
                      onClick={() => toggleNode(node.uuid)}
                    >
                      <TableCell className="text-center" data-label={t("common.select")}>
                        <Checkbox
                          checked={selected}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => toggleNode(node.uuid)}
                          aria-label={`${t("common.select")} ${node.name}`}
                        />
                      </TableCell>
                      <TableCell className="overflow-hidden" data-label={t("admin.nodeTable.name")}>
                        <RemoteExecNodeIdentity node={node} online={online} />
                      </TableCell>
                      <TableCell data-label={t("terminal.ip_address")}>
                        <RemoteExecNodeAddresses node={node} />
                      </TableCell>
                      <TableCell className="min-w-0 overflow-hidden" data-label={t("common.group")}>
                        <span className="admin-cell-clip font-normal text-muted-foreground" title={node.group || ""}>
                          {node.group || "--"}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 overflow-hidden" data-label={t("common.remark")}>
                        <span className="admin-cell-clip text-[13px] text-muted-foreground" title={node.remark || ""}>
                          {node.remark || "--"}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 overflow-hidden" data-label={t("admin.nodeTable.tags", "标签")}>
                        {(node.tags || "").trim() ? (
                          <div className="admin-cell-clip-row" title={node.tags || ""}>
                            <CustomTags tags={node.tags || ""} />
                          </div>
                        ) : (
                          <span className="admin-cell-clip text-muted-foreground">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          )}
          <AdminPagination
            page={page}
            total={filteredNodes.length}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            showSummary={false}
          />
        </>
      ) : (
        <div className="km-admin-list-empty">
          {t("common.no_results")}
        </div>
      )}
    </AdminListShell>
  );
}

function RemoteExecNodeIdentity({
  node,
  online,
}: {
  node: NodeDetail;
  online: boolean | null;
}) {
  const { t } = useTranslation();
  const flag = node.region_override?.trim() || node.region?.trim() || "UN";
  return (
    <div className="remote-exec-node-identity">
      <span className="remote-exec-node-flag">
        <Flag flag={flag} compact />
      </span>
      <div className="min-w-0">
        <strong title={node.name}>{node.name}</strong>
        <span
          className={`remote-exec-node-status ${online ? "is-online" : "is-offline"}`}
          aria-hidden={online === null || undefined}
          style={online === null ? { visibility: "hidden" } : undefined}
        >
          <span aria-hidden="true" />
          {online ? t("nodeCard.online") : t("nodeCard.offline")}
        </span>
      </div>
    </div>
  );
}

function RemoteExecNodeAddresses({ node }: { node: NodeDetail }) {
  const addresses = (
    [
      ["IPv4", node.ipv4?.trim()],
      ["IPv6", node.ipv6?.trim()],
    ] as const
  ).filter(
    (entry): entry is readonly ["IPv4" | "IPv6", string] => Boolean(entry[1]),
  );
  return (
    <div className="remote-exec-node-addresses">
      {addresses.length > 0 ? addresses.map(([type, address]) => (
        <div
          key={type}
          className="remote-exec-node-address"
          title={address || undefined}
        >
          <span>{type}</span>
          <code>{type === "IPv6" ? compactIPv6(address) : address}</code>
        </div>
      )) : <span className="text-muted-foreground">--</span>}
    </div>
  );
}
