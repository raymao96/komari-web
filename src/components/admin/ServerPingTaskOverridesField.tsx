import React from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AppDialogContent,
  Button,
  Dialog,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@/components/admin/ui";
import { SettingCard } from "@/components/admin/SettingCard";
import { Selector } from "@/components/Selector";
import { ArrowDown, ArrowUp, Search } from "@/components/admin/muiIcons";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { usePingTask, type PingTask } from "@/contexts/PingTaskContext";
import { compareNodesByBackendOrder } from "@/lib/nodeOrder";
import {
  HOME_PROBE_TASK_LIMIT,
  normalizeHomeProbeTaskIds,
  orderHomeProbePickerTasks,
  parseHomeProbeTaskOverrides,
} from "@/utils/homeProbeTasks";

type Props = {
  title?: string;
  description?: string;
  value: unknown;
  onChange: (value: Record<string, number[]>) => void;
};

function sameClientId(left: string, right: string): boolean {
  return left === right || left.toLowerCase() === right.toLowerCase();
}

function taskAssignedToNode(task: PingTask, uuid: string): boolean {
  if (!uuid) return false;
  return (task.clients || []).some((client) => sameClientId(String(client), uuid));
}

function overrideIdsForNode(overrides: Record<string, number[]>, uuid: string): number[] {
  if (overrides[uuid]) return overrides[uuid];
  const lower = uuid.toLowerCase();
  for (const [key, ids] of Object.entries(overrides)) {
    if (key.toLowerCase() === lower) return ids;
  }
  return [];
}

function taskLabel(task: PingTask): string {
  return String(task.name || task.target || task.id || "");
}

export default function ServerPingTaskOverridesField({
  title,
  description,
  value,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const { nodeDetail, isLoading: nodesLoading } = useNodeDetails();
  const { pingTasks, isLoading: tasksLoading } = usePingTask();
  const overrides = React.useMemo(() => parseHomeProbeTaskOverrides(value), [value]);
  const tasks = React.useMemo(
    () => (pingTasks ?? []).filter((task) => Number(task.id) > 0),
    [pingTasks],
  );
  const [search, setSearch] = React.useState("");
  const [editingUuid, setEditingUuid] = React.useState<string | null>(null);

  const nodes = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = [...nodeDetail].sort(compareNodesByBackendOrder);
    if (!keyword) return list;
    return list.filter((node) =>
      [node.name, node.uuid].some((item) => String(item || "").toLowerCase().includes(keyword)),
    );
  }, [nodeDetail, search]);

  const editingNode = nodeDetail.find((node) => node.uuid === editingUuid);
  const assignedTasks = React.useMemo(
    () => (editingUuid ? tasks.filter((task) => taskAssignedToNode(task, editingUuid)) : []),
    [editingUuid, tasks],
  );

  const commitNode = (uuid: string, ids: number[]) => {
    const next = { ...overrides };
    const currentKey =
      Object.keys(next).find((key) => sameClientId(key, uuid)) || uuid;
    if (ids.length === 0) {
      delete next[currentKey];
    } else {
      if (currentKey !== uuid) delete next[currentKey];
      next[uuid] = ids.slice(0, HOME_PROBE_TASK_LIMIT);
    }
    onChange(next);
  };

  return (
    <SettingCard title={title} description={description} direction="column">
      <div className="mt-3 w-full min-w-0 max-w-full overflow-hidden">
        <TextField.Root
          className="flex items-center gap-1"
          placeholder={t("theme.home_probe_search")}
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
        </TextField.Root>
        <div className="mt-3 max-h-[420px] w-full overflow-x-hidden overflow-y-auto rounded-md border border-[var(--gray-a5)]">
          {nodesLoading || tasksLoading ? (
            <div className="px-3 py-6 text-sm text-[var(--gray-11)]">{t("common.loading")}</div>
          ) : nodes.length === 0 ? (
            <div className="px-3 py-6 text-sm text-[var(--gray-11)]">{t("common.none")}</div>
          ) : (
            nodes.map((node) => {
              const selected = overrideIdsForNode(overrides, node.uuid);
              const assigned = tasks.filter((task) => taskAssignedToNode(task, node.uuid));
              const names = selected
                .map((id) => assigned.find((task) => Number(task.id) === id))
                .filter((task): task is PingTask => Boolean(task))
                .map(taskLabel);
              const summary =
                selected.length > 0
                  ? names.join("、") || t("theme.home_probe_selected", { count: selected.length })
                  : t("theme.home_probe_default");
              return (
                <div
                  key={node.uuid}
                  className="flex w-full min-w-0 items-center gap-3 border-b border-[var(--gray-a4)] px-3 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium">{node.name || node.uuid}</div>
                    <div className="truncate text-xs text-[var(--gray-11)]" title={summary}>
                      {summary}
                    </div>
                  </div>
                  <Button className="shrink-0" variant="soft" onClick={() => setEditingUuid(node.uuid)}>
                    {t("theme.home_probe_set")}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
      <ServerPingTaskDialog
        open={Boolean(editingUuid)}
        nodeName={editingNode?.name || editingUuid || ""}
        assignedTasks={assignedTasks}
        selectedIds={editingUuid ? overrideIdsForNode(overrides, editingUuid) : []}
        onOpenChange={(open) => {
          if (!open) setEditingUuid(null);
        }}
        onSave={(ids) => {
          if (editingUuid) commitNode(editingUuid, ids);
          setEditingUuid(null);
        }}
        onReset={() => {
          if (editingUuid) commitNode(editingUuid, []);
          setEditingUuid(null);
        }}
      />
    </SettingCard>
  );
}

function ServerPingTaskDialog({
  open,
  nodeName,
  assignedTasks,
  selectedIds,
  onOpenChange,
  onSave,
  onReset,
}: {
  open: boolean;
  nodeName: string;
  assignedTasks: PingTask[];
  selectedIds: number[];
  onOpenChange: (open: boolean) => void;
  onSave: (ids: number[]) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [temporary, setTemporary] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    if (selectedIds.length > 0) {
      setTemporary(selectedIds.map(String));
      return;
    }
    setTemporary(
      assignedTasks
        .slice(0, HOME_PROBE_TASK_LIMIT)
        .map((task) => String(task.id)),
    );
  }, [assignedTasks, open, selectedIds]);

  const move = (index: number, offset: number) => {
    const next = [...temporary];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setTemporary(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="480px">
        <Dialog.Title>
          {t("common.server")} - {nodeName}
        </Dialog.Title>
        <Flex direction="column" gap="3">
          <Text size="2" color="gray">
            {t("theme.home_probe_order_hint")}
          </Text>
          {assignedTasks.length === 0 ? (
            <Text size="2" color="gray">
              {t("theme.home_probe_empty")}
            </Text>
          ) : (
            <Selector
              value={temporary}
              onChange={setTemporary}
              maxCount={HOME_PROBE_TASK_LIMIT}
              onMaxReached={() =>
                toast.error(t("theme.home_probe_max", { count: HOME_PROBE_TASK_LIMIT }))
              }
              items={orderHomeProbePickerTasks(assignedTasks, temporary)}
              getId={(task) => String(task.id)}
              getLabel={(task) => {
                const id = String(task.id);
                const index = temporary.indexOf(id);
                return (
                  <Flex justify="between" align="center" gap="2" className="w-full">
                    <span className="min-w-0 truncate text-sm">
                      {index >= 0 ? `${index + 1}. ` : ""}
                      {taskLabel(task)}
                    </span>
                    {index >= 0 ? (
                      <span
                        className="flex shrink-0 items-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconButton
                          variant="ghost"
                          size="1"
                          disabled={index === 0}
                          title={t("theme.home_probe_move_up")}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={14} />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="1"
                          disabled={index === temporary.length - 1}
                          title={t("theme.home_probe_move_down")}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={14} />
                        </IconButton>
                      </span>
                    ) : null}
                  </Flex>
                );
              }}
              filterItem={(task, keyword) =>
                [task.name, task.target, task.type]
                  .join(" ")
                  .toLocaleLowerCase()
                  .includes(keyword.toLocaleLowerCase())
              }
              searchPlaceholder={t("common.search")}
              headerLabel={t("ping.task")}
              showHeaderSelectAll={false}
              hiddenDescription
            />
          )}
          <Flex justify="between" gap="2">
            <Button variant="soft" color="gray" onClick={onReset}>
              {t("theme.home_probe_reset")}
            </Button>
            <Flex gap="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button
                onClick={() => onSave(normalizeHomeProbeTaskIds(temporary))}
              >
                {t("common.done")}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </AppDialogContent>
    </Dialog.Root>
  );
}
