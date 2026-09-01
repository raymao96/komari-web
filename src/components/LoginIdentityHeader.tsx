import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { getAppAssetUrl } from "@/utils/assetUrl";

type LoginIdentityHeaderProps = {
  dialog?: boolean;
};

export default function LoginIdentityHeader({
  dialog = false,
}: LoginIdentityHeaderProps) {
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const title = publicInfo?.sitename || "Lite";

  return (
    <Box
      component="header"
      data-login-identity={dialog ? "dialog" : "page"}
      sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5 }}
    >
      <Box
        component="img"
        src={getAppAssetUrl("assets/logo.png?v=lite-icon-0e86dd")}
        alt=""
        sx={{ width: 48, height: 48, flexShrink: 0, objectFit: "contain" }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("login.desc")}
        </Typography>
      </Box>
    </Box>
  );
}
