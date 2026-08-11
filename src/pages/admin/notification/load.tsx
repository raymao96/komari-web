import Loading from "@/components/loading";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import NodeSelectorDialog from "@/components/NodeSelectorDialog";
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
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  TextField,
} from "@radix-ui/themes";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  const { isLoading: nodeDetailLoading, error: nodeDetailError } =
    useNodeDetails();
  const { t } = useTranslation();
  const sortedAlerts = React.useMemo(
    () => (loadAlerts || []).slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [loadAlerts],
  );
  const { page, setPage, pageItems, pageSize, setPageSize } =
    useAdminPagination(sortedAlerts);
  if (isLoading || nodeDetailLoading) {
    return <Loading />;
  }
  if (error || nodeDetailError) {
    return <div>{error || nodeDetailError}</div>;
  }
  return (
    <Flex direction="column" gap="4" className="p-0 md:p-4">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-end">
        <AdminPageTitle
          description={t(
            "notification.load.description",
            "配置 CPU、内存、负载等资源告警规则，并指定适用节点。",
          )}
        >
          {t("notification.load.title")}
        </AdminPageTitle>
        <AddButton />
      </div>

      <div className="admin-responsive-table-wrap overflow-hidden rounded-md border border-[var(--gray-a5)] bg-[var(--color-panel-solid)]">
        <div className="overflow-x-auto">
        <Table className="admin-responsive-table admin-primary-first-table min-w-[840px]">
          <TableHeader>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.server")}</TableHead>
            <TableHead>{t("loadAlert.metric")}</TableHead>
            <TableHead>{t("common.threshold")}</TableHead>
            <TableHead>{t("loadAlert.ratio")}</TableHead>
            <TableHead>{t("ping.interval")}</TableHead>
            <TableHead>{t("common.action")}</TableHead>
          </TableHeader>
          <TableBody>
            {pageItems.map((alert) => (
                <Row key={alert.id} alert={alert} />
              ))}
          </TableBody>
        </Table>
        </div>
        <AdminPagination
          page={page}
          total={sortedAlerts.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showSummary={false}
        />
      </div>
    </Flex>
  );
};

const Row = ({ alert }: { alert: LoadAlert }) => {
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

  return (
    <TableRow key={alert.id}>
      <TableCell data-label={t("common.name")}>{alert.name}</TableCell>
      <TableCell data-label={t("common.server")}>
        <div className="flex min-w-0 items-start gap-2">
          <span className="min-w-0 flex-1 whitespace-normal break-words">
            {alert.clients && alert.clients.length > 0
              ? alert.clients
                  .map(
                    (uuid) =>
                      nodeDetail.find((node) => node.uuid === uuid)?.name || uuid,
                  )
                  .join(", ")
              : t("common.none")}
          </span>
          {alert.default_on && (
            <span className="shrink-0 text-xs text-accent-11">
              {t("ping.default_on_short")}
            </span>
          )}
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
      </TableCell>
      <TableCell data-label={t("loadAlert.metric")}>{alert.metric?.toUpperCase()}</TableCell>
      <TableCell data-label={t("common.threshold")}>{alert.threshold}%</TableCell>
      <TableCell data-label={t("loadAlert.ratio")}>{alert.ratio}</TableCell>
      <TableCell data-label={t("ping.interval")}>
        {alert.interval} {t("time.minute")}
      </TableCell>
      <TableCell data-label={t("common.action")}>
        <div className="admin-card-actions admin-dual-actions flex items-center gap-3">
        {/* 编辑按钮 */}
        <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
          <Dialog.Trigger>
            <IconButton variant="soft">
              <Pencil size="16" />
            </IconButton>
          </Dialog.Trigger>
          <Dialog.Content>
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
          </Dialog.Content>
        </Dialog.Root>
        {/* 删除按钮 */}
        <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Dialog.Trigger>
            <IconButton variant="soft" color="red">
              <Trash size="16" />
            </IconButton>
          </Dialog.Trigger>
          <Dialog.Content>
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
          </Dialog.Content>
        </Dialog.Root>
        </div>
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
      <Dialog.Trigger>
        <Button className="w-full sm:w-auto">{t("common.add")}</Button>
      </Dialog.Trigger>
      <Dialog.Content>
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
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default LoadPage;
