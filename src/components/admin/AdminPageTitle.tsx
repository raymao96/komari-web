import type { ReactNode } from "react";

export default function AdminPageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-xl font-semibold leading-7 text-foreground">
      {children}
    </h1>
  );
}
