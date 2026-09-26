import Box from "@mui/material/Box";
import { useState } from "react";

import { LITE_BLUE } from "@/theme/brand";

export const REMOTE_COMPACT_QUERY = "(max-width: 900px)";
export const UNREPORTED_ADDRESS = "—";
export const remoteConfirmDialogProps = {
  fullWidth: true,
  maxWidth: "xs" as const,
  scroll: "body" as const,
  sx: { zIndex: 1400 },
  slotProps: {
    backdrop: { className: "remote-confirm-backdrop" },
    paper: { className: "remote-confirm-paper" },
  },
};

export function remoteKeyboardInsetPx(
  viewport: Pick<VisualViewport, "height" | "offsetTop"> | null | undefined = window.visualViewport,
  innerHeight = window.innerHeight,
) {
  if (!viewport) return 0;
  return Math.max(0, Math.round(innerHeight - viewport.height - viewport.offsetTop));
}

export function syncRemoteVisualViewport(root: HTMLElement = document.documentElement) {
  root.style.setProperty("--remote-keyboard-inset", `${remoteKeyboardInsetPx()}px`);
}

export function clearRemoteVisualViewport(root: HTMLElement = document.documentElement) {
  root.style.removeProperty("--remote-keyboard-inset");
  root.style.removeProperty("--remote-vv-top");
  root.style.removeProperty("--remote-vv-left");
  root.style.removeProperty("--remote-vv-height");
  root.style.removeProperty("--remote-vv-width");
}

export function readDocumentFaviconHref() {
  const link = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"]',
  );
  return link?.getAttribute("href") || "/favicon.ico";
}

export function firstNodeTag(tags?: string) {
  return (tags || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .find(Boolean) || "";
}

export function SiteFavicon({
  size = 29,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [src] = useState(readDocumentFaviconHref);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Box
        className={className}
        aria-hidden="true"
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: "7px",
          bgcolor: LITE_BLUE,
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      className={className}
      src={src}
      alt=""
      onError={() => setFailed(true)}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "7px",
        objectFit: "cover",
        bgcolor: "background.paper",
      }}
    />
  );
}
