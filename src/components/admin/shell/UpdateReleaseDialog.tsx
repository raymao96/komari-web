import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowForward from "@mui/icons-material/ArrowForward";
import OpenInNew from "@mui/icons-material/OpenInNew";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";

import { LITE_BLUE, LITE_BLUE_HOVER } from "@/theme/brand";
import { GITHUB_ALERT_LABELS, remarkGithubAlerts } from "@/utils/githubMarkdown";
import {
  formatReleaseVersion,
  formatVersion,
  parseReleaseVersionHash,
  visibleReleaseBody,
  type GithubReleaseInfo,
  type SelfUpdateCapability,
  type UpdatePhase,
  type VersionInfo,
} from "./adminShellModel";

const ALERT_TONES: Record<string, { light: string; dark: string }> = {
  note: { light: "#0969da", dark: "#58a6ff" },
  tip: { light: "#1a7f37", dark: "#3fb950" },
  important: { light: "#8250df", dark: "#a371f7" },
  warning: { light: "#9a6700", dark: "#d4a72c" },
  caution: { light: "#cf222e", dark: "#f85149" },
};

const markdownComponents: Components = {
  p: ({ children }) => (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  li: ({ children }) => (
    <Typography
      component="li"
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.75, lineHeight: 1.7 }}
    >
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.25 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ m: 0, mt: 0.5, pl: 2.25 }}>
      {children}
    </Box>
  ),
  a: ({ children, href }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover">
      {children}
    </Link>
  ),
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 600, color: "text.primary" }}>
      {children}
    </Box>
  ),
  h1: ({ children }) => (
    <Typography variant="subtitle1" sx={{ mt: 1.5, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle1" sx={{ mt: 1.5, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" sx={{ mt: 1.25, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  hr: () => <Divider sx={{ my: 2 }} />,
  blockquote: ({ children, className }) => {
    const alert = /km-md-alert--(\w+)/.exec(className ?? "")?.[1];
    const tone = alert ? ALERT_TONES[alert] : undefined;
    if (tone) {
      return (
        <Box
          className={className}
          sx={(theme) => {
            const color = theme.palette.mode === "dark" ? tone.dark : tone.light;
            return {
              mt: 1.5,
              px: 1.5,
              py: 1.25,
              borderLeft: `4px solid ${color}`,
              borderRadius: "6px",
              bgcolor: `${color}14`,
              color,
              "& .MuiTypography-root": { color: "text.primary", mt: 0.5 },
              "& .MuiTypography-root:first-of-type": { mt: 0.75 },
            };
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.2 }}>
            {GITHUB_ALERT_LABELS[alert ?? ""] ?? alert}
          </Typography>
          {children}
        </Box>
      );
    }
    return (
      <Box
        component="blockquote"
        sx={{
          m: 0,
          mt: 1.5,
          pl: 1.5,
          borderLeft: "3px solid",
          borderColor: "divider",
          color: "text.secondary",
        }}
      >
        {children}
      </Box>
    );
  },
  table: ({ children }) => (
    <Box sx={{ mt: 1.5, overflowX: "auto" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          "& th, & td": {
            border: "1px solid",
            borderColor: "divider",
            px: 1,
            py: 0.75,
            fontSize: 13,
            textAlign: "left",
          },
          "& th": { fontWeight: 700, bgcolor: "action.hover" },
        }}
      >
        {children}
      </Box>
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={{
        mt: 1.5,
        mb: 0,
        overflowX: "auto",
        p: 1.5,
        borderRadius: "8px",
        bgcolor: "action.hover",
        fontSize: 13,
        lineHeight: 1.55,
        "& code": { px: 0, bgcolor: "transparent" },
      }}
    >
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box
      component="code"
      sx={{
        px: 0.5,
        borderRadius: "4px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "0.85em",
        bgcolor: "action.hover",
      }}
    >
      {children}
    </Box>
  ),
};

function ReleaseMarkdown({ body }: { body?: string | null }) {
  const content = visibleReleaseBody(body);
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkGithubAlerts]}
      skipHtml
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

type UpdateReleaseDialogProps = {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  currentVersion?: string | null;
  versionInfo: VersionInfo | null;
  latestRelease: GithubReleaseInfo | null;
  releasesSince: GithubReleaseInfo[];
  selfUpdate: SelfUpdateCapability | null;
  updatePhase: UpdatePhase;
  onUpdate: () => void;
};

export default function UpdateReleaseDialog({
  open,
  onClose,
  isMobile,
  currentVersion,
  versionInfo,
  latestRelease,
  releasesSince,
  selfUpdate,
  updatePhase,
  onUpdate,
}: UpdateReleaseDialogProps) {
  const { t } = useTranslation();
  const canSelfUpdate =
    versionInfo?.deployment === "linux" &&
    Boolean(selfUpdate?.supported) &&
    Boolean(parseReleaseVersionHash(latestRelease?.body));

  return (
    <Dialog
      data-testid="admin-update-dialog"
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: isMobile
              ? "calc(100vw - 1.5rem)"
              : "min(920px, calc(100vw - 3rem))",
            maxWidth: "none",
            maxHeight: "min(86dvh, 760px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: "8px",
            boxShadow:
              "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 12px 24px -4px rgba(145, 158, 171, 0.16)",
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, flexShrink: 0 }}>
        {t("common.update_available")}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto !important",
          py: 2.5,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            size="small"
            variant="outlined"
            label={formatVersion(currentVersion, versionInfo?.hash) || "—"}
          />
          <ArrowForward sx={{ fontSize: 16, color: "text.disabled" }} />
          <Chip
            size="small"
            label={formatReleaseVersion(latestRelease) || "—"}
            sx={{
              fontWeight: 700,
              color: LITE_BLUE,
              bgcolor: "rgba(7, 141, 238, 0.10)",
              "& .MuiChip-label": { px: 1.25 },
            }}
          />
        </Stack>
        {releasesSince.map((release, index) => (
          <Box key={release.html_url} data-testid="admin-update-release">
            {index > 0 ? <Divider sx={{ my: 2.5 }} /> : null}
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatReleaseVersion(release)}
              </Typography>
              {release.published_at ? (
                <Typography variant="caption" color="text.secondary">
                  {new Date(release.published_at).toLocaleString()}
                </Typography>
              ) : null}
            </Stack>
            <ReleaseMarkdown body={release.body} />
          </Box>
        ))}
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          flexWrap: "wrap",
          gap: 1,
          flexShrink: 0,
          bgcolor: "background.paper",
        }}
      >
        <Button onClick={onClose} color="inherit">
          {t("cancel", "取消")}
        </Button>
        {canSelfUpdate ? (
          <Button
            variant="contained"
            onClick={onUpdate}
            disabled={updatePhase !== "idle"}
            startIcon={
              updatePhase === "idle" ? undefined : (
                <CircularProgress size={16} color="inherit" />
              )
            }
            sx={{
              bgcolor: LITE_BLUE,
              "&:hover": { bgcolor: LITE_BLUE_HOVER },
            }}
          >
            {updatePhase === "preparing"
              ? t("common.self_update_preparing", "正在下载并校验")
              : updatePhase === "restarting"
                ? t("common.self_update_restarting_short", "正在更新")
                : t("common.update_now", "立即更新")}
          </Button>
        ) : (
          <Button
            variant="outlined"
            component="a"
            href={latestRelease?.html_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
          >
            GitHub
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
