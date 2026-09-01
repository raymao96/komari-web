export const INSTALL_STEP_IDS = [
  "welcome",
  "administrator",
  "site",
  "database",
  "confirm",
] as const;

export type InstallSummary = {
  administrator: string | null;
  sitename: string | null;
  database: string | null;
};
