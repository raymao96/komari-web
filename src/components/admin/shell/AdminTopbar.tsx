import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Logout from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAccount } from "@/contexts/AccountContext";
import { logout } from "./useAdminShell";
import { ChromeIconButton, LanguageMenu, ThemeMenu } from "./ChromeActions";

type AdminTopbarProps = {
  isMobile: boolean;
  onOpenNav: () => void;
  updateAvailable: boolean;
  onOpenUpdate: () => void;
};

export default function AdminTopbar({
  isMobile,
  onOpenNav,
  updateAvailable,
  onOpenUpdate,
}: AdminTopbarProps) {
  const { t } = useTranslation();
  const { account } = useAccount();
  const navigate = useNavigate();
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const username = account?.username || "admin";

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{
        bgcolor: "background.default",
        backgroundImage: "none",
        color: "text.primary",
        boxShadow: "none",
        zIndex: 11,
        borderBottom: "1px solid",
        borderColor: "divider",
        transition: "none",
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 72 },
          px: { xs: 1, sm: 3 },
          alignItems: "center",
          pt: "var(--safe-area-top)",
        }}
      >
        {isMobile ? (
          <ChromeIconButton
            testId="mobile-sidebar-trigger"
            label={t("navigation.open")}
            onClick={onOpenNav}
          >
            <MenuIcon />
          </ChromeIconButton>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
          {updateAvailable ? (
            <Chip
              data-testid="admin-update-button"
              clickable
              color="error"
              size="small"
              label={t("common.update_available")}
              onClick={onOpenUpdate}
              sx={{
                height: 32,
                mr: 0.75,
                fontWeight: 700,
              }}
            />
          ) : null}
          <LanguageMenu />
          <ThemeMenu />
          <IconButton
            data-testid="admin-user-menu-button"
            aria-label={t("navigation.account", "Account")}
            onClick={(event: MouseEvent<HTMLElement>) =>
              setUserAnchor(event.currentTarget)
            }
            sx={{
              width: 40,
              height: 40,
              minWidth: 40,
              p: 0,
              borderRadius: "50%",
              ml: 0.5,
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: 14,
                fontWeight: 700,
                bgcolor: "text.primary",
                color: "background.paper",
              }}
            >
              {username.slice(0, 1).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={userAnchor}
            open={Boolean(userAnchor)}
            onClose={() => setUserAnchor(null)}
            disableAutoFocusItem
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  mt: 1,
                  minWidth: 180,
                  py: 0.75,
                  borderRadius: "8px",
                  boxShadow:
                    "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 12px 24px -4px rgba(145, 158, 171, 0.16)",
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem disabled sx={{ mx: 0.75, borderRadius: "8px", minHeight: 40 }}>
              {username}
            </MenuItem>
            <MenuItem
              data-testid="admin-account-security-menu-item"
              sx={{ mx: 0.75, my: 0.25, borderRadius: "8px", minHeight: 40 }}
              onClick={() => {
                setUserAnchor(null);
                void navigate("/admin/settings/account-security?tab=account");
              }}
            >
              {t("navigation.account_security")}
            </MenuItem>
            <MenuItem
              data-testid="admin-logout-menu-item"
              sx={{
                mx: 0.75,
                my: 0.25,
                borderRadius: "8px",
                minHeight: 40,
                color: "#B71D18",
                bgcolor: "rgba(255, 86, 48, 0.14)",
                "&:hover": {
                  color: "#8E1915",
                  bgcolor: "rgba(255, 86, 48, 0.22)",
                },
                "html.dark &": {
                  color: "#FF8A75",
                  bgcolor: "rgba(255, 86, 48, 0.18)",
                  "&:hover": {
                    color: "#FFB4A7",
                    bgcolor: "rgba(255, 86, 48, 0.26)",
                  },
                },
              }}
              onClick={() => {
                setUserAnchor(null);
                logout();
              }}
            >
              <Logout sx={{ fontSize: 18, mr: 1 }} />
              {t("common.logout", "Log out")}
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
