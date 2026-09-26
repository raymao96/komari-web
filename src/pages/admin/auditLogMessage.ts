const SETTING_LABEL: Record<string, string> = {
  admin_default_page_size: "settings.general.admin_default_page_size",
  allow_mcp: "settings.general.allow_mcp",
  allow_remote_management: "settings.general.allow_remote_management",
  api_key: "account.api_key_label",
  auto_order_new_clients_by_region: "settings.general.auto_order_new_clients",
  cloudflare_tunnel_token: "settings.reverse_proxy.cloudflare_token",
  cors_allowed_origins: "settings.site.allowed_origins",
  cors_origin_check_enabled: "settings.site.cors_origin_check_enabled",
  custom_body: "settings.site.custom_body",
  custom_head: "settings.site.custom_head",
  description: "settings.site.description",
  disable_password_login: "settings.sign_on.disable_password",
  expire_notification_enabled: "admin.notification.expire_enable",
  expire_notification_lead_days: "admin.notification.expire_time",
  geo_ip_enabled: "settings.geoip.enable_title",
  geo_ip_provider: "settings.geoip.provider_title",
  https_certificate_path: "settings.reverse_proxy.certificate_path",
  https_enabled: "settings.reverse_proxy.enable_https",
  https_listen: "settings.reverse_proxy.https_port",
  https_private_key_path: "settings.reverse_proxy.private_key_path",
  https_redirect_http: "settings.reverse_proxy.redirect_http",
  login_notification: "admin.notification.login",
  mcp_default_duration_minutes: "mcp.default_duration",
  mcp_max_concurrency: "mcp.max_concurrency",
  mcp_max_duration_minutes: "mcp.max_duration",
  metric_db_dsn: "settings.metrics.dsn_title",
  metric_max_idle_conns: "settings.metrics.max_idle_conns_title",
  metric_max_open_conns: "settings.metrics.max_open_conns_title",
  metric_table_prefix: "settings.metrics.table_prefix_title",
  notification_enabled: "settings.notification.enable",
  notification_method: "settings.notification.method",
  notification_template: "settings.notification.template",
  o_auth_enabled: "settings.sso.enable",
  o_auth_provider: "settings.sso.provider",
  private_site: "settings.site.private_site",
  script_domain: "settings.site.script_domain_label",
  send_ip_addr_to_guest: "settings.site.send_ip_addr_to_guest",
  session_ttl_seconds: "account.auto_logout",
  sitename: "settings.site.name",
  tempory_share_token: "settings.site.tempory_share",
  theme: "navigation.appearance",
  traffic_limit_percentage: "admin.notification.traffic",
  traffic_reminder_step: "admin.notification.traffic_step",
  traffic_report_time: "notification.traffic_report.report_time",
  ws_allowed_origins: "settings.site.ws_allowed_origins",
  ws_origin_check_enabled: "settings.site.ws_origin_check_enabled",
};

const FILE_OP: Record<string, string> = {
  "file.copy": "audit.op.file_copy",
  "file.create": "audit.op.file_create",
  "file.delete": "audit.op.file_delete",
  "file.mkdir": "audit.op.file_mkdir",
  "file.rename": "audit.op.file_rename",
  "file.upload.start": "audit.op.file_upload",
};

const GEO_PROVIDER: Record<string, string> = {
  empty: "common.none",
  mmdb: "MaxMind",
  "ip-api": "ip-api.com",
  geojs: "geojs.io",
  ipinfo: "ipinfo.io",
};

export type AuditTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function formatAuditMessage(message: string, t: AuditTranslate): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return message;
  let parsed: { k?: unknown; p?: unknown };
  try {
    parsed = JSON.parse(trimmed) as { k?: unknown; p?: unknown };
  } catch {
    return message;
  }
  if (!parsed || typeof parsed.k !== "string" || !parsed.k.startsWith("audit.")) {
    return message;
  }
  const params: Record<string, string> = {};
  if (parsed.p && typeof parsed.p === "object") {
    for (const [key, value] of Object.entries(parsed.p as Record<string, unknown>)) {
      if (typeof value === "string") params[key] = value;
    }
  }
  const settingKey = params.setting ?? "";
  const labelKey = SETTING_LABEL[settingKey];
  if (labelKey) params.setting = t(labelKey);
  if (params.from) params.from = displayValue(settingKey, params.from, t);
  if (params.to) params.to = displayValue(settingKey, params.to, t);
  const opKey = FILE_OP[params.operation ?? ""];
  if (opKey) params.operation = t(opKey);
  if (
    (parsed.k === "audit.clipboard_create" ||
      parsed.k === "audit.clipboard_update" ||
      parsed.k === "audit.clipboard_delete") &&
    !params.name &&
    params.id
  ) {
    params.name = "#" + params.id;
  }
  return t(parsed.k, params);
}

function displayValue(setting: string, raw: string, t: AuditTranslate): string {
  if (setting === "https_listen") return raw.replace(/^:/, "");
  if (setting === "geo_ip_provider") {
    if (raw === "" || raw === "empty") return t("common.none");
    return GEO_PROVIDER[raw] ?? raw;
  }
  if (setting === "session_ttl_seconds") {
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds <= 0) return raw;
    if (seconds % 86400 === 0) return t("sessions.remain_d", { count: seconds / 86400 });
    if (seconds % 3600 === 0) return t("sessions.remain_h", { count: seconds / 3600 });
    if (seconds % 60 === 0) return t("sessions.remain_m", { count: seconds / 60 });
  }
  return raw;
}
