import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import {
  SettingsAlert,
  SettingsDashedZone,
  SettingsDetailRow,
  SettingsHero,
  SettingsSwitchRow,
  SettingsTextButton,
  settingsFieldSx,
  settingsSoftBg,
} from "@/components/admin/SettingsChrome";
import SettingsFeatureCard from "@/components/admin/SettingsFeatureCard";
import SettingsSheetDialog, {
  SettingsSheetActions,
} from "@/components/admin/SettingsSheetDialog";
import {
  Check,
  CloudUpload,
  Code,
  Copy,
  Devices,
  Folder,
  Globe,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Shield,
} from "@/components/admin/muiIcons";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { uploadArchive } from "@/utils/archiveUpload";
import {
  createCompletedUploadState,
  createProcessingUploadState,
  type UploadProgressState,
  withUploadProgressCopy,
} from "@/utils/uploadProgress";

const DEFAULT_SITE_ICON = "/favicon.png?v=lite-icon-0e86dd";
const siteIconPreviewSx = {
  width: 75,
  height: 75,
  objectFit: "contain",
  borderRadius: "16px",
} as const;

type SitePanel =
  | "basic"
  | "access"
  | "cors"
  | "ws"
  | "share"
  | "custom"
  | "favicon"
  | "backup"
  | null;

export default function SiteSettings() {
  const { t } = useTranslation();
  const { settings, loading, error, refetch, setSettings } = useSettings();
  const [panel, setPanel] = useState<SitePanel>(null);
  const [faviconRevision, setFaviconRevision] = useState(() => Date.now());

  const refreshFavicon = () => {
    const revision = Date.now();
    setFaviconRevision(revision);
    document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]').forEach((link) => {
      const href = link.getAttribute("href") || "/favicon.ico";
      const url = new URL(href, window.location.origin);
      if (url.pathname.endsWith("/favicon.ico")) {
        url.searchParams.set("v", String(revision));
        link.href = `${url.pathname}${url.search}${url.hash}`;
      }
    });
  };

  const downloadBackup = async (scope: "full" | "config") => {
    const response = await fetch(`/api/admin/download/backup?scope=${scope}`);
    if (!response.ok) {
      const body = await response.text();
      let message = body || `HTTP ${response.status}`;
      try {
        message = JSON.parse(body)?.message || message;
      } catch {
        // Keep the server response as-is when it is not JSON.
      }
      toast.error(message);
      throw new Error(message);
    }
    const disposition = response.headers.get("content-disposition") || "";
    const filename =
      disposition.match(/filename="?([^";]+)"?/i)?.[1] || `Lite-${scope}.zip`;
    const objectURL = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectURL;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectURL), 1_000);
  };

  if (loading) {
    return <SiteHomeSkeleton />;
  }
  if (error) {
    return (
      <Stack spacing={2.5}>
        <AdminPageTitle description={t("settings.site.heading_description", "管理站点信息、访问方式与数据备份。")}>
          {t("settings.site.heading", "站点设置")}
        </AdminPageTitle>
        <SettingsAlert severity="error">
          {t("settings.site.load_error", "暂时无法加载站点设置。")}
          <Box sx={{ mt: 1 }}>
            <SettingsTextButton icon={<RefreshCw size={16} />} onClick={() => void refetch()}>
              {t("common.retry", "重新加载")}
            </SettingsTextButton>
          </Box>
        </SettingsAlert>
      </Stack>
    );
  }

  const shareActive = Boolean(settings.tempory_share_token);
  const shareExpired =
    shareActive &&
    Number(settings.tempory_share_token_expire_at || 0) * 1000 <= Date.now();
  const corsOn = Boolean(settings.cors_origin_check_enabled);
  const wsOn = Boolean(settings.ws_origin_check_enabled);

  return (
    <Stack spacing={2.5}>
      <AdminPageTitle description={t("settings.site.heading_description", "管理站点信息、访问方式与数据备份。")}>
        {t("settings.site.heading", "站点设置")}
      </AdminPageTitle>

      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: { xs: 2.5, md: 3 },
          boxShadow: "none",
          borderRadius: "8px",
        }}
      >
        <Box
          component="img"
          src={`/favicon.ico?v=${faviconRevision}`}
          alt=""
          sx={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{settings.sitename || "Lite"}</Typography>
          <Typography sx={{ fontSize: 15, color: "text.secondary", lineHeight: 1.7 }}>
            {settings.description || t("settings.site.no_description", "未设置描述")}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={
            settings.private_site
              ? t("settings.site.status_private_site", "私有站点")
              : t("settings.site.status_public_site", "公开站点")
          }
          sx={(theme) => ({
            height: 26,
            fontSize: 12,
            fontWeight: 600,
            bgcolor: settingsSoftBg(theme),
            color: "primary.main",
          })}
        />
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <SettingsFeatureCard
          layout="site"
          icon={<Globe size={24} />}
          title={t("settings.site.basic_title", "基本信息")}
          description={t("settings.site.basic_description", "站点名称、描述与安装命令中的站点地址")}
          meta={t("settings.site.current_site", "当前站点名称：{{name}}", { name: settings.sitename || "Lite" })}
          actionLabel={t("common.edit")}
          onAction={() => setPanel("basic")}
        />
        <SettingsFeatureCard
          layout="site"
          icon={<Shield size={24} />}
          title={t("settings.site.access_title", "访问设置")}
          description={t("settings.site.access_card_description", "访客访问、IP 展示与跨域请求")}
          meta={
            corsOn && wsOn
              ? t("settings.site.access_meta_on", "API / WebSocket 校验已开启")
              : t("settings.site.access_meta_mixed", "访问与跨域规则")
          }
          actionLabel={t("common.manage", "管理")}
          onAction={() => setPanel("access")}
        />
        <SettingsFeatureCard
          layout="site"
          icon={<PhotoCameraOutlined sx={{ fontSize: 24 }} />}
          title={t("settings.site.favicon_title", "站点图标")}
          description={t("settings.site.favicon_card_description", "浏览器标签页显示的 Favicon")}
          meta={t("settings.site.favicon_meta", "上传或恢复默认图标")}
          actionLabel={t("settings.site.manage_icon", "管理图标")}
          onAction={() => setPanel("favicon")}
        />
        <SettingsFeatureCard
          layout="site"
          icon={<Code size={24} />}
          title={t("settings.site.custom_title", "自定义内容")}
          description={t("settings.site.custom_card_description", "设置前台页面的 Head 与 Body 内容")}
          meta="Head / Body"
          actionLabel={t("common.edit")}
          onAction={() => setPanel("custom")}
        />
        <SettingsFeatureCard
          layout="site"
          icon={<KeyRound size={24} />}
          title={t("settings.site.tempory_share")}
          description={t("settings.site.share_card_description", "为私有站点创建临时访问链接")}
          meta={
            !shareActive
              ? t("settings.site.share_none_link", "当前没有分享链接")
              : shareExpired
                ? t("settings.site.share_expired_link", "分享链接已过期")
                : t("settings.site.share_active_link", "分享链接有效")
          }
          actionLabel={
            shareActive
              ? t("settings.site.manage_link", "管理链接")
              : t("settings.site.create_link", "创建链接")
          }
          onAction={() => setPanel("share")}
        />
        <SettingsFeatureCard
          layout="site"
          icon={<Folder size={24} />}
          title={t("settings.site.backup_title", "备份与恢复")}
          description={t("settings.site.backup_card_description", "下载完整或仅配置备份，上传备份恢复")}
          meta={t("settings.site.backup_meta_zip", "ZIP 格式")}
          actionLabel={t("settings.site.manage_backup", "管理备份")}
          onAction={() => setPanel("backup")}
        />
      </Box>

      <BasicInfoPanel
        open={panel === "basic"}
        onClose={() => setPanel(null)}
        settings={settings}
        refetch={refetch}
      />
      <AccessPanel
        open={panel === "access" || panel === "cors" || panel === "ws"}
        conceal={panel === "cors" || panel === "ws"}
        onClose={() => setPanel(null)}
        onOpenCors={() => setPanel("cors")}
        onOpenWs={() => setPanel("ws")}
        settings={settings}
        setSettings={setSettings}
      />
      <OriginListPanel
        open={panel === "cors"}
        hideBackdrop
        onClose={() => setPanel("access")}
        title={t("settings.site.cors_origin_check_enabled")}
        enabledKey="cors_origin_check_enabled"
        listKey="cors_allowed_origins"
        enabledLabel={t("settings.site.cors_origin_check_enabled")}
        description={t("settings.site.cors_browser_note", "适用于普通浏览器跨域访问，同源请求无需添加。")}
        settings={settings}
        setSettings={setSettings}
        refetch={refetch}
      />
      <OriginListPanel
        open={panel === "ws"}
        hideBackdrop
        onClose={() => setPanel("access")}
        title={t("settings.site.ws_origin_check_enabled")}
        enabledKey="ws_origin_check_enabled"
        listKey="ws_allowed_origins"
        enabledLabel={t("settings.site.ws_origin_check_enabled")}
        description={t("settings.site.ws_browser_note", "与 API 跨域分开保存，不替代远程连接策略。")}
        settings={settings}
        setSettings={setSettings}
        refetch={refetch}
      />
      <SharePanel
        open={panel === "share"}
        onClose={() => setPanel(null)}
        settings={settings}
        refetch={refetch}
      />
      <CustomPanel
        open={panel === "custom"}
        onClose={() => setPanel(null)}
        settings={settings}
        refetch={refetch}
      />
      <FaviconPanel
        open={panel === "favicon"}
        onClose={() => setPanel(null)}
        faviconRevision={faviconRevision}
        refreshFavicon={refreshFavicon}
      />
      <BackupPanel
        open={panel === "backup"}
        onClose={() => setPanel(null)}
        downloadBackup={downloadBackup}
      />
    </Stack>
  );
}

function SiteHomeSkeleton() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5} role="status" aria-label={t("common.loading")} data-admin-route-pending="true">
      <Box>
        <Skeleton width={140} height={32} />
        <Skeleton width={280} height={18} sx={{ mt: 1 }} />
      </Box>
      <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", gap: 2, p: 3, boxShadow: "none" }}>
        <Skeleton variant="rounded" width={52} height={52} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="25%" height={26} />
          <Skeleton width="42%" height={20} />
        </Box>
      </Paper>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{
              p: 2.5,
              boxShadow: "none",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.75 }}>
              <Skeleton variant="rounded" width={48} height={48} />
              <Skeleton width="36%" height={28} />
            </Stack>
            <Skeleton width="78%" height={20} />
            <Box sx={{ mt: "auto", pt: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
              <Skeleton width="42%" height={20} />
            </Box>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

function BasicInfoPanel({
  open,
  onClose,
  settings,
  refetch,
}: {
  open: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  refetch: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [sitename, setSitename] = useState(settings.sitename || "");
  const [description, setDescription] = useState(settings.description || "");
  const [scriptDomain, setScriptDomain] = useState(settings.script_domain || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setSitename(settings.sitename || "");
    setDescription(settings.description || "");
    setScriptDomain(settings.script_domain || "");
    setError("");
  };

  useEffect(() => {
    if (open) return;
    reset();
  }, [open, settings.sitename, settings.description, settings.script_domain]);

  return (
    <SettingsSheetDialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("settings.site.basic_title", "基本信息")}
      actions={
        <SettingsSheetActions
          onCancel={() => {
            reset();
            onClose();
          }}
          onConfirm={async () => {
            setSaving(true);
            setError("");
            try {
              await updateSettingsWithToast(
                {
                  sitename,
                  description,
                  script_domain: scriptDomain,
                },
                t,
              );
              await refetch();
              onClose();
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : t("settings.settings_save_failed"),
              );
            } finally {
              setSaving(false);
            }
          }}
          confirmLabel={t("settings.site.save_changes", "保存更改")}
          confirmDisabled={saving}
          loading={saving}
        />
      }
    >
      {error ? <SettingsAlert severity="error">{error}</SettingsAlert> : null}
      <TextField
        size="small"
        fullWidth
        label={t("settings.site.name")}
        helperText={t("settings.site.name_help", "显示在浏览器标题和站点页面中。")}
        value={sitename}
        onChange={(event) => setSitename(event.target.value)}
        sx={settingsFieldSx}
      />
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={3}
        label={t("settings.site.description")}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        sx={settingsFieldSx}
      />
      <TextField
        size="small"
        fullWidth
        label={t("settings.site.script_domain_label", "安装命令中的站点地址")}
        helperText={t("settings.site.script_domain_help", "留空使用当前访问地址；用于生成安装命令。")}
        placeholder={typeof window === "undefined" ? "" : window.location.origin}
        value={scriptDomain}
        onChange={(event) => setScriptDomain(event.target.value)}
        sx={settingsFieldSx}
      />
    </SettingsSheetDialog>
  );
}

function AccessPanel({
  open,
  conceal = false,
  onClose,
  onOpenCors,
  onOpenWs,
  settings,
  setSettings,
}: {
  open: boolean;
  conceal?: boolean;
  onClose: () => void;
  onOpenCors: () => void;
  onOpenWs: () => void;
  settings: Record<string, any>;
  setSettings: (value: any) => void;
}) {
  const { t } = useTranslation();
  const [savingKey, setSavingKey] = useState("");

  const saveSwitch = async (key: string, value: boolean) => {
    const previous = Boolean(settings[key]);
    setSavingKey(key);
    setSettings((current: any) => ({ ...current, [key]: value }));
    try {
      await updateSettingsWithToast({ [key]: value }, t);
    } catch {
      setSettings((current: any) => ({ ...current, [key]: previous }));
    } finally {
      setSavingKey("");
    }
  };

  return (
    <SettingsSheetDialog
      open={open}
      conceal={conceal}
      onClose={onClose}
      title={t("settings.site.access_title", "访问设置")}
      actions={<SettingsSheetActions onConfirm={onClose} confirmLabel={t("common.done", "完成")} />}
    >
      <SettingsSwitchRow
        icon={<LockKeyhole size={21} />}
        title={t("settings.site.private_site")}
        description={t("settings.site.private_site_help", "开启后，访客需要登录或临时链接访问")}
        checked={Boolean(settings.private_site)}
        disabled={savingKey === "private_site"}
        onChange={(next) => void saveSwitch("private_site", next)}
      />
      <SettingsSwitchRow
        icon={<Globe size={21} />}
        title={t("settings.site.send_ip_addr_to_guest")}
        description={t("settings.site.send_ip_guest_help", "例如 9.*.*.*，实际展示由主题决定")}
        checked={Boolean(settings.send_ip_addr_to_guest)}
        disabled={savingKey === "send_ip_addr_to_guest"}
        onChange={(next) => void saveSwitch("send_ip_addr_to_guest", next)}
        border={false}
      />
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1, mt: 0.5 }}>
        {t("settings.site.switch_saves_immediately", "开关修改后立即保存。")}
      </Typography>
      <Divider />
      <SettingsDetailRow
        icon={<Code size={21} />}
        title={t("settings.site.cors_title", "API 跨域请求")}
        description={
          settings.cors_origin_check_enabled
            ? String(settings.cors_allowed_origins || "").trim()
              ? t("settings.site.check_on", "校验已开启")
              : t("settings.site.check_on_empty", "校验已开启 · 允许列表为空")
            : t("settings.site.check_off", "校验已关闭")
        }
        action={
          <SettingsTextButton onClick={onOpenCors}>{t("common.configure", "设置")}</SettingsTextButton>
        }
      />
      <SettingsDetailRow
        icon={<Devices size={21} />}
        title={t("settings.site.ws_title", "WebSocket 来源")}
        description={
          settings.ws_origin_check_enabled
            ? String(settings.ws_allowed_origins || "").trim()
              ? t("settings.site.check_on", "校验已开启")
              : t("settings.site.check_on_empty", "校验已开启 · 允许列表为空")
            : t("settings.site.check_off", "校验已关闭")
        }
        action={
          <SettingsTextButton onClick={onOpenWs}>{t("common.configure", "设置")}</SettingsTextButton>
        }
        border={false}
      />
    </SettingsSheetDialog>
  );
}

function OriginListPanel({
  open,
  hideBackdrop = false,
  onClose,
  title,
  enabledKey,
  listKey,
  enabledLabel,
  description,
  settings,
  setSettings,
  refetch,
}: {
  open: boolean;
  hideBackdrop?: boolean;
  onClose: () => void;
  title: string;
  enabledKey: string;
  listKey: string;
  enabledLabel: string;
  description: string;
  settings: Record<string, any>;
  setSettings: (value: any) => void;
  refetch: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const savedEnabled = Boolean(settings[enabledKey]);
  const savedList = String(settings[listKey] || "");
  const [enabled, setEnabled] = useState(savedEnabled);
  const [list, setList] = useState(savedList);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [fieldKey, setFieldKey] = useState(0);

  const discardDraft = () => {
    setEnabled(savedEnabled);
    setList(savedList);
    setSavingSwitch(false);
    setSavingList(false);
    setFieldKey((current) => current + 1);
  };

  useEffect(() => {
    if (open) return;
    discardDraft();
  }, [open, savedEnabled, savedList]);

  const close = () => {
    discardDraft();
    onClose();
  };

  return (
    <SettingsSheetDialog
      open={open}
      hideBackdrop={hideBackdrop}
      onClose={close}
      title={title}
      actions={
        <SettingsSheetActions
          onCancel={close}
          onConfirm={async () => {
            setSavingList(true);
            try {
              await updateSettingsWithToast({ [listKey]: list }, t);
              await refetch();
              onClose();
            } finally {
              setSavingList(false);
            }
          }}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("settings.site.save_list", "保存允许列表")}
          confirmDisabled={savingList}
          loading={savingList}
        />
      }
    >
      <SettingsSwitchRow
        icon={enabledKey.includes("ws") ? <Devices size={21} /> : <Code size={21} />}
        title={enabledLabel}
        description={t("settings.site.switch_saves_immediately", "开关修改后立即保存。")}
        checked={enabled}
        disabled={savingSwitch}
        onChange={async (next) => {
          const previous = enabled;
          setEnabled(next);
          setSavingSwitch(true);
          setSettings((current: any) => ({ ...current, [enabledKey]: next }));
          try {
            await updateSettingsWithToast({ [enabledKey]: next }, t);
          } catch {
            setEnabled(previous);
            setSettings((current: any) => ({ ...current, [enabledKey]: previous }));
          } finally {
            setSavingSwitch(false);
          }
        }}
        border={false}
      />
      <Divider />
      <TextField
        key={`origins-${fieldKey}`}
        size="small"
        fullWidth
        multiline
        minRows={4}
        label={t("settings.site.allowed_origins", "允许的 Origin")}
        helperText={description}
        value={list}
        onChange={(event) => setList(event.target.value)}
        sx={{ ...settingsFieldSx, "& textarea": { fontSize: 14, lineHeight: 1.8 } }}
      />
    </SettingsSheetDialog>
  );
}

function SharePanel({
  open,
  onClose,
  settings,
  refetch,
}: {
  open: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  refetch: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(1);
  const [hoursError, setHoursError] = useState("");
  const [fieldKey, setFieldKey] = useState(0);
  const token = String(settings.tempory_share_token || "");
  const expireAt = Number(settings.tempory_share_token_expire_at || 0);
  const expired = Boolean(token) && expireAt * 1000 <= Date.now();
  const link = token ? `${window.location.origin}/?temp_key=${token}` : "";

  const discardDraft = () => {
    setHours(1);
    setHoursError("");
    setFieldKey((current) => current + 1);
  };

  useEffect(() => {
    if (open) return;
    discardDraft();
  }, [open]);

  const close = () => {
    discardDraft();
    onClose();
  };

  const generate = async () => {
    if (!Number.isInteger(hours) || hours < 1) {
      setHoursError(t("settings.site.share_hours_invalid", "请输入有限正整数小时。"));
      return;
    }
    setHoursError("");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await updateSettingsWithToast(
      {
        tempory_share_token: key,
        tempory_share_token_expire_at: Math.floor(Date.now() / 1000) + hours * 3600,
      },
      t,
    );
    await refetch();
  };

  return (
    <SettingsSheetDialog
      open={open}
      onClose={close}
      title={t("settings.site.tempory_share")}
      actions={
        token ? (
          <SettingsSheetActions
            onCancel={close}
            onConfirm={() => void generate()}
            cancelLabel={t("common.done", "完成")}
            confirmLabel={t("settings.site.regenerate_link", "重新生成")}
            left={
              <SettingsTextButton
                danger
                onClick={async () => {
                  await updateSettingsWithToast(
                    { tempory_share_token: "", tempory_share_token_expire_at: 0 },
                    t,
                  );
                  await refetch();
                  toast.success(t("settings.site.tempory_share_revoked", "已撤销临时访问链接"));
                }}
              >
                {t("settings.site.tempory_share_revoke", "撤销临时访问链接")}
              </SettingsTextButton>
            }
          />
        ) : (
          <SettingsSheetActions
            onCancel={close}
            onConfirm={() => void generate()}
            confirmLabel={t("settings.site.generate_link", "生成链接")}
          />
        )
      }
    >
      {!token ? (
        <SettingsHero
          icon={<KeyRound size={30} />}
          title={t("settings.site.share_hero_title", "创建临时访问链接")}
          description={t("settings.site.share_hero_desc", "让持有链接的人在有效期内访问私有站点。")}
        />
      ) : (
        <>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              {t("settings.site.current_share_link", "当前分享链接")}
            </Typography>
            <Chip size="small" color={expired ? "default" : "success"} label={expired ? t("settings.site.share_expired", "已过期") : t("settings.site.share_active", "有效")} />
          </Stack>
          <Paper variant="outlined" sx={{ p: 1.6, boxShadow: "none", overflowWrap: "anywhere", fontSize: 13 }}>
            {link}
          </Paper>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {t("settings.site.expires_at", "到期：{{time}}", { time: new Date(expireAt * 1000).toLocaleString() })}
            </Typography>
            <SettingsTextButton
              icon={<Copy size={16} />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  toast.success(t("copy"));
                } catch {
                  toast.error(t("settings.site.copy_failed", "复制失败，请手动选择文本。"));
                }
              }}
            >
              {t("settings.site.copy_link", "复制链接")}
            </SettingsTextButton>
          </Stack>
        </>
      )}
      <TextField
        key={`share-hours-${fieldKey}`}
        size="small"
        type="number"
        fullWidth
        label={t("settings.site.share_hours_label", "有效时长（小时）")}
        value={hours}
        error={Boolean(hoursError)}
        helperText={hoursError || t("settings.site.share_hours_help", "从生成链接时开始计算。")}
        onChange={(event) => setHours(Number.parseInt(event.target.value, 10) || 0)}
        sx={settingsFieldSx}
      />
      <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.8 }}>
        {token
          ? t("settings.site.share_regen_hint", "重新生成会替换当前链接，旧链接随即失效。")
          : t("settings.site.share_public_hint", "当前站点为公开模式。临时链接主要用于私有站点访问。")}
      </Typography>
    </SettingsSheetDialog>
  );
}

function CustomPanel({
  open,
  onClose,
  settings,
  refetch,
}: {
  open: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  refetch: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<"list" | "head" | "body">("list");
  const savedHead = String(settings.custom_head || "");
  const savedBody = String(settings.custom_body || "");
  const [head, setHead] = useState(savedHead);
  const [body, setBody] = useState(savedBody);
  const [saving, setSaving] = useState(false);
  const [fieldKey, setFieldKey] = useState(0);

  const discardDraft = () => {
    setKind("list");
    setHead(savedHead);
    setBody(savedBody);
    setSaving(false);
    setFieldKey((current) => current + 1);
  };

  useEffect(() => {
    if (open) return;
    discardDraft();
  }, [open, savedHead, savedBody]);

  const close = () => {
    discardDraft();
    onClose();
  };

  const cancelEdit = () => {
    setHead(savedHead);
    setBody(savedBody);
    setKind("list");
    setFieldKey((current) => current + 1);
  };

  return (
    <SettingsSheetDialog
      open={open}
      onClose={close}
      maxWidth={kind === "list" ? 560 : 780}
      title={
        kind === "head"
          ? t("settings.custom.header")
          : kind === "body"
            ? t("settings.custom.body")
            : t("settings.site.custom_title", "自定义内容")
      }
      actions={
        kind === "list" ? (
          <SettingsSheetActions onConfirm={close} confirmLabel={t("common.done", "完成")} />
        ) : (
          <SettingsSheetActions
            onCancel={cancelEdit}
            onConfirm={async () => {
              setSaving(true);
              try {
                await updateSettingsWithToast(
                  kind === "head" ? { custom_head: head } : { custom_body: body },
                  t,
                );
                await refetch();
                setKind("list");
              } finally {
                setSaving(false);
              }
            }}
            confirmLabel={t("settings.site.save_content", "保存内容")}
            confirmDisabled={saving}
            loading={saving}
          />
        )
      }
    >
      {kind === "list" ? (
        <>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>
            {t("settings.site.custom_theme_hint", "自定义内容用于前台页面，实际显示由当前主题决定。")}
          </Typography>
          <SettingsDetailRow
            icon={<Code size={21} />}
            title={t("settings.site.custom_head", "自定义 Head")}
            description={t("settings.site.custom_head_desc", "在页面 head 中插入内容")}
            action={<SettingsTextButton onClick={() => setKind("head")}>{t("common.edit")}</SettingsTextButton>}
          />
          <SettingsDetailRow
            icon={<Code size={21} />}
            title={t("settings.site.custom_body", "自定义 Body")}
            description={t("settings.site.custom_body_desc", "在页面 body 底部插入内容")}
            action={<SettingsTextButton onClick={() => setKind("body")}>{t("common.edit")}</SettingsTextButton>}
            border={false}
          />
        </>
      ) : (
        <>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
            {kind === "head"
              ? t("settings.site.custom_head_input", "输入要添加到前台页面 Head 的内容。")
              : t("settings.site.custom_body_input", "输入要添加到前台页面底部的内容。")}
          </Typography>
          <TextField
            key={`custom-${kind}-${fieldKey}`}
            size="small"
            fullWidth
            multiline
            minRows={10}
            label={kind === "head" ? t("settings.custom.header") : t("settings.custom.body")}
            helperText={t("settings.site.custom_empty_clears", "留空并保存可清除自定义内容。")}
            value={kind === "head" ? head : body}
            onChange={(event) =>
              kind === "head" ? setHead(event.target.value) : setBody(event.target.value)
            }
            sx={{
              ...settingsFieldSx,
              "& textarea": { whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "Consolas, monospace", lineHeight: 1.8 },
            }}
          />
        </>
      )}
    </SettingsSheetDialog>
  );
}

function FaviconPanel({
  open,
  onClose,
  faviconRevision,
  refreshFavicon,
}: {
  open: boolean;
  onClose: () => void;
  faviconRevision: number;
  refreshFavicon: () => void;
}) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (open) return;
    setConfirmReset(false);
    setError("");
    setUploading(false);
  }, [open]);

  const pickFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError(t("settings.site.favicon_too_large", "图片不能超过 5 MB。"));
        return;
      }
      setError("");
      setUploading(true);
      try {
        const response = await fetch("/api/admin/update/favicon", {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "application/octet-stream" },
        });
        const data = await response.json();
        if (data.status === "success") {
          refreshFavicon();
          toast.success(t("settings.custom.favicon_update_success"));
        } else {
          setError(data.message || t("settings.custom.favicon_default_error"));
        }
      } catch (reason) {
        setError(String(reason));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const closePanel = () => {
    setConfirmReset(false);
    setError("");
    onClose();
  };

  return (
    <SettingsSheetDialog
      open={open}
      onClose={closePanel}
      title={
        confirmReset
          ? t("settings.custom.favicon_default", "恢复默认")
          : t("settings.site.favicon_title", "站点图标")
      }
      actions={
        confirmReset ? (
          <SettingsSheetActions
            onCancel={() => setConfirmReset(false)}
            onConfirm={async () => {
              const response = await fetch("/api/admin/update/favicon", { method: "POST" });
              const data = await response.json();
              if (data.status === "success") {
                refreshFavicon();
                toast.success(t("settings.custom.favicon_default_success"));
                setConfirmReset(false);
                onClose();
              } else {
                setError(data.message || t("settings.custom.favicon_default_error"));
              }
            }}
            confirmLabel={t("settings.custom.favicon_default", "恢复默认")}
          />
        ) : uploading ? (
          <SettingsSheetActions
            onConfirm={() => undefined}
            confirmLabel={t("settings.site.uploading", "上传中")}
            confirmDisabled
            loading
          />
        ) : (
          <SettingsSheetActions
            onCancel={closePanel}
            onConfirm={pickFile}
            cancelLabel={t("common.close", "关闭")}
            confirmLabel={t("account.choose_image", "选择图片")}
            left={
              <SettingsTextButton onClick={() => setConfirmReset(true)}>
                {t("settings.custom.favicon_default")}
              </SettingsTextButton>
            }
          />
        )
      }
    >
      {error ? <SettingsAlert severity="error">{error}</SettingsAlert> : null}
      {confirmReset ? (
        <Stack spacing={3} sx={{ alignItems: "center", my: 1 }}>
          <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
            <Box
              component="img"
              src={`/favicon.ico?v=${faviconRevision}`}
              alt=""
              sx={siteIconPreviewSx}
            />
            <Typography sx={{ color: "text.secondary" }}>→</Typography>
            <Box component="img" src={DEFAULT_SITE_ICON} alt="" sx={siteIconPreviewSx} />
          </Stack>
          <Typography sx={{ fontSize: 12, lineHeight: 1.8, color: "text.secondary", textAlign: "center" }}>
            {t(
              "settings.site.reset_favicon_hint",
              "当前自定义图标将被替换为 Lite 默认图标。之后可以重新上传。",
            )}
          </Typography>
        </Stack>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              py: 1,
              mb: 1,
            }}
          >
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
              {t("settings.site.current_icon", "当前图标")}
            </Typography>
            <Box
              component="img"
              src={`/favicon.ico?v=${faviconRevision}`}
              alt=""
              sx={{ width: 72, height: 72, objectFit: "contain", borderRadius: "16px" }}
            />
          </Box>
          {uploading ? <LinearProgress sx={{ mb: 2, borderRadius: 1 }} /> : null}
          <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.8, textAlign: "center" }}>
            {t(
              "settings.site.favicon_upload_hint",
              "选择图片后直接上传，最大 5 MB。图标可能需要刷新页面或清除浏览器缓存后显示。",
            )}
          </Typography>
        </>
      )}
    </SettingsSheetDialog>
  );
}

function BackupPanel({
  open,
  onClose,
  downloadBackup,
}: {
  open: boolean;
  onClose: () => void;
  downloadBackup: (scope: "full" | "config") => Promise<void>;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"menu" | "restore">("menu");
  const [downloading, setDownloading] = useState<"full" | "config" | "">("");
  const [restoreState, setRestoreState] = useState<UploadProgressState | null>(null);
  const restoreController = useRef<AbortController | null>(null);
  const restoreStateRef = useRef<UploadProgressState | null>(null);
  const restoreCopy = useMemo(
    () => ({
      preparing: t("settings.site.phase_preparing"),
      uploading: t("settings.site.phase_uploading"),
      merging: t("settings.site.phase_processing"),
      processing: t("settings.site.phase_processing"),
      restarting: t("settings.site.phase_restarting"),
      completed: t("settings.site.backup_submitted", "备份已提交，服务即将重启并应用"),
      failed: t("settings.site.backup_restore_error"),
      nonCancelable: t("settings.site.phase_non_cancelable"),
    }),
    [t],
  );

  useEffect(() => {
    if (open) return;
    setMode("menu");
    setDownloading("");
    if (!restoreStateRef.current || restoreStateRef.current.canCancel) {
      setRestoreState(null);
      restoreStateRef.current = null;
    }
  }, [open]);

  const setTracked = (state: UploadProgressState | null) => {
    restoreStateRef.current = state;
    setRestoreState(state);
  };

  const uploadBackup = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error(t("theme.invalid_file_type", "仅支持 .zip 文件"));
      return;
    }
    const controller = new AbortController();
    restoreController.current = controller;
    try {
      await uploadArchive({
        basePath: "/api/admin/upload",
        purpose: "backup",
        file,
        signal: controller.signal,
        onStateChange: (state) => {
          const nextState =
            state.stage === "merging" ? createProcessingUploadState(state) : state;
          setTracked(withUploadProgressCopy(nextState, restoreCopy));
        },
      });
      setTracked(
        withUploadProgressCopy(
          createCompletedUploadState(restoreStateRef.current),
          restoreCopy,
        ),
      );
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setTracked(null);
      } else {
        toast.error(
          reason instanceof Error ? reason.message : t("settings.site.backup_restore_error"),
        );
      }
    } finally {
      restoreController.current = null;
    }
  };

  const pickRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void uploadBackup(file);
    };
    input.click();
  };

  const processing = Boolean(
    restoreState &&
      restoreState.stage !== "completed" &&
      restoreState.stage !== "failed",
  );

  return (
    <SettingsSheetDialog
      open={open}
      onClose={() => {
        if (processing && restoreState && !restoreState.canCancel) return;
        setMode("menu");
        setRestoreState(null);
        onClose();
      }}
      disableClose={Boolean(processing && restoreState && !restoreState.canCancel)}
      title={
        restoreState?.stage === "completed"
          ? t("settings.site.backup_submitted_title", "备份已提交")
          : t("settings.site.backup")
      }
      actions={
        restoreState?.stage === "completed" ? (
          <Button
            variant="contained"
            onClick={() => {
              setMode("menu");
              setRestoreState(null);
              onClose();
            }}
          >
            {t("settings.site.got_it", "知道了")}
          </Button>
        ) : mode === "restore" && !restoreState ? (
          <SettingsSheetActions
            onCancel={() => setMode("menu")}
            onConfirm={pickRestore}
            confirmLabel={t("settings.site.upload_backup", "上传备份并恢复")}
          />
        ) : restoreState && restoreState.canCancel ? (
          <Button
            color="inherit"
            onClick={() => {
              restoreController.current?.abort();
              setTracked(null);
            }}
          >
            {t("common.cancel")}
          </Button>
        ) : !restoreState ? (
          <Button
            variant="contained"
            onClick={() => {
              setMode("menu");
              onClose();
            }}
          >
            {t("common.done", "完成")}
          </Button>
        ) : (
          <Button disabled>
            {t("settings.site.phase_processing")}
          </Button>
        )
      }
    >
      {restoreState?.stage === "completed" ? (
        <SettingsHero
          icon={<Check size={30} />}
          title={t("settings.site.backup_submitted_title", "备份已提交")}
          description={t("settings.site.backup_submitted", "服务即将重启，并在启动时应用备份。")}
          success
        />
      ) : restoreState ? (
        <Stack spacing={1.5} sx={{ py: 1 }}>
          {restoreState.indeterminate || restoreState.percent == null ? (
            <LinearProgress sx={{ width: "100%" }} />
          ) : (
            <LinearProgress variant="determinate" value={restoreState.percent} sx={{ width: "100%", height: 6, borderRadius: 1 }} />
          )}
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{restoreState.label || restoreCopy.uploading}</Typography>
          {restoreState.detail ? (
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{restoreState.detail}</Typography>
          ) : null}
        </Stack>
      ) : mode === "restore" ? (
        <>
          <SettingsAlert severity="warning">
            {t("settings.site.backup_restore_description")}
          </SettingsAlert>
          <SettingsDashedZone
            icon={<CloudUpload size={38} />}
            title={t("settings.site.drop_backup", "拖放 ZIP 备份到这里")}
            description={t("settings.site.or_browse_backup", "也可点击下方按钮浏览文件")}
            onDropFiles={(files) => {
              const file = files[0];
              if (file) void uploadBackup(file);
            }}
          />
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {t("settings.site.zip_only", "仅支持 ZIP 备份。选择文件后即开始上传与恢复。")}
          </Typography>
        </>
      ) : (
        <>
          <SettingsDetailRow
            icon={<Folder size={21} />}
            title={t("settings.site.backup_full", "完整备份")}
            description={t("settings.site.backup_full_help", "包含站点配置、持久文件与监控历史")}
            action={
              <SettingsTextButton
                disabled={Boolean(downloading)}
                onClick={async () => {
                  setDownloading("full");
                  try {
                    await downloadBackup("full");
                  } finally {
                    setDownloading("");
                  }
                }}
              >
                {downloading === "full" ? <CircularProgress size={14} /> : t("common.export")}
              </SettingsTextButton>
            }
          />
          <SettingsDetailRow
            icon={<Folder size={21} />}
            title={t("settings.site.backup_config", "仅配置备份")}
            description={t(
              "settings.site.backup_config_download_description",
              "保留服务器、设置与探测任务，不含监控历史、会话、日志和任务记录。",
            )}
            action={
              <SettingsTextButton
                disabled={Boolean(downloading)}
                onClick={async () => {
                  setDownloading("config");
                  try {
                    await downloadBackup("config");
                  } finally {
                    setDownloading("");
                  }
                }}
              >
                {downloading === "config" ? <CircularProgress size={14} /> : t("common.export")}
              </SettingsTextButton>
            }
          />
          <SettingsDetailRow
            icon={<CloudUpload size={21} />}
            title={t("settings.site.backup_restore")}
            description={t("settings.site.backup_restore_short", "上传 ZIP，服务重启后应用备份")}
            action={
              <SettingsTextButton onClick={() => setMode("restore")}>
                {t("settings.site.upload_backup_file", "上传备份")}
              </SettingsTextButton>
            }
            border={false}
          />
          <Typography sx={{ mt: 2, fontSize: 12, color: "text.secondary" }}>
            {t("settings.site.backup_credential_hint", "下载的备份可能包含凭据，请妥善保存。")}
          </Typography>
        </>
      )}
    </SettingsSheetDialog>
  );
}
