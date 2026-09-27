import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { Edit2Icon, PlusIcon, Trash2Icon, X } from "@/components/admin/muiIcons";
import { IconButton, Select } from "@/components/admin/ui";
import {
  useCommandClipboard,
  type CommandClipboard,
} from "@/contexts/CommandClipboardContext";
import { toast } from "sonner";

type SavedExecCommandsProps = {
  onApply: (command: string) => void;
};

export function SavedExecCommands({ onApply }: SavedExecCommandsProps) {
  const { t } = useTranslation();
  const { commands, addCommand, updateCommand, deleteCommand } = useCommandClipboard();
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState<CommandClipboard | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...commands].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name)),
    [commands],
  );
  const selected = sorted.find((item) => String(item.id) === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !selected) setSelectedId("");
  }, [selected, selectedId]);

  const applySelection = (id: string) => {
    setSelectedId(id);
    const command = sorted.find((item) => String(item.id) === id);
    if (command) onApply(command.text);
  };

  const saveCommand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const text = String(formData.get("text") ?? "");
    const remark = String(formData.get("remark") ?? "").trim();
    const weight = Number.parseInt(String(formData.get("weight") ?? "0"), 10) || 0;
    if (!name || !text.trim()) return;
    try {
      setSaving(true);
      if (editor === "new") {
        await addCommand(name, text, remark, weight);
        onApply(text);
        toast.success(t("common.added_successfully"));
      } else if (editor) {
        await updateCommand(editor.id, name, text, remark, weight);
        onApply(text);
        toast.success(t("common.updated_successfully"));
      }
      setEditor(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const removeSelected = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await deleteCommand(selected.id);
      setSelectedId("");
      setConfirmDelete(false);
      toast.success(t("common.deleted_successfully"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="shrink-0 text-sm text-muted-foreground">{t("exec.savedCommand")}</span>
        <div className="flex min-w-0 flex-1 items-center gap-1">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Select.Root
          value={selectedId}
          onValueChange={applySelection}
          disabled={sorted.length === 0}
          className={selected ? "w-full [&_.MuiSelect-select]:!pr-12" : "w-full"}
        >
          <Select.Trigger
            className="w-full"
            placeholder={
              sorted.length === 0
                ? t("exec.savedCommandEmpty")
                : t("exec.savedCommandPlaceholder")
            }
          />
          <Select.Content>
            {sorted.map((item) => (
              <Select.Item key={item.id} value={String(item.id)}>
                {item.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {selected ? (
          <div
            className="absolute right-7 top-1/2 z-10 -translate-y-1/2"
            onMouseDown={(event) => event.preventDefault()}
          >
            <IconButton
              title={t("exec.savedCommandClear")}
              variant="ghost"
              className="!h-6 !w-6 !min-w-0"
              onClick={() => {
                setSelectedId("");
                onApply("");
              }}
            >
              <X size={14} />
            </IconButton>
          </div>
        ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            title={t("common.add")}
            variant="ghost"
            onClick={() => setEditor("new")}
          >
            <PlusIcon size={16} />
          </IconButton>
          <IconButton
            title={t("common.edit")}
            variant="ghost"
            disabled={!selected}
            onClick={() => selected && setEditor(selected)}
          >
            <Edit2Icon size={16} />
          </IconButton>
          <IconButton
            title={t("common.delete")}
            variant="ghost"
            color="red"
            disabled={!selected}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon size={16} />
          </IconButton>
        </div>
        </div>
      </div>

      <Dialog open={editor !== null} onClose={() => setEditor(null)} fullWidth maxWidth="sm">
        <Box
          component="form"
          onSubmit={saveCommand}
          sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          <DialogTitle>{editor === "new" ? t("common.add") : t("common.edit")}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
            <TextField
              size="small"
              autoFocus
              required
              name="name"
              label={t("common.name")}
              defaultValue={editor !== "new" ? editor?.name ?? "" : ""}
              fullWidth
            />
            <TextField
              size="small"
              required
              name="text"
              label={t("common.content")}
              defaultValue={editor !== "new" ? editor?.text ?? "" : ""}
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              size="small"
              name="remark"
              label={t("common.remark")}
              defaultValue={editor !== "new" ? editor?.remark ?? "" : ""}
              fullWidth
            />
            <TextField
              size="small"
              name="weight"
              type="number"
              label={t("common.weight")}
              defaultValue={editor !== "new" ? editor?.weight ?? 0 : 0}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditor(null)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editor === "new" ? t("common.add") : t("common.update")}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>{t("common.delete")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("common.confirm_delete")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</Button>
          <Button onClick={() => void removeSelected()} disabled={saving} color="error" variant="contained">
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
