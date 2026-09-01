import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getAppAssetUrl } from "@/utils/assetUrl";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <Box
      component="main"
      sx={{
        minHeight: "var(--app-viewport-height, 100vh)",
        display: "grid",
        placeItems: "center",
        px: 2.5,
        py: 6,
        bgcolor: "background.default",
      }}
    >
      <Stack
        spacing={2}
        sx={{
          width: "100%",
          maxWidth: 520,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Box
          component="img"
          src={getAppAssetUrl("assets/logo.png?v=lite-icon-0e86dd")}
          alt="Lite"
          sx={{ width: 64, height: 64, mb: 1, objectFit: "contain" }}
        />

        <Typography
          component="h1"
          sx={{
            color: "text.primary",
            fontSize: { xs: 64, sm: 80 },
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 0,
          }}
        >
          404
        </Typography>
        <Typography
          variant="body1"
          sx={{ maxWidth: 420, color: "text.secondary" }}
        >
          {t("page_not_found")}
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
          sx={{ mt: 1, minHeight: 38, px: 2.5 }}
        >
          {t("go_to_home")}
        </Button>
      </Stack>
    </Box>
  );
}
