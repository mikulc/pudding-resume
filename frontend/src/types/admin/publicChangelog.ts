export interface PublicChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  tone: string;
}

export interface PublicChangelogResponse {
  entries: PublicChangelogEntry[];
}
