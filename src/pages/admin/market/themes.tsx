import { useSettings } from "@/lib/api";
import { resolveI18nText, type I18nText } from "@/utils/i18nText";
import {
  getThemeMarketSnapshot,
  loadThemeMarketSources,
  prefetchThemeMarket,
  refreshThemeMarketCatalog,
  themeMarketRequest as request,
  type MarketSource,
  type MarketSourceStatus,
  type MarketTheme,
  type ThemeMarketSnapshot,
} from "@/lib/themeMarket";
import {
  AppDialogContent,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Grid,
  IconButton,
  Separator,
  Switch,
  Text,
  TextField,
} from "@/components/admin/ui";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
} from "@/components/admin/muiIcons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ThemePreviewImage from "@/components/ThemePreviewImage";
import { themePreviewSrc } from "@/utils/themePreviewImage";
import { localizeThemeMarketMessage } from "@/utils/themeMarketI18n";
import { invalidateInstalledThemes } from "@/lib/themeList";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";

function isVersionNewer(candidate: string, installed: string) {
  const parse = (value: string) => {
    const match = value.trim().replace(/^v/i, "").match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    return match ? [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)] : null;
  };
  const next = parse(candidate);
  const current = parse(installed);
  if (!next || !current) return candidate !== installed;
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] !== current[index]) return next[index] > current[index];
  }
  return false;
}

const emptySource = (): Omit<MarketSource, "id"> => ({
  name: "",
  url: "",
  enabled: true,
});

export default function ThemeMarketPage() {
  const { t, i18n } = useTranslation();
  const snapshot = getThemeMarketSnapshot();
  const [themes, setThemes] = useState(snapshot?.themes ?? []);
  const [sourceStatuses, setSourceStatuses] = useState<MarketSourceStatus[]>(
    snapshot?.sourceStatuses ?? [],
  );
  const [sources, setSources] = useState<MarketSource[]>(snapshot?.sources ?? []);
  const [installed, setInstalled] = useState<Map<string, string>>(
    () => new Map(snapshot?.installed ?? []),
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(() => snapshot === null);
  const [refreshing, setRefreshing] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [editingID, setEditingID] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState(emptySource());
  const [savingSource, setSavingSource] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<MarketTheme | null>(null);
  const [themeToUninstall, setThemeToUninstall] = useState<MarketTheme | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<MarketSource | null>(null);
  const [settingTheme, setSettingTheme] = useState<string | null>(null);
  const [deletingTheme, setDeletingTheme] = useState<string | null>(null);
  const { settings, refetch: refetchSettings } = useSettings();
  const currentTheme = settings?.theme;
  const language = i18n.resolvedLanguage || i18n.language;
  const displayText = useCallback(
    (value: I18nText) => resolveI18nText(value, language) || "",
    [language],
  );

  const applySnapshot = useCallback((next: ThemeMarketSnapshot) => {
    setThemes(next.themes);
    setSourceStatuses(next.sourceStatuses);
    setSources(next.sources);
    setInstalled(new Map(next.installed));
  }, []);

  const loadSources = useCallback(async () => {
    setSources(await loadThemeMarketSources());
  }, []);

  const loadCatalog = useCallback(async (force = false) => {
    applySnapshot(await refreshThemeMarketCatalog(force));
  }, [applySnapshot]);

  useEffect(() => {
    prefetchThemeMarket()
      .then(applySnapshot)
      .catch((error) =>
        toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t)),
      )
      .finally(() => setLoading(false));
  }, [applySnapshot]);

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return themes;
    return themes.filter((theme) =>
      [displayText(theme.name), theme.short, displayText(theme.author), displayText(theme.description), theme.source_name]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
    );
  }, [displayText, search, themes]);
  const { page, setPage, pageItems, pageSize, setPageSize } =
    useAdminPagination(filteredThemes);
  useEffect(() => setPage(1), [search, setPage]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadCatalog(true);
      toast.success(t("market.refresh_success", "Theme sources refreshed"));
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    } finally {
      setRefreshing(false);
    }
  };

  const installTheme = async (theme: MarketTheme) => {
    const key = `${theme.source_id}:${theme.short}`;
    setInstalling(key);
    try {
      await request("/api/admin/theme/market/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: theme.source_id, short: theme.short }),
      });
      toast.success(t("market.install_success"));
      invalidateInstalledThemes();
      await loadCatalog();
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    } finally {
      setInstalling(null);
    }
  };

  const setActiveTheme = async (theme: MarketTheme) => {
    setSettingTheme(theme.short);
    try {
      await request(`/api/admin/theme/set?theme=${encodeURIComponent(theme.short)}`);
      await refetchSettings();
      toast.success(t("theme.set_success", "Theme activated"));
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    } finally {
      setSettingTheme(null);
    }
  };

  const uninstallTheme = async (theme: MarketTheme) => {
    setDeletingTheme(theme.short);
    try {
      await request("/api/admin/theme/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short: theme.short }),
      });
      invalidateInstalledThemes();
      await Promise.all([loadCatalog(), refetchSettings()]);
      setSelectedTheme(null);
      toast.success(t("market.uninstall_success", "Theme uninstalled"));
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    } finally {
      setDeletingTheme(null);
    }
  };

  const startCreateSource = () => {
    setEditingID(null);
    setSourceForm(emptySource());
  };

  const startEditSource = (source: MarketSource) => {
    setEditingID(source.id);
    setSourceForm({ name: source.name, url: source.url, enabled: source.enabled });
  };

  const saveSource = async () => {
    if (!sourceForm.name.trim() || !sourceForm.url.trim()) return;
    setSavingSource(true);
    try {
      await request(
        editingID
          ? `/api/admin/theme/market/sources/${encodeURIComponent(editingID)}`
          : "/api/admin/theme/market/sources",
        {
          method: editingID ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sourceForm),
        },
      );
      toast.success(
        editingID
          ? t("market.source_updated", "Source updated")
          : t("market.source_created", "Source created"),
      );
      startCreateSource();
      await Promise.all([loadSources(), loadCatalog(true)]);
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    } finally {
      setSavingSource(false);
    }
  };

  const updateSourceEnabled = async (source: MarketSource, enabled: boolean) => {
    try {
      await request(`/api/admin/theme/market/sources/${encodeURIComponent(source.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...source, enabled }),
      });
      await Promise.all([loadSources(), loadCatalog(true)]);
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    }
  };

  const deleteSource = async (source: MarketSource) => {
    try {
      await request(`/api/admin/theme/market/sources/${encodeURIComponent(source.id)}`, {
        method: "DELETE",
      });
      if (editingID === source.id) startCreateSource();
      toast.success(t("market.source_deleted", "Source deleted"));
      await Promise.all([loadSources(), loadCatalog(true)]);
    } catch (error) {
      toast.error(localizeThemeMarketMessage(error instanceof Error ? error.message : String(error), t));
    }
  };

  if (loading) {
    return <div data-admin-route-pending="true" />;
  }

  return (
    <Flex direction="column" gap="5" className="p-0 md:p-4">
      <Flex justify="between" align="center" gap="3" wrap="wrap">
        <AdminPageTitle
          description={t(
            "market.description",
            "Find and install themes from the internet.",
          )}
        >
          {t("market.themes", "Theme Market")}
        </AdminPageTitle>
        <Flex gap="2">
          <Button variant="soft" onClick={() => setSourcesOpen(true)}>
            <Settings2 size={16} />
            {t("market.manage_sources", "Manage sources")}
          </Button>
          <IconButton variant="soft" onClick={refresh} disabled={refreshing} title={t("market.refresh", "Refresh")}>
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </IconButton>
        </Flex>
      </Flex>

      {sourceStatuses.filter((source) => source.error).map((source) => (
        <Callout.Root key={source.id} color="red" size="1">
          <Callout.Icon><AlertTriangle size={16} /></Callout.Icon>
          <Callout.Text>{source.name}: {source.error}</Callout.Text>
        </Callout.Root>
      ))}

      <TextField.Root
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("market.search_placeholder", "Search themes, authors or sources")}
        size="3"
      >
        <TextField.Slot><Search size={17} /></TextField.Slot>
      </TextField.Root>

      {filteredThemes.length === 0 ? (
        <Flex direction="column" align="center" justify="center" className="py-16" gap="2">
          <ImageIcon size={42} className="text-gray-400" />
          <Text color="gray">{t("market.no_themes", "No themes found")}</Text>
        </Flex>
      ) : (
        <div className="space-y-3">
        <Grid columns={{ initial: "1", sm: "2", lg: "3", xl: "4" }} gap="4">
          {pageItems.map((theme, index) => {
            const key = `${theme.source_id}:${theme.short}`;
            const installedVersion = installed.get(theme.short);
            const isInstalled = Boolean(installedVersion);
            const hasUpdate = Boolean(installedVersion && isVersionNewer(theme.version, installedVersion));
            const isActive = currentTheme === theme.short;
            const isInstallable = theme.installable;
            return (
              <Card
                key={key}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTheme(theme)}
              >
                <Box className="aspect-video bg-gray-3 overflow-hidden relative">
                  <ThemePreviewImage
                    src={themePreviewSrc(theme.preview, { card: true })}
                    alt={displayText(theme.name)}
                    loading="eager"
                    fetchPriority={index < 8 ? "high" : "low"}
                    referrerPolicy="no-referrer"
                    containerClassName="w-full h-full"
                    imageClassName="w-full h-full"
                    fit="cover"
                    fallbackLabel={t("theme.preview_unavailable", "Preview unavailable")}
                    iconSize={40}
                  />
                  {isActive && <Badge className="absolute top-2 right-2" color="green" variant="solid">{t("theme.active", "Active")}</Badge>}
                </Box>
                <Flex direction="column" gap="3" p="4">
                  <Box>
                    <Flex justify="between" align="start" gap="2">
                      <Text weight="bold" size="3">{displayText(theme.name)}</Text>
                      <IconButton asChild size="1" variant="ghost" title={t("market.project_page", "Project page")} onClick={(event) => event.stopPropagation()}>
                        <a href={theme.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a>
                      </IconButton>
                    </Flex>
                    <Text as="div" size="1" color="gray" mt="1">
                      {displayText(theme.author)} · v{theme.version}
                    </Text>
                  </Box>
                  <Text as="p" size="2" color="gray" className="min-h-10 line-clamp-2">
                    {displayText(theme.description)}
                  </Text>
                  <Flex justify="between" align="center" gap="2" wrap="wrap">
                    <Box>
                      {isInstalled && (
                        <Badge color={hasUpdate ? "orange" : "green"} variant="soft">
                          {hasUpdate
                            ? t("market.update_available", "Update available")
                            : t("market.installed", "Installed")}
                        </Badge>
                      )}
                      {!isInstalled && !isInstallable && (
                        <Badge color="gray" variant="soft">{t("market.install_unavailable", "Package unavailable")}</Badge>
                      )}
                    </Box>
                    <Flex gap="1" wrap="wrap" justify="end" onClick={(event) => event.stopPropagation()}>
                      {!isInstalled && isInstallable && (
                        <Button size="1" onClick={() => installTheme(theme)} disabled={installing === key}>
                          {installing === key ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                          {t("market.install", "Install")}
                        </Button>
                      )}
                      {hasUpdate && isInstallable && (
                        <Button size="1" onClick={() => installTheme(theme)} disabled={installing === key}>
                          {installing === key ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          {t("market.update", "Update")}
                        </Button>
                      )}
                      {isInstalled && !isActive && (
                        <Button size="1" variant="soft" onClick={() => setActiveTheme(theme)} disabled={settingTheme === theme.short}>
                          <Settings2 size={14} />{t("theme.set_active", "Set theme")}
                        </Button>
                      )}
                      {isInstalled && (
                        <Button size="1" variant="soft" color="red" onClick={() => setThemeToUninstall(theme)} disabled={deletingTheme === theme.short}>
                          <Trash2 size={14} />{t("market.uninstall", "Uninstall")}
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            );
          })}
        </Grid>
        <AdminPagination
          page={page}
          total={filteredThemes.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
        </div>
      )}

      <Dialog.Root open={Boolean(selectedTheme)} onOpenChange={(open) => { if (!open) setSelectedTheme(null); }}>
        <AppDialogContent
          maxWidth="820px"
          title={selectedTheme ? displayText(selectedTheme.name) : ""}
          visuallyHiddenDescription={selectedTheme ? displayText(selectedTheme.description) : ""}
        >
          {selectedTheme && (() => {
            const key = `${selectedTheme.source_id}:${selectedTheme.short}`;
            const installedVersion = installed.get(selectedTheme.short);
            const isInstalled = Boolean(installedVersion);
            const hasUpdate = Boolean(installedVersion && isVersionNewer(selectedTheme.version, installedVersion));
            const isActive = currentTheme === selectedTheme.short;
            const isInstallable = selectedTheme.installable;
            return (
              <>
                <Box className="aspect-video bg-gray-3 overflow-hidden mt-4">
                  <ThemePreviewImage
                    src={themePreviewSrc(selectedTheme.preview)}
                    alt={displayText(selectedTheme.name)}
                    loading="eager"
                    referrerPolicy="no-referrer"
                    containerClassName="w-full h-full"
                    imageClassName="w-full h-full"
                    fit="contain"
                    fallbackLabel={t("theme.preview_unavailable", "Preview unavailable")}
                    iconSize={56}
                  />
                </Box>
                <Flex direction="column" gap="2" mt="4">
                  <Text size="2" color="gray">{displayText(selectedTheme.description)}</Text>
                  <Flex gap="2" wrap="wrap">
                    <Badge variant="soft">{displayText(selectedTheme.author)}</Badge>
                    <Badge variant="soft">v{selectedTheme.version}</Badge>
                    {installedVersion && <Badge color="green" variant="soft">{t("market.installed_version", "Installed v{{version}}", { version: installedVersion })}</Badge>}
                    {!isInstalled && !isInstallable && <Badge color="gray" variant="soft">{t("market.install_unavailable", "Package unavailable")}</Badge>}
                  </Flex>
                  <Text size="2"><Text weight="bold">{t("market.source", "Source")}:</Text> {selectedTheme.source_name}</Text>
                  <a href={selectedTheme.url} target="_blank" rel="noreferrer" className="text-sm text-blue-9 inline-flex items-center gap-1 w-fit">
                    {t("market.project_page", "Project page")}<ExternalLink size={14} />
                  </a>
                </Flex>
                <Flex justify="end" gap="2" mt="5" wrap="wrap">
                  <Dialog.Close><Button variant="soft" color="gray">{t("common.close", "Close")}</Button></Dialog.Close>
                  {!isInstalled && isInstallable && (
                    <Button onClick={() => installTheme(selectedTheme)} disabled={installing === key}>
                      <Download size={15} />{t("market.install", "Install")}
                    </Button>
                  )}
                  {hasUpdate && isInstallable && (
                    <Button onClick={() => installTheme(selectedTheme)} disabled={installing === key}>
                      <RefreshCw size={15} />{t("market.update", "Update")}
                    </Button>
                  )}
                  {isInstalled && !isActive && (
                    <Button variant="soft" onClick={() => setActiveTheme(selectedTheme)} disabled={settingTheme === selectedTheme.short}>
                      <Settings2 size={15} />{t("theme.set_active", "Set theme")}
                    </Button>
                  )}
                  {isInstalled && (
                    <Button color="red" variant="soft" onClick={() => setThemeToUninstall(selectedTheme)} disabled={deletingTheme === selectedTheme.short}>
                      <Trash2 size={15} />{t("market.uninstall", "Uninstall")}
                    </Button>
                  )}
                </Flex>
              </>
            );
          })()}
        </AppDialogContent>
      </Dialog.Root>

      <Dialog.Root open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <AppDialogContent
          maxWidth="760px"
          title={t("market.manage_sources", "Manage sources")}
          visuallyHiddenDescription={t("market.manage_sources", "Manage sources")}
        >
          <Flex direction="column" gap="3" mt="4">
            {sources.length === 0 ? (
              <Text color="gray">{t("market.no_sources", "No sources configured")}</Text>
            ) : sources.map((source, index) => (
              <Box key={source.id}>
                {index > 0 && <Separator size="4" mb="3" />}
                <Flex justify="between" align="center" gap="3">
                  <Box className="min-w-0">
                    <Text as="div" weight="medium">{source.name}</Text>
                    <Text as="div" size="1" color="gray" className="truncate">{source.url}</Text>
                  </Box>
                  <Flex align="center" gap="2" className="shrink-0">
                    <Switch checked={source.enabled} onCheckedChange={(checked) => updateSourceEnabled(source, checked)} />
                    <IconButton variant="ghost" onClick={() => startEditSource(source)} title={t("common.edit", "Edit")}><Pencil size={16} /></IconButton>
                    <IconButton variant="ghost" color="red" onClick={() => setSourceToDelete(source)} title={t("common.delete", "Delete")}><Trash2 size={16} /></IconButton>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>

          <Separator size="4" my="5" />
          <Flex justify="between" align="center" mb="3">
            <Text weight="bold">{editingID ? t("market.edit_source", "Edit source") : t("market.add_source", "Add source")}</Text>
            {editingID && <Button size="1" variant="ghost" onClick={startCreateSource}><Plus size={14} />{t("market.add_source", "Add source")}</Button>}
          </Flex>
          <Flex direction="column" gap="3">
            <TextField.Root value={sourceForm.name} onChange={(event) => setSourceForm((current) => ({ ...current, name: event.target.value }))} placeholder={t("market.source_name", "Source name")} />
            <TextField.Root value={sourceForm.url} onChange={(event) => setSourceForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://raw.githubusercontent.com/owner/repo/main/v1.json" />
            <Flex justify="between" align="center">
              <Flex align="center" gap="2"><Switch checked={sourceForm.enabled} onCheckedChange={(enabled) => setSourceForm((current) => ({ ...current, enabled }))} /><Text size="2">{t("market.enabled", "Enabled")}</Text></Flex>
              <Button onClick={saveSource} disabled={savingSource || !sourceForm.name.trim() || !sourceForm.url.trim()}>
                {savingSource && <RefreshCw size={15} className="animate-spin" />}
                {editingID ? t("common.save", "Save") : t("common.add", "Add")}
              </Button>
            </Flex>
          </Flex>
          <Flex justify="end" mt="5"><Dialog.Close><Button variant="soft">{t("common.close", "Close")}</Button></Dialog.Close></Flex>
        </AppDialogContent>
      </Dialog.Root>

      <Dialog.Root open={Boolean(themeToUninstall)} onOpenChange={(open) => { if (!open) setThemeToUninstall(null); }}>
        <AppDialogContent
          maxWidth="420px"
          title={t("market.uninstall", "Uninstall")}
          description={t("market.uninstall_confirm", "Uninstall {{name}}?", { name: themeToUninstall ? displayText(themeToUninstall.name) : "" })}
        >
          <Flex justify="end" gap="2" mt="4">
            <Dialog.Close><Button variant="soft" color="gray">{t("common.cancel", "Cancel")}</Button></Dialog.Close>
            <Button
              color="red"
              disabled={!themeToUninstall || deletingTheme === themeToUninstall.short}
              onClick={async () => {
                if (!themeToUninstall) return;
                await uninstallTheme(themeToUninstall);
                setThemeToUninstall(null);
              }}
            >
              {deletingTheme && <RefreshCw size={15} className="animate-spin" />}
              {t("market.uninstall", "Uninstall")}
            </Button>
          </Flex>
        </AppDialogContent>
      </Dialog.Root>

      <Dialog.Root open={Boolean(sourceToDelete)} onOpenChange={(open) => { if (!open) setSourceToDelete(null); }}>
        <AppDialogContent
          maxWidth="420px"
          title={t("common.delete", "Delete")}
          description={t("market.delete_source_confirm", "Delete source {{name}}?", { name: sourceToDelete?.name })}
        >
          <Flex justify="end" gap="2" mt="4">
            <Dialog.Close><Button variant="soft" color="gray">{t("common.cancel", "Cancel")}</Button></Dialog.Close>
            <Button
              color="red"
              disabled={!sourceToDelete}
              onClick={async () => {
                if (!sourceToDelete) return;
                await deleteSource(sourceToDelete);
                setSourceToDelete(null);
              }}
            >
              {t("common.delete", "Delete")}
            </Button>
          </Flex>
        </AppDialogContent>
      </Dialog.Root>
    </Flex>
  );
}
