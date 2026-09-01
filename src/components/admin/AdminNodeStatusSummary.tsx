import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useReduceMotionPreference } from "@/lib/api";
import { LITE_BLUE, NODE_OFFLINE, NODE_ONLINE } from "@/theme/brand";

export type AdminNodeStatusFilter = "all" | "online" | "offline";

type AdminNodeStatusSummaryProps = {
  total: number;
  online: number;
  available?: boolean;
  value: AdminNodeStatusFilter;
  onValueChange: (filter: AdminNodeStatusFilter) => void;
};

export default function AdminNodeStatusSummary({
  total,
  online,
  available = true,
  value,
  onValueChange,
}: AdminNodeStatusSummaryProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotionPreference();
  const offline = Math.max(0, total - online);
  const items = [
    {
      label: t("admin.nodeTable.allNodes", "全部节点"),
      count: total,
      color: LITE_BLUE,
      filter: "all" as const,
    },
    {
      label: t("nodeCard.online", "在线"),
      count: available ? online : "--",
      color: NODE_ONLINE,
      filter: "online" as const,
    },
    {
      label: t("nodeCard.offline", "离线"),
      count: available ? offline : "--",
      color: NODE_OFFLINE,
      filter: "offline" as const,
    },
  ];

  return (
    <div
      data-testid="node-status-summary"
      className="flex h-12 min-w-0 items-stretch md:w-auto"
    >
      {items.map(({ label, count, color, filter }) => (
        <motion.button
          key={filter}
          type="button"
          className="relative isolate flex h-12 items-center justify-center gap-2 px-3 text-left transition-colors duration-150 hover:text-[var(--gray-12)] disabled:cursor-not-allowed disabled:opacity-60 md:min-w-24 md:px-3.5"
          aria-pressed={value === filter}
          disabled={filter !== "all" && !available}
          onClick={() => onValueChange(filter)}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          transition={{ duration: reduceMotion ? 0 : 0.12 }}
        >
          {value === filter ? (
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-[-1px] -z-10 h-0.5 bg-[#1e293b]"
              layoutId={reduceMotion ? undefined : "admin-node-status-highlight"}
              initial={false}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 34 }
              }
            />
          ) : null}
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
            <strong className="shrink-0 text-sm font-semibold leading-5 tabular-nums">
              {count}
            </strong>
            <span className="min-w-0 truncate text-sm leading-5 text-muted-foreground">
              {label}
            </span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}
