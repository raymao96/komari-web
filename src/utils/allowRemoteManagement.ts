export const ALLOW_REMOTE_MANAGEMENT_SETTING_PATH =
  "/admin/settings/general#remote-management";

export function isAllowRemoteManagementEnabled(
  settings?: { allow_remote_management?: unknown } | null,
): boolean {
  return settings?.allow_remote_management === true;
}

export function isRemoteManagementPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return (
    path === "/admin/exec" ||
    path === "/admin/settings/xtermjs" ||
    path === "/terminal"
  );
}
