import type { MenuProps } from "@mui/material/Menu";

export const ADMIN_MENU_FONT_SIZE = 14;

export function getAdminMenuProps(minWidth?: number): Partial<MenuProps> {
  return {
    disableRestoreFocus: true,
    marginThreshold: 8,
    transitionDuration: { enter: 220, exit: 150 },
    anchorOrigin: { vertical: "bottom", horizontal: "left" },
    transformOrigin: { vertical: "top", horizontal: "left" },
    slotProps: {
      transition: {
        easing: {
          enter: "cubic-bezier(0.22, 1, 0.36, 1)",
          exit: "cubic-bezier(0.4, 0, 1, 1)",
        },
      },
      paper: {
        className: "km-admin-menu",
        sx: {
          mt: "4px",
          ml: 0,
          minWidth,
          p: "4px",
          overflowX: "hidden",
          overflowY: "auto",
          maxHeight: "min(320px, calc(100dvh - 16px))",
          borderRadius: "8px",
          bgcolor: "background.paper",
          backgroundImage: "none",
          willChange: "opacity, transform",
          boxShadow:
            "0 0 2px 0 rgba(145, 158, 171, 0.24), -20px 20px 40px -4px rgba(145, 158, 171, 0.24)",
        },
      },
      list: {
        dense: true,
        sx: {
          p: 0,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          "& .MuiMenuItem-root": {
            minHeight: 38,
            m: 0,
            px: 1,
            py: 0.75,
            borderRadius: "6px",
            fontSize: ADMIN_MENU_FONT_SIZE,
            fontWeight: 400,
            lineHeight: 1.2,
            boxShadow: "none",
            transition: "color 150ms ease, background-color 150ms ease",
          },
        },
      },
    },
  };
}

export const adminMenuProps = getAdminMenuProps();
