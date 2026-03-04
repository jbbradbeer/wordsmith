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
  limit: number | null;
  memberSince: string;
}
