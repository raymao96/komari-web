import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

type LoadingProps = {
  text?: string;
  children?: React.ReactNode;
  size?: number;
  fullscreen?: boolean;
  inline?: boolean;
};

const Loading = ({
  text,
  children,
  size = 28,
  fullscreen = false,
  inline = false,
}: LoadingProps) => {
  const { t } = useTranslation();

  return (
    <Stack
      role="status"
      aria-live="polite"
      data-admin-route-pending={inline ? undefined : "true"}
      spacing={1.5}
      sx={{
        width: "100%",
        minHeight: fullscreen ? "100dvh" : 160,
        px: 2,
        py: fullscreen ? 4 : 2.5,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        bgcolor: fullscreen ? "background.default" : "transparent",
        color: "text.secondary",
      }}
    >
      <CircularProgress size={size} thickness={4} />
      <Box>
        <Typography variant="body2">{t("loading")}</Typography>
        {text ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
            {text}
          </Typography>
        ) : null}
      </Box>
      {children ? <Box>{children}</Box> : null}
    </Stack>
  );
};

export default Loading;
