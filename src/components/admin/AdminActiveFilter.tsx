import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { Filter, X } from "@/components/admin/muiIcons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function AdminActiveFilter({
  label,
  clearTo,
}: {
  label: string;
  clearTo: string;
}) {
  const { t } = useTranslation();
  return (
    <Alert
      severity="info"
      icon={<Filter size={18} />}
      className="admin-active-filter w-full"
      action={
        <Button
          component={Link}
          to={clearTo}
          color="inherit"
          size="small"
          startIcon={<X size={14} />}
          sx={{ whiteSpace: "nowrap" }}
        >
          {t("admin_filter.clear", "清除筛选")}
        </Button>
      }
      sx={{
        alignItems: "center",
        borderRadius: "8px",
        bgcolor: "rgba(7, 141, 238, 0.08)",
        color: "text.primary",
        "& .MuiAlert-icon": { color: "info.main" },
      }}
    >
      {t("admin_filter.current", "当前筛选")}：<strong>{label}</strong>
    </Alert>
  );
}
