export interface DashboardOfflineNode {
  uuid: string;
  name: string;
  region: string;
  last_seen: string | null;
}

export interface DashboardTrafficDay {
  day: string;
  up: number;
  down: number;
  billable: number;
}

export interface DashboardTrafficHour {
  hour: string;
  up: number;
  down: number;
}

export interface DashboardDatabaseFiles {
  database: number;
  wal: number;
  shm: number;
}

export interface DashboardDatabaseStatus {
  driver: string;
  location: string;
  size: number | null;
  files?: DashboardDatabaseFiles;
  error?: string;
}

export interface DashboardData {
  servers: {
    total: number;
    online: number;
    offline: number;
    offline_nodes: DashboardOfflineNode[];
  };
  traffic: {
    today_up: number;
    today_down: number;
    today_billable: number;
    hourly: DashboardTrafficHour[];
    daily: DashboardTrafficDay[];
    history_ready: boolean;
  };
  database: {
    type: string;
    size: number;
    main: DashboardDatabaseStatus;
    monitoring: DashboardDatabaseStatus;
    local_total: number | null;
  };
  storage: {
    database_files: number;
    wal: number;
    shm: number;
    retention_days: number;
    last_compacted_at: string | null;
  };
  generated_at: string;
}

export function dashboardLocalStorageTotal(data: DashboardData): number | null {
  const measuredTotal = data.storage.database_files + data.storage.wal + data.storage.shm;
  if (typeof data.database.local_total === "number") {
    return measuredTotal;
  }
  if (data.database.main.location === "local") {
    return data.database.main.size;
  }
  return null;
}

export function dashboardRuntimeStorageTotal(data: DashboardData): number {
  return data.storage.wal + data.storage.shm;
}

export function dashboardOnlinePercent(data: DashboardData): number {
  if (data.servers.total <= 0) return 0;
  return Math.round((data.servers.online / data.servers.total) * 100);
}

export function shortDashboardDay(day: string, locale: string): string {
  const parsed = new Date(`${day}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(parsed);
}
