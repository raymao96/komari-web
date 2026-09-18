import Loading from "@/components/loading";
import {
  useCommandClipboard,
  type CommandClipboard,
} from "@/contexts/CommandClipboardContext";
import { useTerminal } from "@/contexts/TerminalContext";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { PlusIcon, Trash2Icon, Edit2Icon } from "@/components/admin/muiIcons";
import { remoteConfirmDialogProps } from "./remoteChrome";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type CommandClipboardPanelProps = {
  className?: string;
};

const CommandClipboardContent = ({ className }: CommandClipboardPanelProps) => {
  const { t } = useTranslation();
  const { commands, loading, error } = useCommandClipboard();
  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <div>{t("command_clipboard.load_failed", { message: error.message })}</div>;
  }
  return (
    <Stack
      className={`command-clipboard-container${className ? ` ${className}` : ""}`}
      spacing={1}
      sx={{
        height: "100%",
        minHeight: 0,
        overflowX: "clip",
        overflowY: "auto",
        justifyContent: "flex-start",
        "& > .remote-command-card": { flex: "0 0 auto" },
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flex: "0 0 auto" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
          {t("command_clipboard.title")}
        </Typography>
        <AddButton />
      </Stack>
      {[...commands]
        .sort((a, b) => b.weight - a.weight)
        .map((item) => (
          <CommandCard key={item.id} {...item} />
        ))}
    </Stack>
  );
};

const CommandClipboardPanel = (props: CommandClipboardPanelProps) => (
  <CommandClipboardContent {...props} />
);

const AddButton = () => {
  const { t } = useTranslation();
  const [isOpen, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const { addCommand } = useCommandClipboard();
  const handleAddCommand = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const text = formData.get("text") as string;
    const remark = formData.get("remark") as string;
    const weight = formData.get("weight") as string;

    try {
      setAdding(true);
      await addCommand(name, text, remark, weight ? parseInt(weight) : 0);
      setOpen(false);
      toast.success(t("common.added_successfully"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unexpected_error"));
    } finally {
      setAdding(false);
    }
  };
  return (
    <>
      <IconButton size="small" aria-label={t("common.add")} onClick={() => setOpen(true)}>
        <PlusIcon size="16" />
      </IconButton>
      <Dialog open={isOpen} onClose={() => setOpen(false)} {...remoteConfirmDialogProps}>
        <Box
          component="form"
          onSubmit={handleAddCommand}
          sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          <DialogTitle>{t("common.add")}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
            <TextField size="small" autoFocus required id="add-command-name" name="name" label={t("common.name")} fullWidth />
            <TextField size="small" required id="add-command-text" name="text" label={t("common.content")} fullWidth multiline minRows={3} />
            <TextField size="small" id="add-command-remark" name="remark" label={t("common.remark")} fullWidth />
            <TextField size="small" defaultValue={0} type="number" id="add-command-weight" name="weight" label={t("common.weight")} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={adding}>{t("common.add")}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

const DeleteButton = ({ id }: { id: number }) => {
  const { t } = useTranslation();
  const { deleteCommand } = useCommandClipboard();
  const [isOpen, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteCommand(id);
      toast.success(t("common.deleted_successfully"));
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unexpected_error"));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <>
      <IconButton size="small" aria-label={t("common.delete")} color="error" onClick={() => setOpen(true)}>
        <Trash2Icon size="16" />
      </IconButton>
      <Dialog open={isOpen} onClose={() => setOpen(false)} {...remoteConfirmDialogProps}>
        <DialogTitle>{t("common.delete")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("common.confirm_delete")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleDelete} disabled={deleting} color="error" variant="contained">
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const EditButton = ({ id, name, text, remark, weight }: CommandClipboard) => {
  const { t } = useTranslation();
  const { updateCommand } = useCommandClipboard();
  const [isOpen, setOpen] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const newName = formData.get("name") as string;
    const newText = formData.get("text") as string;
    const newRemark = formData.get("remark") as string;
    const nextWeight = formData.get("weight") as string;
    try {
      setUpdating(true);
      await updateCommand(
        id,
        newName,
        newText,
        newRemark,
        nextWeight ? parseInt(nextWeight) : 0,
      );
      setOpen(false);
      toast.success(t("common.updated_successfully"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unexpected_error"));
    } finally {
      setUpdating(false);
    }
  };
  return (
    <>
      <IconButton size="small" aria-label={t("common.edit")} onClick={() => setOpen(true)}>
        <Edit2Icon size="16" />
      </IconButton>
      <Dialog open={isOpen} onClose={() => setOpen(false)} {...remoteConfirmDialogProps}>
        <Box
          component="form"
          onSubmit={handleUpdate}
          sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          <DialogTitle>{t("common.edit")}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
            <TextField size="small" id="edit-command-name" name="name" label={t("common.name")} defaultValue={name} fullWidth />
            <TextField size="small" id="edit-command-text" name="text" label={t("common.content")} defaultValue={text} fullWidth multiline minRows={3} />
            <TextField size="small" id="edit-command-remark" name="remark" label={t("common.remark")} defaultValue={remark} fullWidth />
            <TextField size="small" type="number" id="edit-command-weight" name="weight" label={t("common.weight")} defaultValue={weight} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={updating}>{t("common.update")}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

const CommandCard = (item: CommandClipboard) => {
  const { t } = useTranslation();
  const { sendCommand } = useTerminal();
  const remark = item.remark?.trim();
  return (
    <Card className="remote-command-card" variant="outlined">
      <CardContent sx={{ p: "12px 14px !important" }}>
        <Stack spacing={0.75}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{item.name}</Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => sendCommand(item.text)}
              sx={{ minHeight: 26, px: 1, fontSize: 12 }}
            >
              {t("common.execute")}
            </Button>
          </Stack>
          <Typography
            component="pre"
            className="command-text"
            sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12, lineHeight: 1.45 }}
          >
            {item.text.length > 300
              ? item.text.substring(0, 300) +
                `\n...(${t("common.have_been_omitted", {
                  count: item.text.length - 300,
                })})`
              : item.text}
          </Typography>
          {remark ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              {remark}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={0} sx={{ justifyContent: "flex-end" }}>
            <EditButton {...item} />
            <DeleteButton id={item.id} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CommandClipboardPanel;
