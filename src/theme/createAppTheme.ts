import { alpha, createTheme } from "@mui/material/styles";

import { INPUT_FILL, INPUT_FILL_DARK, LITE_BLUE } from "@/theme/brand";

const GREY = {
  100: "#F9FAFB",
  200: "#F4F6F8",
  300: "#DFE3E8",
  400: "#C4CDD5",
  500: "#919EAB",
  600: "#637381",
  700: "#454F5B",
  800: "#1C252E",
  900: "#141A21",
};

const ACCENT = LITE_BLUE;

const FONT_FAMILY =
  '"Public Sans Variable", "Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const CARD_SHADOW_LIGHT =
  "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 12px 24px -4px rgba(145, 158, 171, 0.16)";
const CARD_SHADOW_DARK =
  "0 0 2px 0 rgba(0, 0, 0, 0.24), 0 12px 24px -4px rgba(0, 0, 0, 0.24)";

export function createAppTheme(mode: "light" | "dark") {
  const isLight = mode === "light";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: ACCENT,
        contrastText: "#FFFFFF",
      },
      info: {
        main: ACCENT,
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: isLight ? GREY[700] : GREY[200],
      },
      background: {
        default: isLight ? "#FFFFFF" : "#161C24",
        paper: isLight ? "#FFFFFF" : "#212B36",
      },
      text: {
        primary: isLight ? GREY[800] : "#FFFFFF",
        secondary: isLight ? GREY[600] : GREY[400],
      },
      divider: alpha(GREY[500], isLight ? 0.2 : 0.24),
      action: {
        hover: alpha(GREY[500], 0.08),
        selected: alpha(GREY[500], 0.16),
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: FONT_FAMILY,
      h3: { fontWeight: 700, fontSize: 32, lineHeight: 1.25 },
      h4: { fontWeight: 700, fontSize: 24, lineHeight: 1.5 },
      h5: { fontWeight: 700, fontSize: 20, lineHeight: 1.45 },
      h6: { fontWeight: 600, fontSize: 18, lineHeight: 1.4 },
      subtitle1: { fontWeight: 600, fontSize: 16 },
      subtitle2: { fontWeight: 600, fontSize: 14 },
      button: { textTransform: "none", fontWeight: 600, fontSize: 14 },
      caption: { fontSize: 13, fontWeight: 400, lineHeight: 1.45, letterSpacing: 0 },
      overline: {
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.08em",
        lineHeight: 1.5,
      },
      body1: { fontSize: 15, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0 },
      body2: { fontSize: 14, fontWeight: 400, lineHeight: 1.55, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            WebkitFontSmoothing: "auto",
            MozOsxFontSmoothing: "auto",
            textRendering: "optimizeLegibility",
          },
          body: {
            backgroundColor: isLight ? "#FFFFFF" : "#161C24",
            WebkitFontSmoothing: "auto",
            MozOsxFontSmoothing: "auto",
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.6,
          },
          "[data-admin-shell]": {
            fontSize: 15,
            lineHeight: 1.65,
            color: isLight ? "#1C252E" : "#FFFFFF",
            "--muted-foreground": isLight ? GREY[600] : GREY[400],
            "--gray-11": isLight ? GREY[600] : GREY[400],
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            minWidth: 0,
          },
          sizeSmall: {
            minHeight: 32,
            fontSize: 14,
            paddingLeft: 12,
            paddingRight: 12,
          },
          sizeMedium: {
            minHeight: 38,
            fontSize: 14,
            paddingLeft: 14,
            paddingRight: 14,
          },
          sizeLarge: {
            minHeight: 44,
            fontSize: 14.5,
          },
          contained: {
            "&.MuiButton-colorInherit": {
              backgroundColor: isLight ? GREY[800] : "#FFFFFF",
              color: isLight ? "#FFFFFF" : GREY[800],
              "&:hover": {
                backgroundColor: isLight ? GREY[900] : GREY[100],
              },
            },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: "none",
            border: `1px solid ${alpha(GREY[500], isLight ? 0.2 : 0.24)}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 8 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isLight ? INPUT_FILL : INPUT_FILL_DARK,
            transition: "border-color 180ms ease, box-shadow 180ms ease",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(GREY[500], isLight ? 0.2 : 0.32),
              transition: "border-color 180ms ease, border-width 180ms ease",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(GREY[500], isLight ? 0.4 : 0.48),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: ACCENT,
              borderWidth: 1,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(ACCENT, isLight ? 0.1 : 0.16)}`,
            },
            "&.Mui-disabled": {
              backgroundColor: isLight
                ? alpha(GREY[500], 0.12)
                : alpha(GREY[500], 0.16),
            },
            "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(GREY[500], isLight ? 0.16 : 0.2),
            },
          },
          input: {
            padding: "11px 12px",
            fontSize: 14,
            lineHeight: "22px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            color: isLight ? GREY[800] : "#FFFFFF",
            fontWeight: 400,
            "&::placeholder": {
              color: GREY[500],
              opacity: 1,
            },
          },
          sizeSmall: {
            "& .MuiInputBase-input": {
              padding: "9px 12px",
              fontSize: 14,
              lineHeight: "22px",
              height: 40,
              boxSizing: "border-box",
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 400,
            color: isLight ? GREY[600] : GREY[400],
            "&.Mui-focused": { color: ACCENT },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            paddingLeft: 10,
            paddingRight: 10,
            "&.Mui-selected": {
              backgroundColor: isLight ? alpha(ACCENT, 0.08) : alpha(ACCENT, 0.16),
              color: ACCENT,
              boxShadow: "none",
              "&:hover": {
                backgroundColor: isLight ? alpha(ACCENT, 0.12) : alpha(ACCENT, 0.2),
              },
            },
          },
        },
      },
      MuiAppBar: {
        defaultProps: { color: "inherit", elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isLight ? "#FFFFFF" : "#161C24",
            transition: "none",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: "none",
            backgroundImage: "none",
            backgroundColor: isLight ? "#FFFFFF" : "#161C24",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: isLight ? GREY[600] : GREY[400],
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: "50%",
            "& svg": {
              width: 20,
              height: 20,
              flexShrink: 0,
            },
            "&.MuiIconButton-colorError": {
              color: "#FF5630",
              "&:hover": {
                color: isLight ? "#B71D18" : "#FFAC82",
                backgroundColor: alpha("#FF5630", isLight ? 0.08 : 0.16),
              },
            },
          },
          sizeSmall: {
            width: 28,
            height: 28,
            "& svg": {
              width: 16,
              height: 16,
            },
          },
        },
      },
      MuiMenu: {
        defaultProps: {
          marginThreshold: 8,
          transitionDuration: { enter: 220, exit: 150 },
          slotProps: {
            paper: {
              elevation: 0,
              className: "km-admin-menu",
            },
          },
        },
        styleOverrides: {
          paper: {
            borderRadius: 8,
            padding: 4,
            border: `1px solid ${alpha(GREY[500], isLight ? 0.2 : 0.24)}`,
            backgroundImage: "none",
            boxShadow: isLight ? CARD_SHADOW_LIGHT : CARD_SHADOW_DARK,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            minHeight: 38,
            margin: 0,
            paddingLeft: 10,
            paddingRight: 10,
            transition: "color 150ms ease, background-color 150ms ease",
          },
        },
      },
      MuiDialog: {
        defaultProps: {
          transitionDuration: { enter: 220, exit: 160 },
        },
        styleOverrides: {
          paper: {
            borderRadius: 8,
            border: `1px solid ${alpha(GREY[500], isLight ? 0.2 : 0.24)}`,
            backgroundImage: "none",
            boxShadow: isLight ? CARD_SHADOW_LIGHT : CARD_SHADOW_DARK,
          },
        },
      },
      MuiPopover: {
        defaultProps: {
          transitionDuration: { enter: 220, exit: 150 },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: "24px 24px 12px", fontSize: 18, fontWeight: 600 },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 8,
            overflow: "visible",
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: "16px 24px 24px", gap: 8 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: alpha(GREY[500], isLight ? 0.16 : 0.2),
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 400,
          },
          head: {
            height: 56,
            color: isLight ? GREY[600] : GREY[400],
            backgroundColor: isLight ? GREY[200] : alpha("#FFFFFF", 0.04),
            fontWeight: 600,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 48,
            textTransform: "none",
            fontSize: 14,
            fontWeight: 500,
            color: isLight ? GREY[600] : GREY[400],
            "&.Mui-selected": { color: isLight ? GREY[800] : "#FFFFFF", fontWeight: 600 },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 400,
            alignItems: "flex-start",
            "&.MuiAlert-standardWarning": {
              color: isLight ? "#7A4100" : "#FFD8A8",
              backgroundColor: isLight ? "#FFF5E6" : alpha("#FFAB00", 0.12),
            },
          },
          icon: {
            display: "flex",
            alignItems: "center",
            marginRight: 12,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 0,
            paddingRight: 0,
            "& svg": {
              display: "block",
              fontSize: 22,
            },
          },
          message: {
            paddingTop: 8,
            paddingBottom: 8,
            lineHeight: 1.5,
          },
        },
      },
      MuiAlertTitle: {
        styleOverrides: {
          root: {
            marginTop: 0,
            marginBottom: 4,
            lineHeight: 1.5,
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 48,
            alignItems: "center",
          },
          content: {
            margin: "12px 0",
            alignItems: "center",
          },
          expandIconWrapper: {
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "center",
          },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
      MuiCheckbox: {
        defaultProps: { color: "primary" },
        styleOverrides: {
          root: {
            color: GREY[500],
            "&.Mui-checked, &.MuiCheckbox-indeterminate": {
              color: ACCENT,
            },
          },
        },
      },
      MuiSwitch: {
        defaultProps: { color: "primary" },
        styleOverrides: {
          root: {
            width: 38,
            height: 22,
            padding: 0,
            overflow: "visible",
          },
          switchBase: {
            padding: 3,
            transitionDuration: "180ms",
            "&.Mui-checked": {
              transform: "translateX(16px)",
              color: "#FFFFFF",
              "+ .MuiSwitch-track": {
                backgroundColor: ACCENT,
                opacity: 1,
              },
            },
          },
          thumb: {
            width: 16,
            height: 16,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.24)",
          },
          track: {
            borderRadius: 11,
            backgroundColor: isLight ? GREY[400] : GREY[600],
            opacity: 1,
            transition: "background-color 180ms ease",
          },
        },
      },
      MuiRadio: {
        defaultProps: { color: "primary" },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            display: "flex",
            alignItems: "center",
            minHeight: 40,
            boxSizing: "border-box",
          },
          icon: {
            transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          },
        },
      },
      MuiAutocomplete: {
        defaultProps: {
          openOnFocus: true,
          clearOnEscape: true,
        },
        styleOverrides: {
          root: {
            "& .MuiAutocomplete-popupIndicator": {
              width: 30,
              height: 30,
              borderRadius: 6,
              transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
            },
            "& .MuiAutocomplete-popupIndicatorOpen": {
              transform: "rotate(180deg)",
            },
          },
          paper: {
            marginTop: 4,
            padding: 4,
            borderRadius: 8,
            border: `1px solid ${alpha(GREY[500], isLight ? 0.2 : 0.24)}`,
            backgroundImage: "none",
            boxShadow: isLight ? CARD_SHADOW_LIGHT : CARD_SHADOW_DARK,
          },
          listbox: {
            padding: 0,
            maxHeight: 280,
            "& .MuiAutocomplete-option": {
              minHeight: 38,
              margin: 0,
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 14,
              transition: "color 150ms ease, background-color 150ms ease",
            },
          },
        },
      },
    },
  });
}
