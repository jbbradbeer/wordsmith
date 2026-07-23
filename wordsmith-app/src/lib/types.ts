export interface WordData {
  word: string;
  pronunciation: string;
  definition: string;
  example?: string;
  context?: string;
  category: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  containsWord?: boolean;
}

export interface CollectionWord extends WordData {
  id: string;
  collection_id: string;
  created_at: string;
}

export interface SearchResults {
  original: string;
  alternatives: WordData[];
}

export interface UserInfo {
  email: string;
  isPaid: boolean;
  subscriptionStatus: string | null;
  searchCount: number;
  searchesRemaining: number | null;
  scansRemaining: number | null;
  limit: number | null;
  memberSince: string;
}

export interface Scan {
  score: number;
  band: string;
  wordCount: number;
  createdAt: string; // ISO
}

export interface ScanStats {
  total: number;
  earlyAvg: number | null;   // null when total < 4
  recentAvg: number | null;  // null when total < 4
  best: number | null;       // lowest score; null when total === 0
  streakDays: number;        // consecutive UTC days ending today/yesterday
}

export type ScansResponse =
  | { pro: false }
  | { pro: true; recent: Scan[]; stats: ScanStats };
