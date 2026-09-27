import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export default function LastSignInMethodDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("settings.sign_on.keep_one_title")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {t("settings.sign_on.keep_one_message")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {t("settings.sign_on.keep_one_ack")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
