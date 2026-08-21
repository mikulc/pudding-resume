export type AdminLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AdminLogSource = 'app' | 'http';

export interface AdminLogEntry {
  id: number;
  timestamp: string;
  level: AdminLogLevel;
  source: AdminLogSource;
  message: string;
  attributes?: Record<string, unknown>;
}

export interface AdminLogResponse {
  entries: AdminLogEntry[];
  total: number;
  dropped: number;
  next_cursor: number;
}
