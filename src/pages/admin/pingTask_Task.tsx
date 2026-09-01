import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { usePingTask, type PingTask } from "@/contexts/PingTaskContext";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AppDialogContent,
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  TextField,
} from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, MenuIcon, Pencil, Trash } from "@/components/admin/muiIcons";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const getTaskSortableId = (task: { id?: number; name?: string; target?: string }) =>
  task.id !== undefined
    ? `id-${task.id}`
    : `tmp-${task.name ?? ""}-${task.target ?? ""}`;
const PREVIOUS_PAGE_DROP_ID = "ping-task-previous-page";
const NEXT_PAGE_DROP_ID = "ping-task-next-page";

export const TaskView = ({
  pingTasks,
  reorderEnabled = true,
}: {
  pingTasks: PingTask[];
  reorderEnabled?: boolean;
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { refresh } = usePingTask();
  const { nodeDetail } = useNodeDetails();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  // 过滤已删除的节点
  const processedTasks = React.useMemo(() => {
    if (!pingTasks)
      return [] as (PingTask & {
        __allClientsDeleted?: boolean;
        __originalCount?: number;
      })[];
    const nodeUuidSet = new Set(nodeDetail.map((n) => n.uuid));
    return pingTasks.map((task) => {
      const original = task.clients || [];
      const existing = original.filter((uuid) => nodeUuidSet.has(uuid));
      const allDeleted = original.length > 0 && existing.length === 0;
      return {
        ...task,
        clients: existing,
        __allClientsDeleted: allDeleted,
        __originalCount: original.length,
      };
    });
  }, [pingTasks, nodeDetail]);

  const [localTasks, setLocalTasks] = React.useState(processedTasks);
  const [isDragging, setIsDragging] = React.useState(false);
  const { page, setPage, pageItems, pageSize, setPageSize } =
    useAdminPagination(localTasks);

  React.useEffect(() => {
    setLocalTasks(processedTasks);
  }, [processedTasks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localTasks.findIndex(
      (task) => getTaskSortableId(task) === String(active.id)
    );
    let newIndex = localTasks.findIndex(
      (task) => getTaskSortableId(task) === String(over.id)
    );
    let destinationPage = page;
    if (over.id === PREVIOUS_PAGE_DROP_ID && page > 1) {
      destinationPage = page - 1;
      newIndex = destinationPage * pageSize - 1;
    } else if (
      over.id === NEXT_PAGE_DROP_ID &&
      page < Math.ceil(localTasks.length / pageSize)
    ) {
      destinationPage = page + 1;
      newIndex = (destinationPage - 1) * pageSize;
    }
    if (oldIndex < 0 || newIndex < 0) return;

    const previousTasks = Array.from(localTasks);
    const reorderedTasks = Array.from(localTasks);
    const [reorderedItem] = reorderedTasks.splice(oldIndex, 1);
    reorderedTasks.splice(newIndex, 0, reorderedItem);

    setLocalTasks(reorderedTasks);
    setPage(destinationPage);

    const orderData = reorderedTasks.reduce((acc, task, index) => {
      if (task.id !== undefined) {
        acc[String(task.id)] = index;
      }
      return acc;
    }, {} as Record<string, number>);

    try {
      const response = await fetch("/api/admin/ping/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || t("common.error"));
      }
    } catch (error: any) {
      setLocalTasks(previousTasks);
      toast.error(error?.message || t("common.error"));
      refresh();
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setIsDragging(false)}
      >
      {isMobile ? (
        <SortableContext
          items={pageItems.map((task) => getTaskSortableId(task))}
          strategy={verticalListSortingStrategy}
        >
          <AdminMobileCardStack>
            {pageItems.map((task) => (
              <Row
                key={getTaskSortableId(task)}
                task={task}
                reorderEnabled={reorderEnabled}
                asCard
              />
            ))}
          </AdminMobileCardStack>
        </SortableContext>
      ) : (
      <div className="admin-responsive-table-wrap overflow-x-auto">
      <Table container={false} className="admin-responsive-table admin-sortable-table table-fixed min-w-[840px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-3" aria-label={t("common.sort")}></TableHead>
            <TableHead className="w-[18%]">{t("common.name")}</TableHead>
            <TableHead className="w-[32%]">{t("common.server")}</TableHead>
            <TableHead className="w-[20%]">{t("ping.target")}</TableHead>
            <TableHead className="w-[8%]">{t("ping.type")}</TableHead>
            <TableHead className="w-[8%]">{t("ping.interval")}</TableHead>
            <TableHead className="w-[10%]">{t("common.action")}</TableHead>
          </TableRow>
        </TableHeader>
          <SortableContext
            items={pageItems.map((task) => getTaskSortableId(task))}
            strategy={verticalListSortingStrategy}
          >
            <TableBody>
              {pageItems.map((task) => (
                <Row
                  key={getTaskSortableId(task)}
                  task={task}
                  reorderEnabled={reorderEnabled}
                />
              ))}
            </TableBody>
          </SortableContext>
      </Table>
      </div>
      )}
      <AdminPagination
        page={page}
        total={localTasks.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        previousDropId={PREVIOUS_PAGE_DROP_ID}
        nextDropId={NEXT_PAGE_DROP_ID}
        dragging={isDragging}
        summary={false}
      />
      </DndContext>
    </>
  );
};

const Row = ({
  task,
  reorderEnabled,
  asCard = false,
}: {
  task: PingTask & { __allClientsDeleted?: boolean; __originalCount?: number };
  reorderEnabled: boolean;
  asCard?: boolean;
}) => {
  const { t } = useTranslation();
  const { refresh } = usePingTask();
  const { nodeDetail } = useNodeDetails();
  const isMobile = useIsMobile();
  const sortableId = getTaskSortableId(task);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sortableId, disabled: !reorderEnabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: task.name || "",
    type: task.type || "icmp",
    target: task.target || "",
    clients: task.clients || [],
    default_on: task.default_on || false,
    interval: task.interval || 60,
  });
  const serverNames =
    task.clients && task.clients.length > 0
      ? task.clients
          .map(
            (uuid) =>
              nodeDetail.find((node) => node.uuid === uuid)?.name || uuid,
          )
          .join(", ")
      : "";

  const submitEdit = (newForm: typeof form) => {
    if (!newForm.default_on && newForm.clients.length === 0) {
      toast.error(t("ping.default_on_description"));
      return;
    }
    setEditSaving(true);
    fetch("/api/admin/ping/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: [
          {
            id: task.id,
            name: newForm.name,
            type: newForm.type,
            target: newForm.target,
            default_on: newForm.default_on,
            clients: newForm.clients,
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
    fetch("/api/admin/ping/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [task.id] }),
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

  const serverValue = (
    <div className="min-w-0 overflow-hidden">
      <div
        className="truncate whitespace-nowrap leading-5"
        title={serverNames || undefined}
      >
        {serverNames || t("common.none")}
      </div>
      {task.default_on && (
        <div className="mt-1 truncate text-xs text-accent-11">
          {t("ping.default_on_short")}
        </div>
      )}
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
              <label>{t("ping.type")}</label>
              <Select.Root
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as any }))
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="icmp">ICMP</Select.Item>
                  <Select.Item value="tcp">TCP</Select.Item>
                  <Select.Item value="http">HTTP</Select.Item>
                </Select.Content>
              </Select.Root>
              <label>{t("ping.target")}</label>
              <TextField.Root
                value={form.target}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target: e.target.value }))
                }
                required
              />
              <label>{t("common.server")}</label>
              <Flex direction="column" gap="2">
                <NodeSelectorDialog
                  value={form.clients}
                  onChange={(v) => setForm((f) => ({ ...f, clients: v }))}
                />
                <label className="text-sm font-normal text-gray-500">
                  {t("common.selected", { count: form.clients.length })}
                </label>
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
              </Flex>
              <label>
                {t("ping.interval")} ({t("time.second")})
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
        ref={setNodeRef}
        sx={{ transform: style.transform, transition: style.transition }}
        title={task.name || "--"}
        headerExtra={
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={!reorderEnabled}
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--gray-9)] ${
              reorderEnabled
                ? "cursor-grab hover:bg-[var(--accent-a3)] hover:text-[var(--accent-11)] active:cursor-grabbing"
                : "cursor-not-allowed opacity-40"
            } touch-manipulation select-none`}
            style={{ touchAction: "none" }}
            title={t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")}
            aria-label={t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")}
          >
            <GripVertical size={18} />
          </button>
        }
        cells={[
          [t("common.server"), serverValue],
          [t("ping.target"), task.target || "--"],
          [t("ping.type"), task.type],
          [t("ping.interval"), String(task.interval ?? "--")],
        ]}
        actions={actionButtons}
      />
    );
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-12 px-3" data-label={t("common.sort", "排序")}>
        <div
          {...attributes}
          {...listeners}
          className={`cursor-move p-2 rounded hover:bg-accent-a3 transition-colors ${
            isMobile ? "touch-manipulation select-none" : ""
          }`}
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          title={
            isMobile
              ? t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")
              : undefined
          }
        >
          <MenuIcon size={isMobile ? 18 : 16} color={"var(--gray-8)"} />
        </div>
      </TableCell>
      <TableCell data-label={t("common.name")}>{task.name}</TableCell>
      <TableCell className="max-w-0" data-label={t("common.server")}>
        {serverValue}
      </TableCell>
      <TableCell data-label={t("ping.target")}>{task.target}</TableCell>
      <TableCell data-label={t("ping.type")}>{task.type}</TableCell>
      <TableCell data-label={t("ping.interval")}>{task.interval}</TableCell>
      <TableCell data-label={t("common.action")}>{actionButtons}</TableCell>
    </TableRow>
  );
};
