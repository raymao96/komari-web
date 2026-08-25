import { useTranslation } from "react-i18next";
import {
  Text,
  Card,
  Button,
  Grid,
  Box,
  Flex,
  Dialog,
  Badge,
  IconButton,
  TextField,
  Callout,
  Separator,
} from "@radix-ui/themes";
import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Settings,
  Image as ImageIcon,
  RefreshCw,
  SquareArrowOutUpRight,
  Download,
  Search,
  AlertTriangle,
  Loader2,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import SettingsPageSkeleton from "@/components/admin/SettingsPageSkeleton";
import { useSettings } from "@/lib/api";
import AppDialogContent from "@/components/AppDialogContent";
import ThemePreviewImage from "@/components/ThemePreviewImage";
import { themePreviewSrc } from "@/utils/themePreviewImage";
import UploadDialog from "@/components/UploadDialog";
import {
  getThemeConfigurationType,
  THEME_CONFIGURATION_MANAGED,
} from "@/utils/themeConfiguration";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { uploadArchive } from "@/utils/archiveUpload";
import { resolveI18nText, type I18nText } from "@/utils/i18nText";
import { clearThemeNavigationCache } from "@/utils/themeCache";
import {
  UPLOAD_COMPLETED_VISIBLE_MS,
  UPLOAD_DIALOG_EXIT_MS,
  createCompletedUploadState,
  delay,
  type UploadProgressState,
  withUploadProgressCopy,
} from "@/utils/uploadProgress";

interface Theme {
  name: I18nText;
  short: string;
  description: I18nText;
  author: I18nText;
  version: string;
  preview?: string;
  url?: string;
  active: boolean;
  configuration?: any;
}

const THEME_CHANGE_STORAGE_KEY = "komari-active-theme-changed";

const ThemePage = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const displayText = (value?: I18nText) =>
    resolveI18nText(value, currentLanguage) || "";
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [uploadState, setUploadState] = useState<UploadProgressState | null>(
    null,
  );
  const uploadController = useRef<AbortController | null>(null);
  const uploadStateRef = useRef<UploadProgressState | null>(null);
  const [settingTheme, setSettingTheme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [themeToUpdate, setThemeToUpdate] = useState<Theme | null>(null);
  const [updating, setUpdating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importChecking, setImportChecking] = useState(false);
  const [importInstalling, setImportInstalling] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    theme: Omit<Theme, "id" | "active" | "createdAt">;
    exists: boolean;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const {
    settings,
    loading: settingsLoading,
    refetch: refetchSettings,
  } = useSettings();
  const currentTheme = settings?.theme;
  const navigate = useNavigate();
  const { publicInfo } = usePublicInfo();
  const [activeThemeHasConfig, setActiveThemeHasConfig] = useState(false);
  const uploadCopy = {
    preparing: t("theme.phase_preparing", "Preparing theme package"),
    uploading: t("theme.phase_uploading", "Uploading theme package"),
    merging: t("theme.phase_processing", "Validating and installing theme"),
    processing: t("theme.phase_processing", "Validating and installing theme"),
    restarting: t("theme.phase_processing", "Validating and installing theme"),
    completed: t("theme.phase_completed", "Theme installed"),
    failed: t("theme.upload_failed"),
    nonCancelable: t(
      "theme.phase_non_cancelable",
      "Server processing has started and can no longer be canceled",
    ),
  };

  const setTrackedUploadState = (state: UploadProgressState | null) => {
    uploadStateRef.current = state;
    setUploadState(state);
  };

  // 当 currentTheme 或 publicInfo.theme 变化时重新检测当前主题是否有配置文件
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const themeShort = currentTheme || publicInfo?.theme;
      if (!themeShort) {
        setActiveThemeHasConfig(false);
        return;
      }
      try {
        // 强制不缓存
        const resp = await fetch(`/themes/${themeShort}/komari-theme.json`, {
          cache: "no-cache",
        });
        if (!resp.ok) {
          setActiveThemeHasConfig(false);
          return;
        }
        const data = await resp.json().catch(() => null);
        if (
          !cancelled &&
          data &&
          data.configuration &&
          getThemeConfigurationType(data.configuration) ===
            THEME_CONFIGURATION_MANAGED &&
          Array.isArray(data.configuration.data) &&
          data.configuration.data.length > 0
        ) {
          setActiveThemeHasConfig(true);
        } else if (!cancelled) {
          setActiveThemeHasConfig(false);
        }
      } catch {
        if (!cancelled) setActiveThemeHasConfig(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [currentTheme, publicInfo?.theme]);

  const loading = themesLoading || settingsLoading || !currentTheme;
  // 获取主题列表
  const fetchThemes = async () => {
    try {
      const response = await fetch("/api/admin/theme/list");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const themeList = data.data || [];

      // 根据 settings 中的 theme 设置活跃状态
      const updatedThemes = themeList.map((theme: Theme) => ({
        ...theme,
        active: theme.short === currentTheme,
      }));

      setThemes(updatedThemes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch themes");
    } finally {
      setThemesLoading(false);
    }
  };

  // 上传主题
  const uploadTheme = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error(t("theme.invalid_file_type"));
      return;
    }

    setTrackedUploadState(null);
    const controller = new AbortController();
    uploadController.current = controller;
    try {
      await uploadArchive({
        basePath: "/api/admin/upload",
        purpose: "theme",
        file,
        signal: controller.signal,
        onStateChange: (state) => {
          setTrackedUploadState(withUploadProgressCopy(state, uploadCopy));
        },
      });
      setTrackedUploadState(
        withUploadProgressCopy(
          createCompletedUploadState(uploadStateRef.current),
          uploadCopy,
        ),
      );
      toast.success(t("theme.upload_success"));
      await delay(UPLOAD_COMPLETED_VISIBLE_MS);
      setUploadDialogOpen(false);
      await delay(UPLOAD_DIALOG_EXIT_MS);
      setTrackedUploadState(null);
      await fetchThemes();
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setTrackedUploadState(null);
      } else {
        toast.error(
          `${t("theme.upload_failed")}: ${reason instanceof Error ? reason.message : "Unknown error"}`,
        );
      }
    } finally {
      uploadController.current = null;
    }
  };

  // 取消上传
  const cancelUpload = () => {
    uploadController.current?.abort();
    setTrackedUploadState(null);
  };

  // 设置主题
  const setActiveTheme = async (themeShort: string) => {
    try {
      setSettingTheme(themeShort);

      // 先调用 API 设置主题
      const response = await fetch(`/api/admin/theme/set?theme=${themeShort}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await clearThemeNavigationCache();
      try {
        window.localStorage.setItem(
          THEME_CHANGE_STORAGE_KEY,
          `${themeShort}:${Date.now()}`,
        );
      } catch {
        // Theme switching still works when browser storage is unavailable.
      }

      // 刷新 settings 以获取最新的主题设置
      await refetchSettings();

      // 更新主题列表中的活跃状态
      setThemes((prevThemes) =>
        prevThemes.map((theme) => ({
          ...theme,
          active: theme.short === themeShort,
        })),
      );

      const theme = themes.find((t) => t.short === themeShort);
      if (
        theme &&
        getThemeConfigurationType(theme.configuration) ===
          THEME_CONFIGURATION_MANAGED &&
        Array.isArray(theme.configuration.data) &&
        theme.configuration.data.length > 0
      ) {
        window.location.reload();
      }

      toast.success(t("theme.set_success"));
    } catch (err) {
      toast.error(
        t("theme.set_failed") +
          ": " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setSettingTheme(null);
    }
  };

  // 更新主题
  const updateTheme = async (themeShort: string) => {
    try {
      setUpdating(true);

      const requestBody = { short: themeShort, useOriginalUrl: true };

      const response = await fetch("/api/admin/theme/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Update failed");
      }

      // 重新获取主题列表
      await fetchThemes();

      setUpdateDialogOpen(false);
      setPreviewDialogOpen(false);
      toast.success(t("theme.update_success"));
    } catch (err) {
      toast.error(
        t("theme.update_failed") +
          ": " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setUpdating(false);
    }
  };

  // 删除主题
  const deleteTheme = async (themeShort: string) => {
    try {
      const response = await fetch("/api/admin/theme/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ short: themeShort }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Delete failed");
      }

      const payload = await response.json();
      if (themeShort === currentTheme) {
        await clearThemeNavigationCache();
        try {
          window.localStorage.setItem(
            THEME_CHANGE_STORAGE_KEY,
            `${payload?.data?.theme || "fallback"}:${Date.now()}`,
          );
        } catch {
          // Other public tabs will update on their next navigation.
        }
      }

      await refetchSettings();
      await fetchThemes();

      setDeleteDialogOpen(false);
      setPreviewDialogOpen(false);
      toast.success(t("theme.delete_success"));
    } catch (err) {
      toast.error(
        t("theme.delete_failed") +
          ": " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  // 预览导入主题
  const previewImportTheme = async () => {
    if (!importUrl.trim()) return;
    setImportChecking(true);
    setImportPreview(null);
    setImportError(null);
    try {
      const response = await fetch("/api/admin/theme/import?preview=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.status === "error") {
        setImportError(data.message || t("theme.import_failed"));
        return;
      }
      setImportPreview(data.data);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : t("theme.import_failed"),
      );
    } finally {
      setImportChecking(false);
    }
  };

  // 确认导入主题
  const confirmImportTheme = async () => {
    if (!importUrl.trim()) return;
    setImportInstalling(true);
    try {
      const response = await fetch("/api/admin/theme/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.status === "error") {
        toast.error(data.message || t("theme.import_failed"));
        return;
      }
      toast.success(data.message || t("theme.import_success"));
      setImportDialogOpen(false);
      setImportUrl("");
      setImportPreview(null);
      setImportError(null);
      await fetchThemes();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("theme.import_failed"),
      );
    } finally {
      setImportInstalling(false);
    }
  };

  // 同步活跃状态
  useEffect(() => {
    fetchThemes();
  }, [currentTheme]);

  useEffect(() => {
    if (!settingsLoading && themes.length > 0) {
      setThemes((prevThemes) =>
        prevThemes.map((theme) => ({
          ...theme,
          active: theme.short === currentTheme,
        })),
      );
    }
  }, [currentTheme, settingsLoading, themes.length]);

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  if (error) {
    return <Text color="red">{error}</Text>;
  }

  return (
    <Box className="space-y-6">
      <Flex justify="between" align="center" gap="3" wrap="wrap">
        <AdminPageTitle
          description={t(
            "theme.page_description",
            "管理已安装主题、切换当前主题并维护主题配置。",
          )}
        >
          {t("theme.title")}
        </AdminPageTitle>
        <Flex gap="2" wrap="wrap" className="w-full sm:w-auto [&>button]:min-w-[8rem] [&>button]:flex-1 sm:[&>button]:min-w-0 sm:[&>button]:flex-none">
          <Button
            variant="soft"
            className="gap-2"
            onClick={() => navigate("/admin/market/themes")}
          >
            <Store size={16} />
            {t("market.themes")}
          </Button>
          {activeThemeHasConfig && (
            <Button
              variant="soft"
              className="gap-2"
              onClick={() => navigate("/admin/theme_managed")}
            >
              <Settings size={16} />
              {`${currentTheme}设置`}
            </Button>
          )}
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload size={16} />
            {t("theme.upload")}
          </Button>
          <Button
            variant="soft"
            onClick={() => {
              setImportDialogOpen(true);
              setImportUrl("");
              setImportPreview(null);
              setImportError(null);
            }}
            className="gap-2"
          >
            <Download size={16} />
            {t("theme.import")}
          </Button>
        </Flex>
      </Flex>

      {/* 主题卡片网格 */}
      {themes.length === 0 ? (
        <Box className="text-center py-12">
          <ImageIcon size={64} className="mx-auto text-gray-400 mb-4" />
          <Text size="4" color="gray" className="mb-2">
            {t("theme.no_themes")}
          </Text>
          <Text size="2" color="gray">
            {t("theme.upload_first_theme")}
          </Text>
        </Box>
      ) : (
        <Grid columns={{ initial: "1", sm: "2", md: "3", lg: "4" }} gap="4">
          {themes.map((theme, index) => (
            <Card
              key={theme.short}
              className="relative group hover:shadow-lg transition-all duration-200"
            >
              <Box
                onClick={() => {
                  setPreviewDialogOpen(true);
                  setSelectedTheme(theme);
                }}
                className="aspect-video bg-gradient-to-br rounded-t-lg overflow-hidden relative "
              >
                <ThemePreviewImage
                  src={themePreviewSrc(
                    theme.preview
                      ? `/themes/${theme.short}/${theme.preview}`
                      : undefined,
                    { card: true, version: theme.version },
                  )}
                  alt={displayText(theme.name)}
                  loading="eager"
                  fetchPriority={index < 8 ? "high" : "low"}
                  containerClassName="w-full h-full"
                  imageClassName="w-full h-full"
                  fit="cover"
                  fallbackLabel={t("theme.preview_unavailable", "Preview unavailable")}
                  iconSize={48}
                />
                {/* 覆盖层 */}
                <Box className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Flex gap="2">{/* 预留操作位 */}</Flex>
                </Box>

                {/* 活跃状态指示器 */}
                {theme.active && (
                  <Badge
                    color="green"
                    className="absolute top-2 right-2 px-2 py-1 text-xs"
                  >
                    {t("theme.active")}
                  </Badge>
                )}
              </Box>

              <Flex
                onClick={() => {
                  setPreviewDialogOpen(true);
                  setSelectedTheme(theme);
                }}
                direction="column"
                className="p-4 space-y-2"
              >
                <Text weight="bold" size="3">
                  {displayText(theme.name)}
                </Text>
                <Flex justify="between" align="center">
                  <Text size="1" color="gray">
                    by {displayText(theme.author)}
                  </Text>
                  <Text size="1" color="gray">
                    v{theme.version}
                  </Text>
                </Flex>
              </Flex>
              <Flex justify="end" align="center">
                {!theme.active && (
                  <IconButton
                    size="2"
                    variant="ghost"
                    onClick={() => setActiveTheme(theme.short)}
                    disabled={settingTheme === theme.short}
                  >
                    {settingTheme === theme.short ? (
                      <Box className="animate-spin">
                        <Settings size={16} />
                      </Box>
                    ) : (
                      <Settings size={16} />
                    )}
                  </IconButton>
                )}
              </Flex>
            </Card>
          ))}
        </Grid>
      )}

      {/* 上传对话框 */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open && uploadState?.stage !== "completed") {
            setTrackedUploadState(null);
          }
        }}
        title={t("theme.upload_theme")}
        description={t("theme.upload_description")}
        accept=".zip"
        dragDropText={t("theme.drag_drop")}
        clickToBrowseText={t("theme.or_click_to_browse")}
        hintText={t("theme.zip_files_only")}
        uploadState={uploadState}
        cancelUploadLabel={t("common.cancel")}
        onCancelUpload={cancelUpload}
        onFileSelected={(file) => uploadTheme(file)}
        closeLabel={t("common.cancel")}
      />

      {/* 预览对话框 */}
      <Dialog.Root open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <AppDialogContent
          maxWidth="800px"
          title={displayText(selectedTheme?.name)}
          visuallyHiddenDescription={
            displayText(selectedTheme?.description) ||
            t("theme.preview_dialog_description", "Theme preview")
          }
        >
          <Box className="space-y-4 mt-4">
            <Box className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
              <ThemePreviewImage
                src={themePreviewSrc(
                  selectedTheme?.preview
                    ? `/themes/${selectedTheme.short}/${selectedTheme.preview}`
                    : undefined,
                  { version: selectedTheme?.version },
                )}
                alt={displayText(selectedTheme?.name)}
                loading="eager"
                containerClassName="w-full h-full"
                imageClassName="w-full h-full"
                fit="contain"
                fallbackLabel={t("theme.preview_unavailable", "Preview unavailable")}
                iconSize={64}
              />
            </Box>

            <Flex direction="column">
              <Flex gap="2" justify="start" align="center">
                <Text size="2" weight="bold" color="gray" wrap="nowrap">
                  {t("theme.author")}
                </Text>
                <Text size="3">{displayText(selectedTheme?.author)}</Text>
              </Flex>
              <Flex gap="2" justify="start" align="center">
                <Text size="2" weight="bold" color="gray" wrap="nowrap">
                  {t("theme.version")}
                </Text>
                <Text size="3">{selectedTheme?.version}</Text>
              </Flex>
              <Flex gap="2" justify="start" align="center">
                <Text size="2" weight="bold" color="gray" wrap="nowrap">
                  {t("theme.description")}
                </Text>
                <Text size="3">{displayText(selectedTheme?.description)}</Text>
              </Flex>
              {selectedTheme?.url && (
                <Flex gap="2" justify="start" align="center">
                  <Text size="2" weight="bold" color="gray" wrap="nowrap">
                    URL
                  </Text>
                  <Text size="1" className="overflow-hidden text-ellipsis">
                    {selectedTheme?.url}
                  </Text>
                  <a href={selectedTheme.url} target="_blank">
                    <SquareArrowOutUpRight size={12} />
                  </a>
                </Flex>
              )}
            </Flex>
          </Box>

          <Flex gap="3" mt="4" justify="end" wrap="wrap" className="km-theme-preview-actions">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                {t("common.close")}
              </Button>
            </Dialog.Close>
            {selectedTheme && !selectedTheme.active && (
              <Button
                onClick={() => {
                  setActiveTheme(selectedTheme.short);
                  setPreviewDialogOpen(false);
                }}
              >
                {t("theme.set_active")}
              </Button>
            )}
            {selectedTheme && (
              <Button
                variant="soft"
                color="blue"
                onClick={() => {
                  setThemeToUpdate(selectedTheme);
                  setUpdateDialogOpen(true);
                }}
                className="gap-2"
              >
                <RefreshCw size={16} />
                {t("theme.update")}
              </Button>
            )}
            {selectedTheme && (
              <Button
                size="2"
                variant="solid"
                color="red"
                disabled={themes.length <= 1}
                onClick={() => {
                  setThemeToDelete(selectedTheme);
                  setDeleteDialogOpen(true);
                }}
              >
                {t("common.delete")}
              </Button>
            )}
          </Flex>
        </AppDialogContent>
      </Dialog.Root>

      {/* 删除确认对话框 */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AppDialogContent
          maxWidth="400px"
          title={t("theme.confirm_delete")}
          description={t("theme.delete_warning", {
            themeName: displayText(themeToDelete?.name),
          })}
        >
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={async () => {
                if (themeToDelete) {
                  await deleteTheme(themeToDelete.short);
                  setDeleteDialogOpen(false);
                  setThemeToDelete(null);
                }
              }}
            >
              {t("common.delete")}
            </Button>
          </Flex>
        </AppDialogContent>
      </Dialog.Root>

      {/* 更新主题对话框 */}
      <Dialog.Root open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <AppDialogContent
          maxWidth="500px"
          title={t("theme.update_theme")}
          description={t("theme.update_description")}
        >
          <Box className="space-y-4 mt-4">
            {/* Auto Mode Explanation */}
            <Flex direction="column" gap="2">
              <Text size="2" color="gray" className="mt-2">
                {t("theme.update_mode_auto_description")}
              </Text>
            </Flex>
          </Box>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button
              color="blue"
              disabled={updating}
              onClick={async () => {
                if (themeToUpdate) {
                  await updateTheme(themeToUpdate.short);
                  setUpdateDialogOpen(false);
                  setThemeToUpdate(null);
                }
              }}
            >
              {updating ? (
                <Box className="animate-spin mr-2">
                  <RefreshCw size={16} />
                </Box>
              ) : null}
              {t("theme.update")}
            </Button>
          </Flex>
        </AppDialogContent>
      </Dialog.Root>

      {/* 导入主题对话框 */}
      <Dialog.Root
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportUrl("");
            setImportPreview(null);
            setImportError(null);
          }
        }}
      >
        <AppDialogContent
          maxWidth="520px"
          title={t("theme.import_title")}
          description={t("theme.import_description")}
        >
          <Box className="space-y-4 mt-4">
            <Flex gap="2">
              <Box className="flex-1">
                <TextField.Root
                  placeholder="https://github.com/owner/repo"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !importChecking) {
                      previewImportTheme();
                    }
                  }}
                  disabled={importChecking || importInstalling}
                />
              </Box>
              <Button
                onClick={previewImportTheme}
                disabled={
                  !importUrl.trim() || importChecking || importInstalling
                }
                className="gap-2"
              >
                {importChecking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {t("theme.import_check")}
              </Button>
            </Flex>

            {importError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <AlertTriangle size={16} />
                </Callout.Icon>
                <Callout.Text>{importError}</Callout.Text>
              </Callout.Root>
            )}

            {importPreview && (
              <Box>
                <Separator size="4" className="my-3" />
                <Card className="p-4">
                  <Flex direction="column" gap="2">
                    <Flex gap="2" align="center">
                      <Text size="2" weight="bold" color="gray" wrap="nowrap">
                        {t("theme.name")}
                      </Text>
                      <Text size="3" weight="bold">
                        {displayText(importPreview.theme.name)}
                      </Text>
                    </Flex>
                    <Flex gap="2" align="center">
                      <Text size="2" weight="bold" color="gray" wrap="nowrap">
                        {t("theme.version")}
                      </Text>
                      <Text size="3">{importPreview.theme.version}</Text>
                    </Flex>
                    <Flex gap="2" align="center">
                      <Text size="2" weight="bold" color="gray" wrap="nowrap">
                        {t("theme.author")}
                      </Text>
                      <Text size="3">
                        {displayText(importPreview.theme.author)}
                      </Text>
                    </Flex>
                    {displayText(importPreview.theme.description) && (
                      <Flex gap="2" align="center">
                        <Text
                          size="2"
                          weight="bold"
                          color="gray"
                          wrap="nowrap"
                        >
                          {t("theme.description")}
                        </Text>
                        <Text size="3">
                          {displayText(importPreview.theme.description)}
                        </Text>
                      </Flex>
                    )}
                  </Flex>

                  {importPreview.exists && (
                    <Callout.Root color="orange" size="1" className="mt-3">
                      <Callout.Icon>
                        <AlertTriangle size={16} />
                      </Callout.Icon>
                      <Callout.Text>
                        {t("theme.import_exists_warning")}
                      </Callout.Text>
                    </Callout.Root>
                  )}
                </Card>
              </Box>
            )}
          </Box>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            {importPreview && (
              <Button
                onClick={confirmImportTheme}
                disabled={importInstalling}
                className="gap-2"
              >
                {importInstalling && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {t("theme.import_confirm")}
              </Button>
            )}
          </Flex>
        </AppDialogContent>
      </Dialog.Root>

    </Box>
  );
};

export default ThemePage;
