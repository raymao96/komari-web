import Box from "@mui/material/Box";

import { LITE_BLUE, LITE_NAME } from "@/theme/brand";

const [, wordmark] = LITE_NAME.split(".");

export default function SidebarBrand({
  mini,
  compact,
}: {
  mini: boolean;
  compact: boolean;
}) {
  return (
    <Box
      component="a"
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={LITE_NAME}
      data-testid="sidebar-brand"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        minHeight: 40,
        minWidth: 40,
        flexShrink: 0,
        color: "text.primary",
        textDecoration: "none",
        borderRadius: 1,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 4,
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
        sx={{
          width: mini || compact ? 32 : 36,
          height: mini || compact ? 32 : 36,
          display: "block",
          flexShrink: 0,
        }}
      >
        <rect x="3" y="3" width="11.5" height="11.5" rx="3.5" fill="currentColor" />
        <rect x="3" y="17.5" width="11.5" height="11.5" rx="3.5" fill="#FF6B63" />
        <rect x="17.5" y="17.5" width="11.5" height="11.5" rx="3.5" fill={LITE_BLUE} />
        <circle cx="23.25" cy="8.75" r="4" fill="#22B573" fillOpacity="0.12" />
        <circle cx="23.25" cy="8.75" r="2.25" fill="#22B573" />
      </Box>
      {mini ? null : (
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "3px",
            whiteSpace: "nowrap",
          }}
        >
          <Box
            component="span"
            sx={{
              color: LITE_BLUE,
              fontSize: compact ? 22 : 24,
              fontWeight: 650,
              lineHeight: 1.05,
              letterSpacing: "-0.6px",
            }}
          >
            {wordmark}
          </Box>
          <Box
            component="span"
            sx={{
              color: "text.secondary",
              fontSize: 9,
              fontWeight: 500,
              lineHeight: 1.25,
              letterSpacing: "0.1em",
            }}
          >
            SERVER MONITOR
          </Box>
        </Box>
      )}
    </Box>
  );
}
