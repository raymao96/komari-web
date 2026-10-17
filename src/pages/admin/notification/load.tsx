import Loading from "@/components/loading";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import {
  AdminListFiltersBar,
  AdminListSearch,
  AdminListShell,
} from "@/components/admin/AdminListShell";
import { ADMIN_LIST_ACTION_SX } from "@/components/admin/adminListLayout";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LoadAlertProvider,
  useLoadAlert,
  type LoadAlert,
} from "@/contexts/LoadAlertContext";
import {
  NodeDetailsProvider,
  useNodeDetails,
} from "@/contexts/NodeDetailsContext";

import {
  AppDialogContent,
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Select,
  TextField,
} from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CircleAlert,
  MoreHorizontal,
  Pencil,
  Trash,
} from "@/components/admin/muiIcons";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import MuiButton from "@mui/material/Button";
import Stack from "@mui/material/Stack";

const LoadPage = () => {
  return (
    <LoadAlertProvider>
      <NodeDetailsProvider>
        <InnerLayout />
      </NodeDetailsProvider>
    </LoadAlertProvider>
  );
};

const InnerLayout = () => {
  const { loadAlerts, isLoading, error } = useLoadAlert();
  const {
    isLoading: nodeDetailLoading,
    error: nodeDetailError,
    nodeDetail,
  } = useNodeDetails();
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const sortedAlerts = React.useMemo(
    () =>
      (loadAlerts || [])
        .filter((alert) => {
          if (!normalizedSearch) return true;
          const clientText = (alert.clients || [])
            .map((uuid) => `${uuid} ${nodeDetail.find((node) => node.uuid === uuid)?.name || ""}`)
            .join(" ");
          return `${alert.name || ""} ${alert.metric || ""} ${clientText}`
            .toLocaleLowerCase()
            .includes(normalizedSearch);
        })
        .slice()
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [loadAlerts, nodeDetail, normalizedSearch],
  );
  const pagination = useAdminPagination(sortedAlerts);

  if ((isLoading && loadAlerts === null) || nodeDetailLoading) {
    return <Loading />;
  }
  if ((error && loadAlerts === null) || nodeDetailError) {
    return <div>{error || nodeDetailError}</div>;
  }
  return (
    <Flex direction="column" gap="4" className="w-full min-w-0 p-0 md:p-4">
      <AdminPageTitle
        description={t(
          "notification.load.description",
          "配置 CPU、内存、负载等资源告警规则，并指定适用节点。",
        )}
      >
        {t("notification.load.title")}
      </AdminPageTitle>

      {error ? (
        <Callout.Root color="red" role="alert">
          <Callout.Icon>
            <CircleAlert size={16} />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      ) : null}

      <AdminListShell>
        <LoadListToolbar search={search} onSearchChange={setSearch} />
        <LoadConfigurationTable
          alerts={pagination.pageItems}
          total={sortedAlerts.length}
          pagination={pagination}
        />
      </AdminListShell>
    </Flex>
  );
};

const LoadListToolbar = ({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <AdminListFiltersBar>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "center" }}
      >
        <AdminListSearch
          value={search}
          onChange={onSearchChange}
          placeholder={t("common.search")}
        />
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
          <AddButton />
        </Stack>
      </Stack>
    </AdminListFiltersBar>
  );
};

type PaginationState<T> = {
  page: number;
  setPage: (page: number) => void;
  pageItems: T[];
  pageSize: number;
  setPageSize: (pageSize: number) => void;
};

const LoadConfigurationTable = ({
  alerts,
  total,
  pagination,
}: {
  alerts: LoadAlert[];
  total: number;
  pagination: PaginationState<LoadAlert>;
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  if (total === 0) {
    return <EmptyState>{t("notification.load.empty_configuration")}</EmptyState>;
  }
  return (
    <>
      {isMobile ? (
        <AdminMobileCardStack>
          {alerts.map((alert) => (
            <Row key={alert.id} alert={alert} asCard />
          ))}
        </AdminMobileCardStack>
      ) : (
      <div className="admin-responsive-table-wrap overflow-x-auto">
        <Table container={false} className="admin-responsive-table admin-primary-first-table table-fixed min-w-[840px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16%]">{t("common.name")}</TableHead>
              <TableHead className="w-[30%]">{t("common.server")}</TableHead>
              <TableHead>{t("loadAlert.metric")}</TableHead>
              <TableHead>{t("common.threshold")}</TableHead>
              <TableHead>{t("loadAlert.ratio")}</TableHead>
              <TableHead>{t("ping.interval")}</TableHead>
              <TableHead className="w-[10%]">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => <Row key={alert.id} alert={alert} />)}
          </TableBody>
        </Table>
      </div>
      )}
      <AdminPagination
        page={pagination.page}
        total={total}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        showSummary={false}
      />
    </>
  );
};

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="km-admin-list-empty">{children}</div>
);

const Row = ({
  alert,
  asCard = false,
}: {
  alert: LoadAlert;
  asCard?: boolean;
}) => {
  const { t } = useTranslation();
  const { refresh } = useLoadAlert();
  const { nodeDetail } = useNodeDetails();
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: alert.name || "",
    metric: alert.metric || "cpu",
    threshold: alert.threshold || 80,
    ratio: alert.ratio || 0.8,
    clients: alert.clients || [],
    default_on: alert.default_on ?? false,
    interval: alert.interval || 15,
  });

  const submitEdit = (newForm: typeof form) => {
    if (!newForm.default_on && newForm.clients.length === 0) {
      toast.error(t("ping.default_on_description"));
      return;
    }
    setEditSaving(true);
    fetch("/api/admin/notification/load/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifications: [
          {
            id: alert.id,
            name: newForm.name,
            metric: newForm.metric,
            threshold: newForm.threshold,
            ratio: newForm.ratio,
            clients: newForm.clients,
            default_on: newForm.default_on,
            interval: newForm.interval,
          },
        ],
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.message || t("common.error"));
          });
        }
        return res.json();
      })
      .then(() => {
        setEditOpen(false);
        toast.success(t("common.updated_successfully"));
        refresh();
      })
      .catch((error) => {
        toast.error(error.message);
      })
      .finally(() => setEditSaving(false));
  };

  // 编辑提交
  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitEdit(form);
  };

  // 删除
  const handleDelete = () => {
    setDeleteLoading(true);
    fetch("/api/admin/notification/load/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [alert.id] }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.message || t("common.error"));
          });
        }
        return res.json();
      })
      .then(() => {
        setDeleteOpen(false);
        toast.success(t("common.deleted_successfully"));
        refresh();
      })
      .catch((error) => {
        toast.error(error.message);
      })
      .finally(() => setDeleteLoading(false));
  };

  const serverNames =
    alert.clients && alert.clients.length > 0
      ? alert.clients
          .map(
            (uuid) =>
              nodeDetail.find((node) => node.uuid === uuid)?.name || uuid,
          )
          .join(", ")
      : "";
  const serverValue = (
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div
              className="truncate whitespace-nowrap leading-5"
              title={serverNames || undefined}
            >
              {serverNames || t("common.none")}
            </div>
            {alert.default_on && (
              <div className="mt-1 truncate text-xs text-accent-11">
                {t("ping.default_on_short")}
              </div>
            )}
          </div>
          <NodeSelectorDialog
            value={form.clients ?? []}
            hiddenUuidOnlyClient
            onChange={(uuids) => {
              const nextForm = { ...form, clients: uuids };
              setForm(nextForm);
              submitEdit(nextForm);
            }}
          >
            <IconButton variant="ghost" className="shrink-0">
              <MoreHorizontal size="16" />
            </IconButton>
          </NodeSelectorDialog>
        </div>
  );
  const actionButtons = (
        <div className="admin-card-actions admin-dual-actions flex items-center gap-3">
        {/* 编辑按钮 */}
        <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
          <Dialog.Trigger>
            <IconButton variant="soft">
              <Pencil size="16" />
            </IconButton>
          </Dialog.Trigger>
          <AppDialogContent>
            <Dialog.Title>{t("common.edit")}</Dialog.Title>
            <form onSubmit={handleEdit} className="flex flex-col gap-2">
              <label>{t("common.name")}</label>
              <TextField.Root
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
              <label>{t("loadAlert.metric")}</label>
              <Select.Root
                value={form.metric}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, metric: v as any }))
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="cpu">CPU</Select.Item>
                  <Select.Item value="ram">RAM</Select.Item>
                  <Select.Item value="disk">Disk</Select.Item>
                  <Select.Item value="net_in">Net In</Select.Item>
                  <Select.Item value="net_out">Net Out</Select.Item>
                </Select.Content>
              </Select.Root>
              <label>{t("common.threshold")} (%)</label>
              <TextField.Root
                type="number"
                value={form.threshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, threshold: Number(e.target.value) }))
                }
                required
              />
              <label>{t("loadAlert.ratio")}</label>
              <TextField.Root
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={form.ratio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ratio: Number(e.target.value) }))
                }
                required
              />
              <label>{t("common.server")}</label>
              <Flex>
                <NodeSelectorDialog
                  value={form.clients}
                  hiddenUuidOnlyClient
                  onChange={(v) => setForm((f) => ({ ...f, clients: v }))}
                />
              </Flex>
              <label className="flex min-h-10 items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={form.default_on}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, default_on: !!checked }))
                  }
                />
                <span>{t("ping.default_on")}</span>
              </label>
              <label className="text-sm font-normal text-gray-500">
                {t("ping.default_on_description")}
              </label>
              <label>
                {t("ping.interval")} ({t("time.minute")})
              </label>
              <TextField.Root
                type="number"
                value={form.interval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interval: Number(e.target.value) }))
                }
                required
              />
              <Flex gap="2" justify="end" className="mt-4">
                <Dialog.Close>
                  <Button
                    variant="soft"
                    color="gray"
                    type="button"
                    onClick={() => setEditOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button variant="solid" type="submit" disabled={editSaving}>
                  {t("common.save")}
                </Button>
              </Flex>
            </form>
          </AppDialogContent>
        </Dialog.Root>
        {/* 删除按钮 */}
        <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Dialog.Trigger>
            <IconButton variant="soft" color="red">
              <Trash size="16" />
            </IconButton>
          </Dialog.Trigger>
          <AppDialogContent>
            <Dialog.Title>{t("common.delete")}</Dialog.Title>
            <Flex gap="2" justify="end" className="mt-4">
              <Dialog.Close>
                <Button
                  variant="soft"
                  color="gray"
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button
                variant="solid"
                color="red"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {t("common.delete")}
              </Button>
            </Flex>
          </AppDialogContent>
        </Dialog.Root>
        </div>
  );

  if (asCard) {
    return (
      <AdminMobileListCard
        title={alert.name}
        cells={[
          [t("common.server"), serverValue],
          [t("loadAlert.metric"), alert.metric?.toUpperCase()],
          [t("common.threshold"), `${alert.threshold}%`],
          [t("loadAlert.ratio"), String(alert.ratio)],
          [t("ping.interval"), `${alert.interval} ${t("time.minute")}`],
        ]}
        actions={actionButtons}
      />
    );
  }

  return (
    <TableRow key={alert.id}>
      <TableCell data-label={t("common.name")}>{alert.name}</TableCell>
      <TableCell className="max-w-0" data-label={t("common.server")}>
        {serverValue}
      </TableCell>
      <TableCell data-label={t("loadAlert.metric")}>{alert.metric?.toUpperCase()}</TableCell>
      <TableCell data-label={t("common.threshold")}>{alert.threshold}%</TableCell>
      <TableCell data-label={t("loadAlert.ratio")}>{alert.ratio}</TableCell>
      <TableCell data-label={t("ping.interval")}>
        {alert.interval} {t("time.minute")}
      </TableCell>
      <TableCell data-label={t("common.action")}>
        {actionButtons}
      </TableCell>
    </TableRow>
  );
};

const AddButton: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [defaultOn, setDefaultOn] = React.useState(false);
  const { refresh } = useLoadAlert();
  const [selectedType, setSelectedType] = React.useState<
    "cpu" | "ram" | "disk" | "net_in" | "net_out"
  >("cpu");
  const [saving, setSaving] = React.useState(false);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!defaultOn && selected.length === 0) {
      toast.error(t("ping.default_on_description"));
      return;
    }
    const payload = {
      name: e.currentTarget.load_name.value,
      metric: selectedType,
      threshold: parseFloat(e.currentTarget.threshold.value),
      ratio: parseFloat(e.currentTarget.ratio.value),
      clients: selected,
      default_on: defaultOn,
      interval: parseInt(e.currentTarget.interval.value, 10),
    };
    setSaving(true);
    fetch("/api/admin/notification/load/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) {
          setIsOpen(false);
          setSelected([]);
          setDefaultOn(false);
          setSelectedType("cpu");
          toast.success(t("common.success"));
        } else {
          response
            .json()
            .then((data) => {
              toast.error(data?.message || t("common.error"));
            })
            .catch((error) => {
              toast.error(error.message);
            });
        }
      })
      .catch((error) => {
        console.error("Error adding load alert:", error);
        toast.error(error.message);
      })
      .finally(() => {
        setSaving(false);
        refresh();
      });
  };
  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <MuiButton
          type="button"
          variant="contained"
          sx={ADMIN_LIST_ACTION_SX}
        >
          {t("common.add")}
        </MuiButton>
      </Dialog.Trigger>
      <AppDialogContent>
        <Dialog.Title>{t("common.add")}</Dialog.Title>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" justify="end" gap="2" className="font-bold">
            <label htmlFor="load_name">{t("common.name")}</label>
            <TextField.Root id="load_name" name="load_name" />
            <label htmlFor="type">{t("loadAlert.metric")}</label>
            <Select.Root
              value={selectedType}
              onValueChange={(value) =>
                setSelectedType(
                  value as "cpu" | "ram" | "disk" | "net_in" | "net_out",
                )
              }
            >
              <Select.Trigger id="type" name="type" />
              <Select.Content>
                <Select.Item value="cpu">CPU</Select.Item>
                <Select.Item value="ram">RAM</Select.Item>
                <Select.Item value="disk">Disk</Select.Item>
                <Select.Item value="net_in">Net In(Mbps)</Select.Item>
                <Select.Item value="net_out">Net Out(Mbps)</Select.Item>
              </Select.Content>
            </Select.Root>
            <label htmlFor="threshold">{t("common.threshold")} (%/Mbps)</label>
            <TextField.Root
              id="threshold"
              name="threshold"
              type="number"
              defaultValue={80}
              step="0.1"
            />
            <label htmlFor="ratio">{t("loadAlert.ratio")}</label>
            <TextField.Root
              id="ratio"
              name="ratio"
              type="number"
              step="0.1"
              min="0"
              max="1"
              defaultValue={0.8}
            />
            <label htmlFor="select">{t("common.server")}</label>
            <div className="flex items-center justify-start gap-2">
              <NodeSelectorDialog value={selected} onChange={setSelected} />
              <label className="text-md font-normal">
                {t("common.selected", { count: selected.length })}
              </label>
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={defaultOn}
                onCheckedChange={(checked) => setDefaultOn(!!checked)}
              />
              <span>{t("ping.default_on")}</span>
            </label>
            <label className="text-sm font-normal text-gray-500">
              {t("ping.default_on_description")}
            </label>
            <label htmlFor="interval">
              {t("ping.interval")} ({t("time.minute")})
            </label>
            <TextField.Root
              id="interval"
              name="interval"
              defaultValue={15}
              type="number"
              placeholder="15"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close>
                <Button variant="soft">{t("common.close")}</Button>
              </Dialog.Close>
              <Button disabled={saving} type="submit">
                {t("common.add")}
              </Button>
            </div>
          </Flex>
        </form>
      </AppDialogContent>
    </Dialog.Root>
  );
};

export default LoadPage;
