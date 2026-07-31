import type { MenuItem } from "@/types/menu";

export const APPEARANCE_MENU_PATH = "/admin/appearance";

export function buildAdminMenuItems(
  baseItems: MenuItem[],
  themeItems: MenuItem[],
): MenuItem[] {
  return baseItems.map((item) =>
    item.path === APPEARANCE_MENU_PATH
      ? {
          ...item,
          children: [...(item.children ?? []), ...themeItems],
        }
      : item,
  );
}

export function toggleSingleSubMenu(
  current: Record<string, boolean>,
  path: string,
): Record<string, boolean> {
  return current[path] ? {} : { [path]: true };
}
