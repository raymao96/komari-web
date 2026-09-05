import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminSheetTabs({
  className,
  actions,
  children,
}: {
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("km-admin-sheet-tabs", actions ? "has-actions" : undefined, className)}>
      {children}
      {actions ? <div className="km-admin-sheet-tabs-actions">{actions}</div> : null}
    </div>
  );
}

export function AdminTabLabel({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="km-admin-tab-label">
      {icon ? (
        <span className="km-admin-tab-label-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
