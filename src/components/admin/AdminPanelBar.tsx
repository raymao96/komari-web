import { Cross1Icon, ExitIcon } from "@radix-ui/react-icons";
import {
  Button,
  Callout,
  Flex,
  Grid,
  IconButton,
  Text,
} from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion"; // 引入 Framer Motion
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation /*useNavigate*/ } from "react-router-dom";
import ColorSwitch from "../ColorSwitch";
import LanguageSwitch from "../Language";
import ThemeSwitch from "../ThemeSwitch";
import { useIsMobile } from "@/hooks/use-mobile";
import menuConfig from "../../config/menuConfig.json";
import type { MenuItem } from "../../types/menu";
import { iconMap } from "../../utils/iconHelper";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { TablerMenu2 } from "../Icones/Tabler";
import LoginDialog from "../Login";
import { useAccount } from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import Tips from "../ui/tips";
import { CircleFadingArrowUp, Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { resolveI18nText } from "@/utils/i18nText";
import {
  getThemeConfigurationType,
  normalizeThemeRedirectTarget,
  THEME_CONFIGURATION_MANAGED,
  THEME_CONFIGURATION_RAW,
  THEME_CONFIGURATION_REDIRECT,
} from "@/utils/themeConfiguration";

// 将JSON配置转换为类型安全的菜单项数组 (基础静态菜单)
const baseMenuItems = (menuConfig as { menu: MenuItem[] }).menu;

// 扩展的菜单项类型（允许直接提供 rawLabel 而不是多语言 key）
interface ExtendedMenuItem extends MenuItem {
  rawLabel?: string; // 不走 i18n，直接显示
  reloadDocument?: boolean;
}

interface AdminPanelBarProps {
  content: ReactNode;
}

interface GithubReleaseInfo {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
}

interface VersionInfo {
  hash: string;
  version: string;
  deployment: "docker" | "linux" | "windows" | "unknown";
}

interface SelfUpdateCapability {
  deployment: string;
  distribution?: string;
  distribution_version?: string;
  supported: boolean;
  reason?: string;
  last_result?: {
    status: string;
    target_version: string;
    target_hash: string;
    message?: string;
  };
}

type UpdatePhase = "idle" | "preparing" | "restarting";

function parseSemver(input?: string | null): number[] | null {
  if (!input) return null;
  const normalized = String(input).trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(left?: string | null, right?: string | null) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function parseReleaseVersionHash(body?: string | null) {
  const match = body?.match(
    /<!--\s*komari-version-hash:\s*([a-z0-9]{7})\s*-->/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

function formatVersion(version?: string | null, hash?: string | null) {
  if (!version) return "";
  const normalizedHash = hash?.trim();
  return normalizedHash && normalizedHash !== "unknown"
    ? `${version} (${normalizedHash})`
    : version;
}

function formatReleaseVersion(release?: GithubReleaseInfo | null) {
  if (!release) return "";
  return formatVersion(
    release.tag_name || release.name,
    parseReleaseVersionHash(release.body),
  );
}

function visibleReleaseBody(body?: string | null) {
  return (body ?? "")
    .replace(/<!--\s*komari-version-hash:\s*[a-z0-9]{7}\s*-->/i, "")
    .trim();
}

function isReleaseNewer(
  release: GithubReleaseInfo,
  currentVersion?: string | null,
  currentHash?: string | null,
) {
  const comparison = compareSemver(
    release.tag_name || release.name,
    currentVersion,
  );
  if (comparison === null) return false;
  if (comparison !== 0) return comparison > 0;

  const releaseHash = parseReleaseVersionHash(release.body);
  const normalizedCurrentHash = currentHash?.trim().toLowerCase();
  return Boolean(
    releaseHash &&
      normalizedCurrentHash &&
      normalizedCurrentHash !== "unknown" &&
      releaseHash !== normalizedCurrentHash,
  );
}

const AdminPanelBar = ({ content }: AdminPanelBarProps) => {
  const { call, callViaHTTP } = useRPC2Call();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<{ [key: string]: boolean }>({
    // 默认所有子菜单关闭
  });
  const { account } = useAccount();
  const isMobile = useIsMobile();
  const ishttps = window.location.protocol === "https:";
  const [t, i18n] = useTranslation();
  const location = useLocation();
  const { publicInfo } = usePublicInfo();
  //const navigate = useNavigate();
  // 获取版本信息
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [selfUpdate, setSelfUpdate] = useState<SelfUpdateCapability | null>(
    null,
  );
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("idle");
  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    (typeof navigator !== "undefined" ? navigator.language : "");
  // GitHub 最新发布信息与更新检测
  const [latestRelease, setLatestRelease] = useState<GithubReleaseInfo | null>(
    null,
  );
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [releasesSince, setReleasesSince] = useState<GithubReleaseInfo[]>([]);

  const currentTheme = publicInfo?.theme;

  // 动态扩展菜单
  const [extraMenuItems, setExtraMenuItems] = useState<ExtendedMenuItem[]>([]);

  useEffect(() => {
    let ignore = false;
    async function loadThemeMenu() {
      // 仅当 theme 存在且不等于 default 时扩展
      if (!currentTheme) {
        setExtraMenuItems([]);
        return;
      }
      try {
        const resp = await fetch(`/themes/${currentTheme}/komari-theme.json`, {
          cache: "no-cache",
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (ignore) return;
        const cfg = data?.configuration;
        if (!cfg) {
          setExtraMenuItems([]);
          return;
        }

        const cfgType = getThemeConfigurationType(cfg);
        let itemPath: string | null = null;
        if (
          cfgType === THEME_CONFIGURATION_MANAGED &&
          Array.isArray(cfg.data) &&
          cfg.data.length > 0
        ) {
          itemPath = "/admin/theme_managed";
        } else if (cfgType === THEME_CONFIGURATION_RAW) {
          itemPath = "/admin/theme_raw";
        } else if (cfgType === THEME_CONFIGURATION_REDIRECT) {
          itemPath = normalizeThemeRedirectTarget(cfg.data);
        }

        if (!itemPath) {
          setExtraMenuItems([]);
          return;
        }
        const rawLabel: string =
          resolveI18nText(cfg.name, currentLanguage) ??
          t("theme.manage_with_name", {
            name:
              resolveI18nText(data?.name, currentLanguage) ??
              (currentTheme === "default" ? "" : currentTheme),
          });
        const icon: string = cfg.icon || "Palette"; // fallback icon
        const item: ExtendedMenuItem = {
          labelKey: rawLabel,
          rawLabel,
          path: itemPath,
          icon,
          reloadDocument: cfgType === THEME_CONFIGURATION_REDIRECT,
        };
        setExtraMenuItems([item]);
      } catch (e) {
        console.warn("加载主题配置失败，将不扩展主题菜单:", e);
        if (!ignore) setExtraMenuItems([]);
      }
    }
    loadThemeMenu();
    return () => {
      ignore = true;
    };
  }, [currentTheme]);
  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        //const response = await fetch("/api/version");
        const data = await call("common:getVersion");
        setVersionInfo({
          hash: data.hash?.slice(0, 7),
          version: data.version,
          deployment: data.deployment || "unknown",
        });
      } catch (error) {
        console.error("Failed to fetch version info:", error);
      }
    };

    fetchVersionInfo();
  }, [call]);

  useEffect(() => {
    if (versionInfo?.deployment !== "linux") {
      setSelfUpdate(null);
      return;
    }
    let ignore = false;
    call("admin:getSelfUpdateStatus")
      .then((status: SelfUpdateCapability) => {
        if (!ignore) setSelfUpdate(status);
      })
      .catch((error) => {
        console.warn("Failed to load self-update capability:", error);
        if (!ignore) setSelfUpdate(null);
      });
    return () => {
      ignore = true;
    };
  }, [call, versionInfo?.deployment]);

  // 获取 GitHub releases 列表，并筛选出“比当前版本新的所有 release”
  useEffect(() => {
    let ignore = false;
    const currentVersion = (publicInfo as any)?.version || versionInfo?.version;
    const currentHash = versionInfo?.hash;
    if (!currentVersion) return;

    async function loadReleases() {
      try {
        const resp = await fetch(
          "https://api.github.com/repos/nuomiiiii/komari/releases?per_page=100",
          {
            headers: {
              Accept: "application/vnd.github+json",
            },
            cache: "no-cache",
          },
        );
        if (!resp.ok) throw new Error(`GitHub HTTP ${resp.status}`);
        const data: GithubReleaseInfo[] = await resp.json();
        if (ignore) return;
        const valid = (data || [])
          .filter((r) => !r.draft && !r.prerelease)
          .filter((r) => isReleaseNewer(r, currentVersion, currentHash));
        setReleasesSince(valid);
        setLatestRelease(valid.length ? valid[0] : null);
        setUpdateAvailable(valid.length > 0);
      } catch (e) {
        console.warn("加载 GitHub 最新发布失败:", e);
        if (!ignore) {
          setLatestRelease(null);
          setReleasesSince([]);
          setUpdateAvailable(false);
        }
      }
    }

    loadReleases();
    return () => {
      ignore = true;
    };
  }, [publicInfo, versionInfo]);
  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => setSidebarOpen(!isMobile);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  // 根据路径自动展开子菜单（包含动态扩展项）
  useEffect(() => {
    const newState: { [key: string]: boolean } = {};
    const combined: ExtendedMenuItem[] = [...baseMenuItems, ...extraMenuItems];
    combined.forEach((item) => {
      if (item.children) {
        newState[item.path] = item.children.some(
          (child: MenuItem) =>
            location.pathname === child.path ||
            location.pathname.startsWith(child.path),
        );
      }
    });
    setOpenSubMenus(newState);
  }, [location.pathname, extraMenuItems]);

  // 侧边栏动画变体
  const sidebarVariants = {
    open: {
      width: isMobile ? "100vw" : "240px",
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      width: 0,
      opacity: isMobile ? 0 : 1, // 移动端完全透明
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  } as const;

  // 内容区域动画变体
  const contentVariants = {
    open: {
      opacity: isMobile ? 0 : 1,
      x: isMobile ? "100%" : 0,
      transition: {
        duration: 0.3,
      },
    },
    closed: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  async function waitForUpdatedService(targetVersion: string, targetHash: string) {
    const deadline = Date.now() + 150_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) continue;
        const body = await response.json();
        const observed = body?.data ?? body;
        if (
          observed?.version === targetVersion &&
          String(observed?.hash || "").toLowerCase() ===
            targetHash.toLowerCase()
        ) {
          toast.success(t("common.self_update_succeeded", "更新成功，正在刷新页面"));
          window.setTimeout(() => window.location.reload(), 800);
          return;
        }
        const status = await callViaHTTP<unknown, SelfUpdateCapability>(
          "admin:getSelfUpdateStatus",
          {},
          { timeout: 5_000 },
        );
        if (
          status.last_result?.target_version === targetVersion &&
          ["rolled_back", "rollback_failed", "failed"].includes(
            status.last_result.status,
          )
        ) {
          const terminalError = new Error(
            status.last_result.status === "rolled_back"
              ? t(
                  "common.self_update_rolled_back",
                  "新版本未通过健康检查，已自动恢复原版本和数据",
                )
              : status.last_result.message ||
                  t("common.self_update_failed", "自动更新失败"),
          );
          terminalError.name = "SelfUpdateTerminalError";
          throw terminalError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "SelfUpdateTerminalError") {
          throw error;
        }
      }
    }
    throw new Error(
      t(
        "common.self_update_timeout",
        "更新状态确认超时，请稍后刷新页面查看当前版本",
      ),
    );
  }

  async function startSelfUpdate() {
    if (!latestRelease || updatePhase !== "idle") return;
    const targetVersion = latestRelease.tag_name || latestRelease.name || "";
    const targetHash = parseReleaseVersionHash(latestRelease.body);
    if (!targetVersion || !targetHash) {
      toast.error(t("common.self_update_metadata_missing", "发布版本缺少自动更新校验信息"));
      return;
    }
    setUpdatePhase("preparing");
    try {
      await callViaHTTP(
        "admin:startSelfUpdate",
        { version: targetVersion, version_hash: targetHash },
        { timeout: 360_000 },
      );
      setUpdatePhase("restarting");
      toast.info(t("common.self_update_restarting", "更新已校验，服务正在重启"));
      await waitForUpdatedService(targetVersion, targetHash);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("common.self_update_failed", "自动更新失败");
      toast.error(message);
      setUpdatePhase("idle");
    }
  }

  function logout() {
    window.open("/api/logout", "_self");
  }
  return (
    <>
      <Grid
        columns={{ initial: "1fr", md: sidebarOpen ? "240px 1fr" : "0px 1fr" }} // 动态调整网格列
        rows={{ initial: "auto 1fr", md: "auto 1fr" }}
        style={{
          height: "100vh",
          width: "100vw",
          overflow: "auto",
          backgroundColor: "var(--accent-1)",
        }}
      >
        {/* Navbar */}
        <motion.nav
          className="col-span-2"
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Flex
            gap="3"
            p="2"
            justify="between"
            align="center"
            className="border-b-1"
          >
            <Flex
              gap="3"
              align="end"
              style={{ minHeight: "calc(32px * var(--scaling))" }}
            >
              <IconButton
                size="2"
                variant="ghost"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="shrink-0"
                style={{
                  display: isMobile && sidebarOpen ? "none" : "flex",
                  color: "var(--gray-11)",
                }}
              >
                <TablerMenu2 className="h-6 w-6" />
              </IconButton>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-end leading-none"
              >
                <span className="text-2xl font-bold leading-none">Komari</span>
              </a>
              {updateAvailable && releasesSince.length > 0 && (
                <Tips
                  mode="dialog"
                  className="check-update flex h-6 w-6 items-end leading-none"
                  trigger={
                    <CircleFadingArrowUp
                      className="block h-6 w-6"
                      color="#FB4141"
                      size="24"
                    />
                  }
                >
                  <div className="flex flex-col gap-2 max-w-[80vw] md:max-w-[720px]">
                    <label className="font-bold">
                      {t("common.update_available")}
                    </label>
                    <div className="text-sm text-muted-foreground">
                      <span style={{ marginRight: 8 }}>
                        {formatVersion(
                          (publicInfo as any)?.version || versionInfo?.version,
                          versionInfo?.hash,
                        )}
                      </span>
                      <span>{"> "}</span>
                      <span>{formatReleaseVersion(latestRelease)}</span>
                    </div>

                    <div className="rounded-md p-2 overflow-auto max-h-80">
                      <div className="flex flex-col gap-4 text-sm">
                        {releasesSince.map((r) => (
                          <div key={r.html_url} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">
                                {formatReleaseVersion(r)}
                              </div>
                              {r.published_at && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(r.published_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className="whitespace-pre-wrap break-words">
                              {visibleReleaseBody(r.body)}
                            </div>
                            <div
                              style={{
                                height: 1,
                                background: "var(--accent-5)",
                                opacity: 0.5,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {versionInfo?.deployment === "linux" &&
                      selfUpdate?.supported &&
                      parseReleaseVersionHash(latestRelease?.body) ? (
                        <Button
                          variant="soft"
                          onClick={startSelfUpdate}
                          disabled={updatePhase !== "idle"}
                        >
                          {updatePhase === "idle" ? (
                            <Download size={16} />
                          ) : (
                            <LoaderCircle size={16} className="animate-spin" />
                          )}
                          {updatePhase === "preparing"
                            ? t("common.self_update_preparing", "正在下载并校验")
                            : updatePhase === "restarting"
                              ? t("common.self_update_restarting_short", "正在更新")
                              : t("common.update_now", "立即更新")}
                        </Button>
                      ) : (
                        <a
                          href={latestRelease?.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="soft">GitHub</Button>
                        </a>
                      )}
                    </div>
                  </div>
                </Tips>
              )}
              <span
                className="text-sm text-muted-foreground leading-normal overflow-visible"
                hidden={isMobile}
              >
                {(publicInfo as any)?.version ||
                  (versionInfo &&
                    `${versionInfo.version} (${versionInfo.hash})`)}
              </span>
            </Flex>
            <Flex gap="3" align="center" overflowX="auto">
              {account && !account.logged_in && (
                <LoginDialog
                  autoOpen={true}
                  showSettings={false}
                  onLoginSuccess={() => {
                    window.location.reload();
                  }}
                />
              )}
              <ThemeSwitch />
              <ColorSwitch />
              <LanguageSwitch />
              <IconButton variant="soft" color="orange" onClick={logout}>
                <ExitIcon />
              </IconButton>
            </Flex>
          </Flex>
        </motion.nav>

        {/* Sidebar */}
        <AnimatePresence>
          <motion.div
            variants={sidebarVariants}
            initial="closed"
            animate={sidebarOpen ? "open" : "closed"}
            exit="closed"
            style={{
              backgroundColor: "var(--accent-1)",
              height: "100%",
              position: isMobile ? "absolute" : "relative",
              zIndex: isMobile ? 10 : 1,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <Flex
              gap="3"
              className="p-2 border-r-1"
              direction="column"
              justify="start"
              align="start"
              style={{ height: "100%", minWidth: "240px" }}
            >
              {/* 关闭按钮 */}
              <IconButton
                variant="soft"
                style={{
                  display: isMobile ? "flex" : "none",
                  margin: "8px 0px 0px 8px",
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Cross1Icon />
              </IconButton>
              {/* 侧边连链接 */}
              <Flex
                direction="column"
                gap="1"
                className="h-full md:mt-0 mt-6"
                style={{ width: "100%" }}
              >
                {[...baseMenuItems, ...extraMenuItems].map(
                  (item: ExtendedMenuItem) => {
                    // 支持 icon 为 URL/相对路径
                    const isOpen = openSubMenus[item.path];
                    const renderIcon = (
                      icon: string,
                      labelKey: string,
                      className?: string,
                      active?: boolean,
                    ) => {
                      const link = /^(https?:\/\/|\/|\.\/|\.\.\/)/.test(icon);
                      if (link) {
                        return (
                          <img
                            src={icon}
                            alt={t(labelKey)}
                            style={{
                              width: 16,
                              height: 16,
                              objectFit: "contain",
                              opacity: active ? 1 : 0.7,
                              filter: active ? "none" : "grayscale(20%)",
                            }}
                            className={className}
                            loading="lazy"
                          />
                        );
                      }
                      const Cmp = iconMap[icon];
                      if (Cmp) {
                        return (
                          <Cmp
                            className={className}
                            style={{
                              color: active
                                ? "var(--accent-10)"
                                : "var(--gray11)",
                            }}
                          />
                        );
                      }
                      // fallback: simple dot
                      return (
                        <span
                          className={className}
                          style={{
                            width: 16,
                            height: 16,
                            display: "inline-block",
                            borderRadius: 4,
                            background: "var(--accent-8)",
                          }}
                        />
                      );
                    };
                    if (item.children && item.children.length) {
                      return (
                        <div key={item.path}>
                          <Flex
                            className="p-2 gap-2 border-l-[4px] border-transparent cursor-pointer hover:bg-accent-3 rounded-md"
                            align="center"
                            onClick={() => {
                              //const currentlyOpen = openSubMenus[item.path];
                              // 检查当前路径是否已经在该父菜单的子菜单中
                              //const isCurrentlyInThisMenu = item.children?.some(
                              //  (child) =>
                              //    location.pathname === child.path ||
                              //    location.pathname.startsWith(child.path)
                              //);

                              // 切换子菜单的展开状态
                              setOpenSubMenus((prev) => ({
                                ...prev,
                                [item.path]: !prev[item.path],
                              }));

                              //// 只有在非展开状态且不在当前菜单组中时才导航到第一个子菜单项
                              //if (
                              //  !currentlyOpen &&
                              //  !isCurrentlyInThisMenu &&
                              //  item.children &&
                              //  item.children.length > 0
                              //) {
                              //  //navigate(item.children[0].path);
                              //  // 如果是移动端，关闭侧边栏
                              //  if (isMobile) {
                              //    setSidebarOpen(false);
                              //  }
                              //}
                            }}
                          >
                            {renderIcon(
                              item.icon,
                              item.labelKey,
                              "flex w-4 h-5 items-center justify-center",
                            )}
                            <Text
                              className="text-base"
                              weight="medium"
                              style={{
                                flex: 1,
                              }}
                            >
                              {item.rawLabel || t(item.labelKey)}
                            </Text>

                            <ChevronDownIcon
                              style={{
                                transform: isOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s",
                              }}
                            />
                          </Flex>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={
                              isOpen
                                ? { height: "auto", opacity: 1 }
                                : { height: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            <Flex direction="column" className="ml-4 gap-1">
                              {item.children.map((child: MenuItem) => (
                                <SidebarItem
                                  key={child.path}
                                  to={child.path}
                                  icon={renderIcon(
                                    child.icon,
                                    child.labelKey,
                                    "flex w-4 h-5 items-center justify-center",
                                  )}
                                  children={
                                    (child as ExtendedMenuItem).rawLabel ||
                                    t(child.labelKey)
                                  }
                                  onClick={() =>
                                    isMobile && setSidebarOpen(false)
                                  }
                                  newTab={child.newTab}
                                  reloadDocument={
                                    (child as ExtendedMenuItem).reloadDocument
                                  }
                                />
                              ))}
                            </Flex>
                          </motion.div>
                        </div>
                      );
                    }
                    return (
                      <SidebarItem
                        key={item.path}
                        to={item.path}
                        icon={renderIcon(
                          item.icon,
                          item.labelKey,
                          "flex w-4 h-5 items-center justify-center",
                        )}
                        children={item.rawLabel || t(item.labelKey)}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        newTab={item.newTab}
                        reloadDocument={item.reloadDocument}
                      />
                    );
                  },
                )}
              </Flex>
            </Flex>
          </motion.div>
        </AnimatePresence>

        {/* Main Content */}
        <motion.div
          variants={contentVariants}
          animate={sidebarOpen ? "open" : "closed"}
          style={{
            backgroundColor: "var(--accent-3)",
            display: isMobile && sidebarOpen ? "none" : "block",
            height: "100%", // Ensure the container takes full height
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden", // Prevent this container from scrolling
          }}
        >
          <div
            style={{
              backgroundColor: "var(--accent-1)",
              height: "100%",
              borderRadius: "0",
              padding: isMobile ? "8px" : "16px",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <Callout.Root mb="2" hidden={ishttps} color="red">
              <Callout.Icon>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
                  />
                </svg>
              </Callout.Icon>
              <Callout.Text>
                <Text size="2" weight="medium">
                  {t("warn_https")}
                </Text>
              </Callout.Text>
            </Callout.Root>
            {content}
          </div>
        </motion.div>
      </Grid>
    </>
  );
};

export default AdminPanelBar;

// 侧边栏项目组件
const SidebarItem = ({
  to,
  onClick,
  icon,
  children,
  newTab,
  reloadDocument,
}: {
  to: string;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  newTab?: boolean;
  reloadDocument?: boolean;
}) => {
  const location = useLocation();
  const isExternalLink = to.startsWith("http://") || to.startsWith("https://");
  const isActive =
    !isExternalLink &&
    to !== "/" &&
    (location.pathname === to ||
      (to !== "/admin" && location.pathname.startsWith(to)));
  const openInNewTab = newTab === true || (isExternalLink && newTab !== false);

  if (openInNewTab || reloadDocument) {
    return (
      <a
        href={to}
        onClick={onClick}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className="group transition-colors duration-200 hover:bg-accent-3 rounded-md"
      >
        <Flex
          className="p-2 gap-2 h-full"
          align="center"
          style={{
            borderLeft: "4px solid transparent",
            borderRadius: "6px",
            backgroundColor: "transparent",
            color: "inherit",
            transition: "background-color 0.2s, border-color 0.2s",
          }}
        >
          <span
            style={{
              color: "inherit",
              opacity: 0.7,
            }}
            className="flex w-4 h-5 items-center justify-center"
          >
            {icon}
          </span>
          <Text className="text-base" weight="medium" style={{ flex: 1 }}>
            {children}
          </Text>
        </Flex>
      </a>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className="group transition-colors duration-200 hover:bg-accent-3 rounded-md"
    >
      <Flex
        className="p-2 gap-2"
        align="center"
        style={{
          borderLeft: isActive
            ? "4px solid var(--accent-8)"
            : "4px solid transparent",
          borderRadius: "6px",
          backgroundColor: isActive ? "var(--accent-4)" : "transparent",
          color: isActive ? "var(--accent-10)" : "inherit",
          transition: "background-color 0.2s, border-color 0.2s",
        }}
      >
        <span
          style={{
            color: isActive ? "var(--accent-10)" : "inherit",
            opacity: isActive ? 1 : 0.7,
          }}
          className="flex w-4 h-5 items-center justify-center"
        >
          {icon}
        </span>
        <Text
          className="text-base"
          weight={isActive ? "bold" : "medium"}
          style={{ flex: 1 }}
        >
          {children}
        </Text>
      </Flex>
    </Link>
  );
};
