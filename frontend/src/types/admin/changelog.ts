export interface ChangelogEntryItem {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  tone: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChangelogListResponse {
  entries: ChangelogEntryItem[];
}

export interface CreateChangelogRequest {
  version: string;
  date: string;
  title: string;
  summary?: string;
  items: string[];
  tone?: string;
  is_published?: boolean;
  sort_order?: number;
}

export interface UpdateChangelogRequest {
  version?: string;
  date?: string;
  title?: string;
  summary?: string;
  items?: string[];
  tone?: string;
  is_published?: boolean;
  sort_order?: number;
}

// --- AI Usage ---
