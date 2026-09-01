import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import React from "react";

export type AdminMobileListCell = [string, React.ReactNode];

type AdminMobileListCardProps = {
  title: React.ReactNode;
  headerExtra?: React.ReactNode;
  cells: AdminMobileListCell[];
  actions?: React.ReactNode;
  style?: React.CSSProperties;
  sx?: SxProps<Theme>;
};

export const AdminMobileListCard = React.forwardRef<
  HTMLDivElement,
  AdminMobileListCardProps
>(function AdminMobileListCard(
  { title, headerExtra, cells, actions, style, sx },
  ref,
) {
  return (
    <Paper
      ref={ref}
      variant="outlined"
      style={style}
      sx={[
        {
          borderRadius: "8px",
          overflow: "hidden",
          borderColor: "divider",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ p: 1.5, alignItems: "center", bgcolor: "action.hover" }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {typeof title === "string" ? (
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 600,
                lineHeight: "24px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={title}
            >
              {title}
            </Typography>
          ) : (
            title
          )}
        </Box>
        {headerExtra ? <Box sx={{ flexShrink: 0 }}>{headerExtra}</Box> : null}
      </Stack>
      {cells.length > 0 ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {cells.map(([label, value], index) => {
            const lastOdd = cells.length % 2 === 1 && index === cells.length - 1;
            return (
              <Box
                key={`${label}-${index}`}
                sx={{
                  p: 1.35,
                  borderTop: 1,
                  borderRight: index % 2 === 0 && !lastOdd ? 1 : 0,
                  borderColor: "divider",
                  minWidth: 0,
                  gridColumn: lastOdd ? "1 / -1" : undefined,
                }}
              >
                <Typography color="text.secondary" sx={{ mb: 0.4, fontSize: 11.5 }}>
                  {label}
                </Typography>
                {typeof value === "string" ? (
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={value}
                  >
                    {value}
                  </Typography>
                ) : (
                  <Box sx={{ minWidth: 0, fontSize: 13.5, fontWeight: 400 }}>
                    {value}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ) : null}
      {actions ? (
        <Box sx={{ px: 1.25, py: 1, borderTop: 1, borderColor: "divider" }}>
          {actions}
        </Box>
      ) : null}
    </Paper>
  );
});

export function AdminMobileCardStack({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-mobile-card-stack">{children}</div>;
}
