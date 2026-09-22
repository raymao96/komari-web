import React from "react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import {
  AppDialogContent, Dialog, Flex, Button } from "@/components/admin/ui";
import { UserAgentHelper } from "@/utils/UserAgentHelper";
import { formatSessionAge, remainingSessionLabel, sessionLastActivityMs, sessionLogoutAtMs, DEFAULT_SESSION_TTL_SECONDS } from "@/utils/sessionTtl";
import { AdminSectionTitle } from "@/components/admin/AdminPageTitle";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import Loading from "@/components/loading";
import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SettingsDetailRow, SettingsTextButton } from "@/components/admin/SettingsChrome";
import { Devices } from "@/components/admin/muiIcons";
function removeAllSessions() {
  fetch("/api/admin/session/remove/all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => {
      if (!response.ok) {
        toast.error("Error:" + response.status);
        return;
      }
      response
        .json()
        .then(() => {
          window.location.href = "/";
        })
        .catch((error) => {
          toast.error("Error parsing JSON:" + error);
        });
    })
    .catch((error) => {
      toast.error(error.message);
    });
}

export function SessionsDeleteAllButton() {
  const [t] = useTranslation();
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <MuiButton
          color="error"
          variant="contained"
          sx={{
            minHeight: { xs: 44, sm: 32 },
            fontSize: 13,
            px: 1.5,
            fontWeight: 600,
            boxShadow: "none",
            whiteSpace: "nowrap",
          }}
        >
          {t("sessions.delete_all")}
        </MuiButton>
      </Dialog.Trigger>
      <AppDialogContent>
        <Dialog.Title>{t("sessions.delete_all")}</Dialog.Title>
        <Dialog.Description>{t("sessions.delete_all_desc")}</Dialog.Description>
        <Flex gap="2" justify="end">
          <Dialog.Close>
            <Button variant="soft">{t("sessions.cancel")}</Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button color="red" onClick={removeAllSessions}>
              {t("delete")}
            </Button>
          </Dialog.Close>
        </Flex>
      </AppDialogContent>
    </Dialog.Root>
  );
}

type Resp = {
  current: string;
  server_time?: string;
  data: Array<{
    uuid: string;
    session: string;
    user_agent: string;
    ip: string;
    login_method: string;
    latest_online: string;
    latest_ip: string;
    latest_user_agent: string;
    expires: string;
    created_at: string;
  }>;
  status: string;
};

type SessionRow = Resp["data"][number];

function sessionClocks(s: SessionRow, ttlSeconds: number, nowMs: number) {
  return {
    lastMs: sessionLastActivityMs(s),
    logoutMs: sessionLogoutAtMs(s, ttlSeconds, nowMs),
  };
}

function formatLastOnline(lastMs: number, nowMs: number, t: (key: string) => string) {
  if (!Number.isFinite(lastMs)) return "—";
  return `${new Date(lastMs).toLocaleString()} (${formatSessionAge(nowMs - lastMs, t)})`;
}

function formatLogoutAt(
  logoutMs: number,
  serverNowMs: number,
  nowMs: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!Number.isFinite(logoutMs)) return "—";
  const remain = remainingSessionLabel(logoutMs, serverNowMs, nowMs, t);
  const suffix = remain.expired ? t("sessions.expired") : remain.text;
  return `${new Date(logoutMs).toLocaleString()} (${suffix})`;
}

export default function Sessions({
  embedded = false,
  onCount,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
}: {
  embedded?: boolean;
  onCount?: (count: number) => void;
  ttlSeconds?: number;
}) {
  const [t] = useTranslation();
  const [sessions, setSessions] = React.useState<Resp | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const sessionItems = sessions?.data ?? [];
  const { page, setPage, pageItems, pageSize, setPageSize } =
    useAdminPagination(sessionItems);
  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  React.useEffect(() => {
    if (sessions) onCount?.(sessionItems.length);
  }, [onCount, sessionItems.length, sessions]);
  React.useEffect(() => {
    fetch("/api/admin/session/get")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: Resp) => {
        setSessions(data);
      })
      .catch((error) => {
        console.error("Error fetching sessions:", error);
        toast.error(error.message);
      });
  }, []);

  function deleteSession(sessionId: string) {
    const isCurrent = sessionId === sessions?.current;
    fetch("/api/admin/session/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          toast.success(t("sessions.deleted_successfully"));
          if (isCurrent) {
            window.location.href = "/"; // 登出
            return;
          }
          setSessions((prev) => ({
            ...prev!,
            data: prev?.data.filter((s) => s.session !== sessionId) || [],
          }));
        } else {
          console.error("Failed to delete session:", data);
          toast.error(t("sessions.delete_failed"));
        }
      })
      .catch((error) => {
        console.error("Error deleting session:", error);
        toast.error(error.message);
      });
  }

  if (!sessions) {
    if (embedded) {
      return (
        <Stack spacing={1.2} role="status" aria-label={t("common.loading")}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={56} />
          ))}
        </Stack>
      );
    }
    return <Loading inline />;
  }

  const serverNowMs = Date.parse(sessions.server_time || "") || nowMs;

  if (embedded) {
    return (
      <>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.4 }}>
          {t("sessions.site_count", { count: sessionItems.length })}
        </Typography>
        <Paper variant="outlined" sx={{ px: 2, boxShadow: "none" }}>
          {pageItems.map((s, index) => {
            const isCurrent = s.session === sessions.current;
            const { lastMs, logoutMs } = sessionClocks(s, ttlSeconds, nowMs);
            return (
              <SettingsDetailRow
                key={`${s.uuid}-${s.session}-${index}`}
                icon={<Devices size={21} />}
                title={UserAgentHelper.format(s.user_agent, t) || s.user_agent || "Web"}
                description={[
                  isCurrent ? t("sessions.current") : null,
                  loginMethodLabel(s.login_method, t),
                  isCurrent ? null : formatSessionAge(nowMs - lastMs, t),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                action={
                  <Dialog.Root>
                    <Dialog.Trigger>
                      <SettingsTextButton>{t("sessions.detail")}</SettingsTextButton>
                    </Dialog.Trigger>
                    <AppDialogContent>
                      <Dialog.Title>{t("sessions.active_sessions")}</Dialog.Title>
                      <Flex direction="column" gap="1">
                        <label className="text-base font-bold">{t("sessions.device")}</label>
                        <label className="text-sm">
                          {UserAgentHelper.format(s.user_agent, t) || s.user_agent || "Web"}
                        </label>
                        <label className="text-base font-bold">{t("sessions.login_method")}</label>
                        <label className="text-sm">{loginMethodLabel(s.login_method, t)}</label>
                        <label className="text-base font-bold">{t("sessions.ip_latest")}</label>
                        <label className="text-sm">
                          {s.ip} / {s.latest_ip}
                        </label>
                        <label className="text-base font-bold">{t("sessions.created_at")}</label>
                        <label className="text-sm">
                          {new Date(s.created_at).toLocaleString()}
                          {" "}({formatSessionAge(nowMs - Date.parse(s.created_at), t)})
                        </label>
                        <label className="text-base font-bold">{t("sessions.latest_online")}</label>
                        <label className="text-sm">{formatLastOnline(lastMs, nowMs, t)}</label>
                        <label className="text-base font-bold">{t("sessions.expires_at")}</label>
                        <label className="text-sm">{formatLogoutAt(logoutMs, serverNowMs, nowMs, t)}</label>
                        <Flex justify="end" gap="2">
                          <Dialog.Close>
                            <Button variant="soft">{t("close")}</Button>
                          </Dialog.Close>
                          <Dialog.Close>
                            <Button color="red" onClick={() => deleteSession(s.session)}>
                              {isCurrent
                                ? t("sessions.logout_current")
                                : t("sessions.end_session")}
                            </Button>
                          </Dialog.Close>
                        </Flex>
                      </Flex>
                    </AppDialogContent>
                  </Dialog.Root>
                }
                border={index < pageItems.length - 1}
              />
            );
          })}
        </Paper>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <AdminPagination
            page={page}
            total={sessionItems.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showSummary={false}
            hideDivider
          />
        </Box>
      </>
    );
  }

  return (
    <Flex direction="column" gap="3" className="w-full min-w-0">
      {embedded ? null : (
        <AdminSectionTitle>{t("sessions.title")}</AdminSectionTitle>
      )}
      <div>
        <SessionsDeleteAllButton />
      </div>
      <div className="admin-responsive-table-wrap w-full min-w-0 overflow-hidden rounded-md border border-[var(--gray-a5)]">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sessions.session_id")}</TableHead>
              <TableHead>{t("sessions.ua")}</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>{t("sessions.latest_ip")}</TableHead>
              <TableHead>{t("sessions.expires_at")}</TableHead>
              <TableHead>{t("sessions.remaining")}</TableHead>
              <TableHead>{t("sessions.last_login")}</TableHead>
              <TableHead>{t("sessions.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((s, index) => {
              const isCurrent = s.session === sessions.current;
              const { lastMs, logoutMs } = sessionClocks(s, ttlSeconds, nowMs);
              return (
                <TableRow key={`${s.uuid}-${s.session}-${index}`}>
                  <TableCell>
                    <Dialog.Root>
                      <Dialog.Trigger>
                        <label className="hover:underline cursor-pointer">
                          {s.session.slice(0, 8)}...
                          {isCurrent && (
                            <span className="ml-2 text-sm text-blue-600">
                              {t("sessions.current")}
                            </span>
                          )}
                        </label>
                      </Dialog.Trigger>
                      <AppDialogContent>
                        <Dialog.Title>
                          {t("sessions.active_sessions")}
                        </Dialog.Title>
                        <Flex direction="column" gap="1">
                          <label className="text-base font-bold">
                            {t("sessions.session_id")}
                          </label>
                          <label className="text-sm">{s.session}</label>
                          <label className="text-base font-bold">
                            {t("sessions.ip_latest")}
                          </label>
                          <label className="text-sm">
                            {s.ip} / {s.latest_ip}
                          </label>
                          <label className="text-base font-bold">
                            {t("sessions.user_agent")}
                          </label>
                          <label className="text-sm">{s.user_agent}</label>
                          <label className="text-sm text-muted-foreground font-bold">
                            {UserAgentHelper.format(s.user_agent, t)}
                          </label>
                          <label className="text-base font-bold">
                            {t("sessions.last_user_agent")}
                          </label>
                          <label className="text-sm">
                            {s.latest_user_agent}
                          </label>
                          <label className="text-sm text-muted-foreground font-bold">
                            {UserAgentHelper.format(s.latest_user_agent, t)}
                          </label>

                          <label className="text-base font-bold">
                            {t("sessions.login_method")}
                          </label>
                          <label className="text-sm">{loginMethodLabel(s.login_method, t)}</label>
                          <label className="text-base font-bold">
                            {t("sessions.latest_online")}
                          </label>
                          <label className="text-sm">{formatLastOnline(lastMs, nowMs, t)}</label>
                          <label className="text-base font-bold">
                            {t("sessions.created_at")}
                          </label>
                          <label className="text-sm">
                            {new Date(s.created_at).toLocaleString()}
                          </label>
                          <label className="text-base font-bold">
                            {t("sessions.expires_at")}
                          </label>
                          <label className="text-sm">{formatLogoutAt(logoutMs, serverNowMs, nowMs, t)}</label>
                          <Flex justify={"end"}>
                            <Dialog.Close>
                              <Button variant="soft">{t("close")}</Button>
                            </Dialog.Close>
                          </Flex>
                        </Flex>
                      </AppDialogContent>
                    </Dialog.Root>
                  </TableCell>
                  <TableCell>{UserAgentHelper.format(s.user_agent, t)}</TableCell>
                  <TableCell>{s.ip}</TableCell>
                  <TableCell>{s.latest_ip}</TableCell>
                  <TableCell>{new Date(logoutMs).toLocaleString()}</TableCell>
                  <TableCell>
                    {(() => {
                      const remain = remainingSessionLabel(logoutMs, serverNowMs, nowMs, t);
                      return remain.expired ? t("sessions.expired") : remain.text;
                    })()}
                  </TableCell>
                  <TableCell>
                    {formatLastOnline(lastMs, nowMs, t)}
                  </TableCell>
                  <TableCell>
                    <Dialog.Root>
                      {!isCurrent && (
                        <Dialog.Trigger>
                          <Button color="red" variant="ghost">
                            {t("delete")}
                          </Button>
                        </Dialog.Trigger>
                      )}
                      <AppDialogContent>
                        <Dialog.Title>
                          {t("sessions.confirm_delete")}
                        </Dialog.Title>
                        <Dialog.Description>
                          {t("sessions.delete_one_desc")}
                        </Dialog.Description>
                        <Flex gap="2" justify={"end"}>
                          <Dialog.Close>
                            <Button variant="soft">
                              {t("sessions.cancel")}
                            </Button>
                          </Dialog.Close>
                          <Dialog.Close>
                            <Button
                              color="red"
                              onClick={() => deleteSession(s.session)}
                            >
                              {t("delete")}
                            </Button>
                          </Dialog.Close>
                        </Flex>
                      </AppDialogContent>
                    </Dialog.Root>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
        <AdminPagination
          page={page}
          total={sessionItems.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showSummary={false}
        />
      </div>
    </Flex>
  );
}

function loginMethodLabel(method: string, t: (key: string) => string) {
  if (method === "passkey") return t("sessions.method_passkey");
  if (method === "password") return t("sessions.method_password");
  if (!method) return t("common.unknown");
  return t("sessions.method_sso");
}
