import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Close from "@mui/icons-material/Close";
import { Github } from "@/components/admin/muiIcons";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import LiteBrand from "@/components/LiteBrand";
import { getAppAssetUrl } from "@/utils/assetUrl";
import type { MenuItem as AdminMenuItem } from "@/types/menu";
import { iconMap } from "@/utils/iconHelper";
import { preloadAdminRoute } from "@/routes";
import { formatVersion } from "./adminShellModel";
import { ChromeIconButton } from "./ChromeActions";

function renderIcon(icon: string, label: string, active?: boolean) {
  const link = /^(https?:\/\/|\/|\.\/|\.\.\/)/.test(icon);
  if (link) {
    return (
      <Box
        component="img"
        src={icon}
        alt={label}
        sx={{
          width: 18,
          height: 18,
          objectFit: "contain",
          opacity: active ? 1 : 0.72,
        }}
      />
    );
  }
  const Icon = iconMap[icon];
  if (Icon) {
    return <Icon size={18} strokeWidth={1.75} />;
  }
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: 0.75,
        bgcolor: "action.selected",
      }}
    />
  );
}

function navActive(pathname: string, to: string) {
  return (
    to !== "/" &&
    (pathname === to || (to !== "/admin" && pathname.startsWith(to)))
  );
}

const miniItemSx = {
  mx: "auto",
  mb: 0.5,
  width: 48,
  height: 48,
  minHeight: 48,
  p: 0,
  justifyContent: "center",
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    mr: 0,
    justifyContent: "center",
  },
  "& .MuiListItemText-root": { display: "none" },
} as const;

const navIconSx = {
  minWidth: 30,
  width: 30,
  height: 18,
  my: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const navRowSx = {
  mx: 0.75,
  mb: 0.25,
  py: 0.5,
  px: 1.25,
  minHeight: 40,
  alignItems: "center",
} as const;

const nestedNavRowSx = {
  mx: 0.75,
  mb: 0.25,
  py: 0.5,
  pl: 2.75,
  pr: 1.25,
  minHeight: 38,
  alignItems: "center",
} as const;

function NavLinkItem({
  item,
  onNavigate,
  nested = false,
  mini = false,
}: {
  item: AdminMenuItem;
  onNavigate: () => void;
  nested?: boolean;
  mini?: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const label = item.rawLabel || t(item.labelKey);
  const isExternal = item.path.startsWith("http://") || item.path.startsWith("https://");
  const active = !isExternal && navActive(location.pathname, item.path);
  const openInNewTab =
    item.newTab === true || (isExternal && item.newTab !== false);
  const preload = () => {
    if (!isExternal && !item.reloadDocument) void preloadAdminRoute(item.path);
  };

  const itemSx = mini ? miniItemSx : nested ? nestedNavRowSx : navRowSx;

  const content = (
    <>
      <ListItemIcon
        sx={{
          ...navIconSx,
          color: active ? "text.primary" : "text.secondary",
        }}
      >
        {renderIcon(item.icon, label, active)}
      </ListItemIcon>
      <ListItemText
        sx={{ my: 0, display: "flex", alignItems: "center" }}
        primary={label}
        slotProps={{
          primary: {
            sx: {
              fontSize: 16,
              fontWeight: active ? 600 : 400,
              lineHeight: "20px",
              whiteSpace: "nowrap",
            },
          },
        }}
      />
    </>
  );

  const button = openInNewTab || item.reloadDocument ? (
    <ListItemButton
      component="a"
      href={item.path}
      data-admin-reload-document={item.reloadDocument ? "true" : undefined}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      onClick={onNavigate}
      selected={false}
      sx={itemSx}
    >
      {content}
    </ListItemButton>
  ) : (
    <ListItemButton
      component={Link}
      to={item.path}
      selected={active}
      onPointerEnter={preload}
      onFocus={preload}
      onTouchStart={preload}
      onClick={onNavigate}
      sx={itemSx}
    >
      {content}
    </ListItemButton>
  );

  if (!mini) return button;
  return (
    <Tooltip
      title={label}
      placement="right"
      arrow
      slotProps={{ transition: { timeout: 0 } }}
    >
      <Box>{button}</Box>
    </Tooltip>
  );
}

type MiniFlyout = {
  item: AdminMenuItem;
  anchorEl: HTMLElement;
};

const MiniGroupButton = memo(function MiniGroupButton({
  childActive,
  label,
  icon,
  onClick,
  buttonRef,
}: {
  childActive: boolean;
  label: string;
  icon: string;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  buttonRef: (node: HTMLElement | null) => void;
}) {
  return (
    <ListItemButton
      ref={buttonRef}
      selected={childActive}
      onClick={onClick}
      sx={miniItemSx}
      aria-haspopup="menu"
    >
      <ListItemIcon
        sx={{
          minWidth: 0,
          color: childActive ? "text.primary" : "text.secondary",
        }}
      >
        {renderIcon(icon, label, childActive)}
      </ListItemIcon>
    </ListItemButton>
  );
});

function MiniGroup({
  item,
  childActive,
  open,
  onOpen,
  onClose,
  onKeep,
  onCloseSoon,
}: {
  item: AdminMenuItem;
  childActive: boolean;
  open: boolean;
  onOpen: (anchorEl: HTMLElement) => void;
  onClose: () => void;
  onKeep: () => void;
  onCloseSoon: () => void;
}) {
  const { t } = useTranslation();
  const label = item.rawLabel || t(item.labelKey);
  const buttonRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const setButtonRef = useCallback((node: HTMLElement | null) => {
    buttonRef.current = node;
    if (node) {
      node.setAttribute("aria-expanded", openRef.current ? "true" : "false");
    }
  }, []);

  useEffect(() => {
    buttonRef.current?.setAttribute("aria-expanded", open ? "true" : "false");
  }, [open]);

  const onButtonClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const hoverMenu = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      ).matches;
      if (hoverMenu) {
        onOpen(event.currentTarget);
        return;
      }
      if (openRef.current) onClose();
      else onOpen(event.currentTarget);
    },
    [onOpen, onClose],
  );

  return (
    <Box
      data-admin-mini-group=""
      onMouseEnter={() => {
        onKeep();
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          return;
        }
        if (buttonRef.current) onOpen(buttonRef.current);
      }}
      onMouseLeave={onCloseSoon}
    >
      <MiniGroupButton
        childActive={childActive}
        label={label}
        icon={item.icon}
        onClick={onButtonClick}
        buttonRef={setButtonRef}
      />
    </Box>
  );
}

function MiniFlyoutMenu({
  flyout,
  onKeep,
  onClose,
  onCloseSoon,
  onNavigate,
}: {
  flyout: MiniFlyout | null;
  onKeep: () => void;
  onClose: () => void;
  onCloseSoon: () => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const open = Boolean(flyout);
  const item = flyout?.item ?? null;
  const [slide, setSlide] = useState(false);

  useEffect(() => {
    if (!open) {
      setSlide(false);
      return;
    }
    const timer = window.setTimeout(() => setSlide(true), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const apply = () => {
      const paper = document.querySelector(".admin-mini-nav-menu");
      if (!(paper instanceof HTMLElement)) return;
      paper.style.setProperty(
        "transition",
        slide
          ? "top 180ms cubic-bezier(0.22, 1, 0.36, 1), left 180ms cubic-bezier(0.22, 1, 0.36, 1)"
          : "none",
      );
    };
    apply();
    const id = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(id);
  }, [open, slide]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-admin-mini-group]")) return;
      if (target.closest(".admin-mini-nav-menu")) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, onClose]);

  const label = item ? item.rawLabel || t(item.labelKey) : "";

  return (
    <Popover
      open={open}
      anchorEl={flyout?.anchorEl ?? null}
      onClose={onClose}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      disableScrollLock
      hideBackdrop
      transitionDuration={0}
      marginThreshold={0}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        root: {
          sx: { pointerEvents: "none" },
        },
        paper: {
          elevation: 0,
          onMouseEnter: onKeep,
          onMouseLeave: onCloseSoon,
          className: `admin-mini-nav-menu${slide ? " admin-mini-nav-slide" : ""}`,
          sx: {
            ml: 1,
            minWidth: 200,
            py: 0.75,
            overflow: "hidden",
            pointerEvents: "auto",
            borderRadius: "8px",
            boxShadow:
              "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 12px 24px -4px rgba(145, 158, 171, 0.16)",
            "&&": {
              transition: slide
                ? "top 180ms cubic-bezier(0.22, 1, 0.36, 1), left 180ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
            },
          },
        },
      }}
    >
      {item ? (
        <Box
          key={item.path}
          sx={{
            animation: "adminMiniFlySwap 160ms cubic-bezier(0.22, 1, 0.36, 1)",
            "@keyframes adminMiniFlySwap": {
              from: { opacity: 0, transform: "translateY(6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              px: 2,
              py: 0.75,
              color: "text.secondary",
              lineHeight: "20px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Typography>
          <List disablePadding>
            {item.children?.map((child) => {
              const childLabel = child.rawLabel || t(child.labelKey);
              const isExternal =
                child.path.startsWith("http://") ||
                child.path.startsWith("https://");
              const active =
                !isExternal && navActive(location.pathname, child.path);
              const openInNewTab =
                child.newTab === true || (isExternal && child.newTab !== false);
              const content = (
                <>
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: active ? "text.primary" : "text.secondary",
                    }}
                  >
                    {renderIcon(child.icon, childLabel, active)}
                  </ListItemIcon>
                  <ListItemText
                    primary={childLabel}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: 16,
                          lineHeight: "20px",
                          fontWeight: active ? 600 : 400,
                          whiteSpace: "nowrap",
                        },
                      },
                    }}
                  />
                </>
              );
              const itemSx = { mx: 1, borderRadius: "8px", minHeight: 40 };
              if (openInNewTab || child.reloadDocument) {
                return (
                  <ListItemButton
                    key={child.path}
                    component="a"
                    href={child.path}
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                    data-admin-reload-document={
                      child.reloadDocument ? "true" : undefined
                    }
                    selected={active}
                    onClick={() => {
                      onClose();
                      onNavigate();
                    }}
                    sx={itemSx}
                  >
                    {content}
                  </ListItemButton>
                );
              }
              return (
                <ListItemButton
                  key={child.path}
                  component={Link}
                  to={child.path}
                  selected={active}
                  onPointerEnter={() => {
                    if (!isExternal) void preloadAdminRoute(child.path);
                  }}
                  onClick={() => {
                    onClose();
                    onNavigate();
                  }}
                  sx={itemSx}
                >
                  {content}
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      ) : null}
    </Popover>
  );
}

function SidebarVersionLabel({
  version,
  hash,
}: {
  version: string;
  hash?: string | null;
}) {
  const snapshot = version.match(/^snapshot-(.+)$/i);
  const normalizedHash = hash?.trim();
  const visibleHash =
    normalizedHash && normalizedHash !== "unknown" ? normalizedHash : null;

  if (snapshot) {
    return (
      <span className="min-w-0 text-sm font-normal leading-5">
        <span className="block">Snapshot</span>
        <span className="block break-words">
          {snapshot[1]}
          {visibleHash ? ` · ${visibleHash}` : ""}
        </span>
      </span>
    );
  }

  return (
    <span className="min-w-0 whitespace-nowrap text-base font-normal leading-5">
      {formatVersion(version, hash)}
    </span>
  );
}

type AdminSidebarProps = {
  menuItems: AdminMenuItem[];
  footerItems: AdminMenuItem[];
  isMobile: boolean;
  mini: boolean;
  onClose: () => void;
  onNavigate: () => void;
  currentVersion?: string;
  currentReleaseURL?: string;
  versionHash?: string | null;
  openGroups: Record<string, boolean>;
  onToggleGroup: (path: string) => void;
};

export default function AdminSidebar({
  menuItems,
  footerItems,
  isMobile,
  mini,
  onClose,
  onNavigate,
  currentVersion,
  currentReleaseURL,
  versionHash,
  openGroups,
  onToggleGroup,
}: AdminSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [miniFlyout, setMiniFlyout] = useState<MiniFlyout | null>(null);
  const miniCloseTimer = useRef<number | null>(null);

  const cancelMiniClose = useCallback(() => {
    if (miniCloseTimer.current != null) {
      window.clearTimeout(miniCloseTimer.current);
      miniCloseTimer.current = null;
    }
  }, []);

  const keepMiniFlyout = useCallback(() => {
    cancelMiniClose();
  }, [cancelMiniClose]);

  const closeMiniFlyout = useCallback(() => {
    cancelMiniClose();
    setMiniFlyout(null);
  }, [cancelMiniClose]);

  const closeMiniFlyoutSoon = useCallback(() => {
    cancelMiniClose();
    miniCloseTimer.current = window.setTimeout(() => {
      setMiniFlyout(null);
      miniCloseTimer.current = null;
    }, 140);
  }, [cancelMiniClose]);

  const openMiniFlyout = useCallback(
    (item: AdminMenuItem, anchorEl: HTMLElement) => {
      cancelMiniClose();
      setMiniFlyout((current) => {
        if (current?.item.path === item.path && current.anchorEl === anchorEl) {
          return current;
        }
        return { item, anchorEl };
      });
    },
    [cancelMiniClose],
  );

  useEffect(() => {
    if (!mini) closeMiniFlyout();
  }, [mini, closeMiniFlyout]);

  useEffect(() => () => cancelMiniClose(), [cancelMiniClose]);

  const renderGroup = (item: AdminMenuItem): ReactNode => {
    if (!item.children?.length) {
      return (
        <NavLinkItem
          key={item.path}
          item={item}
          mini={mini}
          onNavigate={onNavigate}
        />
      );
    }

    const childActive = item.children.some((child) =>
      navActive(location.pathname, child.path),
    );

    if (mini) {
      return (
        <MiniGroup
          key={item.path}
          item={item}
          childActive={childActive}
          open={miniFlyout?.item.path === item.path}
          onOpen={(anchorEl) => openMiniFlyout(item, anchorEl)}
          onClose={closeMiniFlyout}
          onKeep={keepMiniFlyout}
          onCloseSoon={closeMiniFlyoutSoon}
        />
      );
    }

    const open = Boolean(openGroups[item.path]);
    return (
      <Box key={item.path} sx={{ mb: 0.25 }}>
        <ListItemButton
          onClick={() => onToggleGroup(item.path)}
          selected={childActive && !open}
          sx={navRowSx}
        >
          <ListItemIcon
            sx={{
              ...navIconSx,
              color: childActive ? "text.primary" : "text.secondary",
            }}
          >
            {renderIcon(item.icon, item.rawLabel || t(item.labelKey), childActive)}
          </ListItemIcon>
          <ListItemText
            sx={{ my: 0, display: "flex", alignItems: "center" }}
            primary={item.rawLabel || t(item.labelKey)}
            slotProps={{
              primary: {
                sx: {
                  fontSize: 16,
                  fontWeight: childActive || open ? 600 : 400,
                  lineHeight: "20px",
                  whiteSpace: "nowrap",
                },
              },
            }}
          />
          <ExpandMore
            sx={{
              fontSize: 18,
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s",
            }}
          />
        </ListItemButton>
        <Collapse in={open} timeout={140} unmountOnExit={false}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, pt: 0.5, pb: 0.75 }}>
            {item.children.map((child) => (
              <NavLinkItem
                key={child.path}
                item={child}
                nested
                onNavigate={onNavigate}
              />
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const versionLabel = currentVersion
    ? `${t("common.version", "版本")}：${formatVersion(currentVersion, versionHash)}`
    : "";

  return (
    <Stack sx={{ height: "100%", bgcolor: "background.paper", position: "relative" }}>
      <Stack
        direction="row"
        spacing={mini ? 0 : 1}
        sx={{
          px: mini ? 1 : { xs: 1.25, sm: 1.5 },
          py: { xs: 1.5, sm: 2 },
          minHeight: { xs: 56, sm: 72 },
          alignItems: "center",
          justifyContent: mini ? "center" : "flex-start",
        }}
      >
        {isMobile ? (
          <ChromeIconButton
            testId="mobile-sidebar-close"
            label={t("close", "关闭导航")}
            onClick={() => onClose()}
          >
            <Close />
          </ChromeIconButton>
        ) : null}
        <Box
          component="a"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            color: "inherit",
            textDecoration: "none",
            lineHeight: 0,
          }}
        >
          <Box
            component="img"
            src={getAppAssetUrl("assets/logo.png?v=lite-icon-0e86dd")}
            alt=""
            sx={{ width: 32, height: 32, display: "block", objectFit: "contain" }}
          />
          {mini ? null : <LiteBrand size={isMobile ? "sm" : "md"} />}
        </Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <List disablePadding sx={{ px: mini ? 0 : 0 }}>
          {menuItems.map(renderGroup)}
        </List>
        {mini ? (
          <MiniFlyoutMenu
            flyout={miniFlyout}
            onKeep={keepMiniFlyout}
            onClose={closeMiniFlyout}
            onCloseSoon={closeMiniFlyoutSoon}
            onNavigate={onNavigate}
          />
        ) : null}
      </Box>

      <Box sx={{ py: 1 }}>
        <List disablePadding>
          {footerItems.map((item) => (
            <NavLinkItem
              key={item.path}
              item={item}
              mini={mini}
              onNavigate={onNavigate}
            />
          ))}
          {currentVersion && currentReleaseURL ? (
            mini ? (
              <Tooltip title={versionLabel} placement="right" arrow>
                <ListItemButton
                  data-testid="sidebar-version"
                  component="a"
                  href={currentReleaseURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={miniItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: "text.secondary" }}>
                    <Github size={18} strokeWidth={1.5} />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                data-testid="sidebar-version"
                component="a"
                href={currentReleaseURL}
                target="_blank"
                rel="noopener noreferrer"
                sx={navRowSx}
                title={versionLabel}
              >
                <ListItemIcon
                  sx={{
                    ...navIconSx,
                    color: "text.secondary",
                  }}
                >
                  <Github size={18} strokeWidth={1.5} />
                </ListItemIcon>
                <ListItemText
                  sx={{ my: 0, display: "flex", alignItems: "center", minHeight: 20 }}
                  primary={
                    <SidebarVersionLabel
                      version={currentVersion}
                      hash={versionHash}
                    />
                  }
                  slotProps={{
                    primary: {
                      component: "span",
                      sx: {
                        display: "flex",
                        alignItems: "center",
                        lineHeight: "20px",
                        fontSize: 16,
                        fontWeight: 500,
                      },
                    },
                  }}
                />
              </ListItemButton>
            )
          ) : null}
        </List>
      </Box>
    </Stack>
  );
}
