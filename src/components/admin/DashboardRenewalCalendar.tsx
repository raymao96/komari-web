import Popover from "@mui/material/Popover";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { ChevronLeft, ChevronRight } from "@/components/admin/muiIcons";
import { Skeleton } from "@/components/admin/ui";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { currencyForDisplay } from "@/lib/currency";
import { earlyRenewPayload } from "@/lib/expiryDateTime";
import {
  expiriesByDate,
  localDateKey,
  monthCells,
  type RenewalServer,
} from "@/utils/renewalCalendar";

function weekdayLabels(locale: string): string[] {
  const monday = new Date(Date.UTC(2026, 0, 5));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(date);
  });
}

const RENEWAL_PAGE_SIZE = 5;

function formatDayLabel(date: string, locale: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(new Date(year, month - 1, day));
}

function cycleName(days: number, t: (key: string, fallback: string) => string): string {
  if (days === 30) return t("admin.nodeDetail.payMonthly", "月付");
  if (days === 92) return t("common.quarterly", "季付");
  if (days === 184) return t("common.semi_annual", "半年付");
  if (days === 365) return t("admin.nodeDetail.payYearly", "年付");
  if (days === 730) return t("common.biennial", "两年付");
  if (days === -1) return t("common.once", "一次性");
  return t("common.monthly", "月付");
}

function cycleFeeLabel(server: RenewalServer, t: (key: string, fallback: string) => string): string {
  const price = Number(server.price);
  const cycle = Number(server.billingCycle);
  if (!(price > 0) || !(cycle > 0)) return "";
  return `${currencyForDisplay(server.currency || "$")}${price.toFixed(2)} / ${cycleName(cycle, t)}`;
}

export function RenewalCalendarPanel() {
  const { t, i18n } = useTranslation();
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  const [renewing, setRenewing] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const today = React.useMemo(() => localDateKey(), []);
  const [cursor, setCursor] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [menu, setMenu] = React.useState<{ date: string; anchor: HTMLElement } | null>(null);
  const locale = i18n.resolvedLanguage || i18n.language || "zh-CN";

  const servers = React.useMemo<RenewalServer[]>(
    () => nodeDetail.flatMap((node) => {
      if (!node.uuid || typeof node.expired_at !== "string" || !node.expired_at) return [];
      return [{
        uuid: node.uuid,
        name: node.name || node.uuid,
        expiredAt: node.expired_at,
        expiryTimezone: node.expiry_timezone,
        price: Number(node.price) || 0,
        billingCycle: Number(node.billing_cycle) || 0,
        currency: typeof node.currency === "string" ? node.currency : "",
      }];
    }),
    [nodeDetail],
  );
  const grouped = React.useMemo(() => expiriesByDate(servers), [servers]);
  const cells = React.useMemo(() => monthCells(cursor.year, cursor.month), [cursor]);
  const weekdays = React.useMemo(() => weekdayLabels(locale), [locale]);
  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" })
    .format(new Date(cursor.year, cursor.month - 1, 1));
  const menuServers = menu ? grouped.get(menu.date) ?? [] : [];
  const menuPageCount = Math.max(1, Math.ceil(menuServers.length / RENEWAL_PAGE_SIZE));
  const menuPage = Math.min(page, menuPageCount);
  const visibleServers = menuServers.slice((menuPage - 1) * RENEWAL_PAGE_SIZE, menuPage * RENEWAL_PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [menu?.date]);

  const renew = async (server: RenewalServer) => {
    if (renewing || !(Number(server.billingCycle) > 0)) return;
    setRenewing(server.uuid);
    try {
      const response = await fetch(`/api/admin/client/${server.uuid}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(earlyRenewPayload(server.expiredAt)),
      });
      const text = await response.text();
      let body: { message?: string } | null = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (!response.ok) {
        throw new Error(body?.message || text || `HTTP ${response.status}`);
      }
      toast.success(t("admin_dashboard.renewal_done"));
      refresh();
      setMenu(null);
    } catch (renewError) {
      toast.error(`${t("admin_dashboard.renewal_failed")}: ${
        renewError instanceof Error ? renewError.message : String(renewError)
      }`);
    } finally {
      setRenewing(null);
    }
  };

  const shiftMonth = (delta: number) => {
    setMenu(null);
    setCursor((current) => {
      const next = new Date(current.year, current.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  };

  return (
    <section className="flex h-full min-w-0 flex-col km-admin-surface p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{t("admin_dashboard.renewal_calendar")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("admin_dashboard.renewal_calendar_hint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--gray-a3)]"
            aria-label={t("admin_dashboard.renewal_prev_month")}
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[7.5rem] whitespace-nowrap text-center text-sm font-medium tabular-nums text-foreground">
            {monthLabel}
          </span>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--gray-a3)]"
            aria-label={t("admin_dashboard.renewal_next_month")}
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading && nodeDetail.length === 0 ? (
        <Skeleton className="h-[220px] w-full" />
      ) : error ? (
        <p className="text-sm text-[var(--red-11)]">{t("admin_dashboard.data_unavailable")}</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((label, index) => (
            <div key={`${label}-${index}`} className="pb-1 text-center text-[11px] text-muted-foreground">
              {label}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell.date || cell.day == null) {
              return <div key={`empty-${index}`} />;
            }
            const count = grouped.get(cell.date)?.length ?? 0;
            const isToday = cell.date === today;
            const isOpen = menu?.date === cell.date;
            const isPast = cell.date < today;
            return (
              <button
                key={cell.date}
                type="button"
                aria-expanded={count > 0 ? isOpen : undefined}
                aria-haspopup={count > 0 ? "dialog" : undefined}
                aria-label={count > 0
                  ? `${cell.date} ${t("admin_dashboard.renewal_count", { count })}`
                  : cell.date}
                onClick={(event) => {
                  if (count === 0) {
                    setMenu(null);
                    return;
                  }
                  const anchor = event.currentTarget;
                  setMenu((current) => (
                    current?.date === cell.date ? null : { date: cell.date!, anchor }
                  ));
                }}
                className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-md px-0.5 py-1 outline-none hover:bg-[var(--gray-a3)] focus-visible:ring-2 focus-visible:ring-[var(--accent-8)] ${isOpen ? "bg-[var(--accent-a3)]" : ""} ${count > 0 ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums ${
                    isToday
                      ? "bg-[var(--accent-9)] text-white"
                      : isPast
                        ? "text-muted-foreground"
                        : "text-foreground"
                  }`}
                >
                  {cell.day}
                </span>
                <span className={`mt-0.5 h-4 text-[11px] leading-4 tabular-nums ${count > 0 ? "text-[var(--orange-11)]" : "text-transparent"}`}>
                  {count > 0 ? t("admin_dashboard.renewal_count", { count }) : "0"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Popover
        open={Boolean(menu?.anchor) && menuServers.length > 0}
        anchorEl={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        disableScrollLock
        marginThreshold={12}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mb: 0.75,
              minWidth: 280,
              maxWidth: 420,
              p: 0,
              borderRadius: "8px",
              border: "1px solid rgba(145, 158, 171, 0.28)",
              bgcolor: "#fff",
              color: "#1c252e",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
              "html.dark &": {
                bgcolor: "#212b36",
                color: "#fff",
                borderColor: "rgba(255, 255, 255, 0.12)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              },
            },
          },
        }}
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(145,158,171,0.2)] px-3 py-2">
          <div className="text-sm font-semibold text-foreground">
            {menu ? formatDayLabel(menu.date, locale) : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("admin_dashboard.renewal_count", { count: menuServers.length })}
          </div>
        </div>
        <ul className="flex flex-col px-1.5 py-1">
          {visibleServers.map((server) => (
            <li key={server.uuid} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-[var(--gray-a3)]">
              <Link
                to={`/admin/servers/${server.uuid}?tab=billing`}
                onClick={() => setMenu(null)}
                className="min-w-0 flex-1 truncate text-sm font-medium text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]"
              >
                {server.name}
              </Link>
              {cycleFeeLabel(server, t) ? (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {cycleFeeLabel(server, t)}
                </span>
              ) : null}
              {Number(server.billingCycle) > 0 ? (
                <button
                  type="button"
                  disabled={renewing === server.uuid}
                  onClick={() => { void renew(server); }}
                  className="shrink-0 rounded-md bg-[rgba(34,197,94,0.16)] px-2 py-1 text-xs font-semibold text-[#118D57] hover:brightness-95 disabled:opacity-60"
                >
                  {t("admin_dashboard.renewal_now")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {menuServers.length > RENEWAL_PAGE_SIZE ? (
          <div className="border-t border-[rgba(145,158,171,0.2)]">
            <AdminPagination
              page={menuPage}
              total={menuServers.length}
              pageSize={RENEWAL_PAGE_SIZE}
              onPageChange={setPage}
              showSummary={false}
              hideDivider
            />
          </div>
        ) : null}
      </Popover>
    </section>
  );
}
