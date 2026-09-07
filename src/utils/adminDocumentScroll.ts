export const ADMIN_SHELL_OPEN_CLASS = "lite-admin-shell-open";

export function lockAdminDocumentScroll(root: {
  classList: { add(token: string): void };
}) {
  root.classList.add(ADMIN_SHELL_OPEN_CLASS);
}

export function unlockAdminDocumentScroll(root: {
  classList: { remove(token: string): void };
}) {
  root.classList.remove(ADMIN_SHELL_OPEN_CLASS);
}
