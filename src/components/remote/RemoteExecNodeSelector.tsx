import { useEffect, useMemo, useState } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { ListChecks, Search } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import Flag from "@/components/Flag";
import PriceTags from "@/components/PriceTags";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NodeDetail } from "@/contexts/NodeDetailsContext";
import { useAdminNodeLiveData } from "@/hooks/use-admin-node-live-data";
import { currencyForDisplay } from "@/lib/currency";
import {
  matchesRemoteExecNode,
  orderRemoteExecNodes,
} from "@/utils/remoteExecNodes";
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

const getBillingDisplayTerms = (node: NodeDetail, t: TFunction) => {
  const billingCycle = (() => {
    if (node.billing_cycle >= 27 && node.billing_cycle <= 32) return t("common.monthly");
    if (node.billing_cycle >= 87 && node.billing_cycle <= 95) return t("common.quarterly");
    if (node.billing_cycle >= 175 && node.billing_cycle <= 185) return t("common.semi_annual");
    if (node.billing_cycle >= 360 && node.billing_cycle <= 370) return t("common.annual");
    if (node.billing_cycle >= 720 && node.billing_cycle <= 750) return t("common.biennial");
    if (node.billing_cycle >= 1080 && node.billing_cycle <= 1150) return t("common.triennial");
    if (node.billing_cycle >= 1800 && node.billing_cycle <= 1850) return t("common.quinquennial");
    if (node.billing_cycle === -1) return t("common.once");
    return `${node.billing_cycle} ${t("nodeCard.time_day")}`;
  })();
  const expirationDays = node.expired_at
    ? Math.ceil((new Date(node.expired_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const expiration = expirationDays === null || !Number.isFinite(expirationDays) || expirationDays > 36_500
    ? t("common.long_term")
    : expirationDays <= 0
      ? t("common.expired")
      : t("common.expired_in", { days: expirationDays });

  return [currencyForDisplay(node.currency || ""), billingCycle, expiration];
};

export default function RemoteExecNodeSelector({
  nodes,
  value,
  onChange,
}: RemoteExecNodeSelectorProps) {
  const { t } = useTranslation();
  const { liveData, available } = useAdminNodeLiveData();
  const [query, setQuery] = useState("");
  const onlineSet = useMemo(
    () => new Set(liveData?.data.online ?? []),
    [liveData?.data.online],
  );
  const orderedNodes = useMemo(() => orderRemoteExecNodes(nodes), [nodes]);
  const filteredNodes = useMemo(
    () => orderedNodes.filter((node) =>
      matchesRemoteExecNode(node, query, getBillingDisplayTerms(node, t))),
    [orderedNodes, query, t],
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
  }, [query, setPage]);

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
    <div className="remote-exec-node-selector space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TextField.Root
          size="2"
          className="w-full text-sm sm:max-w-md"
          placeholder={t("exec.nodeSearchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
        </TextField.Root>
        <Flex align="center" justify="between" gap="3" className="w-full sm:w-auto sm:justify-end">
          <Text size="2" color="gray" className="tabular-nums">
            {t("common.selected_total", { count: value.length, total: nodes.length })}
          </Text>
          <Button
            type="button"
            size="2"
            variant="soft"
            disabled={filteredIds.length === 0}
            onClick={() => toggleFiltered(!allFilteredSelected)}
          >
            <ListChecks size={16} />
            {allFilteredSelected ? t("common.deselect_all") : t("common.select_all")}
          </Button>
        </Flex>
      </div>

      <div className="admin-responsive-table-wrap remote-exec-node-table-wrap overflow-x-auto overflow-y-hidden rounded-md border border-[var(--gray-a5)]">
        {filteredNodes.length > 0 ? (
          <>
            <Table className="admin-responsive-table admin-selection-table remote-exec-node-table min-w-[980px] table-fixed text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%] text-center">
                    <span className="sr-only">{t("common.select")}</span>
                  </TableHead>
                  <TableHead className="w-[18%]">{t("admin.nodeTable.name")}</TableHead>
                  <TableHead className="w-[23%]">{t("terminal.ip_address")}</TableHead>
                  <TableHead className="w-[12%]">{t("common.group")}</TableHead>
                  <TableHead className="w-[18%]">{t("common.remark")}</TableHead>
                  <TableHead className="w-[24%]">{t("admin.nodeTable.billing")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((node) => {
                  const selected = selectedSet.has(node.uuid);
                  const online = onlineSet.has(node.uuid);
                  const flag = node.region_override?.trim() || node.region?.trim() || "UN";
                  const addresses = ([
                    ["IPv4", node.ipv4?.trim()],
                    ["IPv6", node.ipv6?.trim()],
                  ] as const).filter(
                    (entry): entry is readonly ["IPv4" | "IPv6", string] => Boolean(entry[1]),
                  );
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
                        <div className="remote-exec-node-identity">
                          <span className="remote-exec-node-flag">
                            <Flag flag={flag} compact />
                          </span>
                          <div className="min-w-0">
                            <strong title={node.name}>{node.name}</strong>
                            {available ? (
                              <span className={`remote-exec-node-status ${online ? "is-online" : "is-offline"}`}>
                                <span aria-hidden="true" />
                                {online ? t("nodeCard.online") : t("nodeCard.offline")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-label={t("terminal.ip_address")}>
                        <div className="remote-exec-node-addresses">
                          {addresses.length > 0 ? addresses.map(([type, address]) => (
                            <div key={type} className="remote-exec-node-address" title={address || undefined}>
                              <span>{type}</span>
                              <code>{type === "IPv6" ? compactIPv6(address) : address}</code>
                            </div>
                          )) : <span className="text-muted-foreground">--</span>}
                        </div>
                      </TableCell>
                      <TableCell data-label={t("common.group")}>
                        <span className="block truncate font-normal text-muted-foreground" title={node.group || ""}>
                          {node.group || "--"}
                        </span>
                      </TableCell>
                      <TableCell data-label={t("common.remark")}>
                        <span className="block whitespace-normal break-words text-[13px] text-muted-foreground" title={node.remark || ""}>
                          {node.remark || "--"}
                        </span>
                      </TableCell>
                      <TableCell data-label={t("admin.nodeTable.billing")}>
                        <PriceTags
                          className="[&_label]:!text-xs"
                          price={node.price}
                          billing_cycle={node.billing_cycle}
                          expired_at={node.expired_at}
                          currency={node.currency}
                          tags={node.tags || ""}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
          <div className="flex min-h-32 items-center justify-center px-4 py-8 text-sm text-[var(--gray-10)]">
            {t("common.no_results")}
          </div>
        )}
      </div>
    </div>
  );
}
