import { HistoryItem, ReverseCache, ReverseCacheItem, ResolveSuccessData } from './types';

const HISTORY_KEY = 'tgid_history';
const CACHE_KEY = 'tgid_reverse_cache';

// --- Local History Management ---

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading history:', err);
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  try {
    // Keep maximum 30 history items to keep localStorage clean
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30)));
  } catch (err) {
    console.error('Error saving history:', err);
  }
}

export function addHistoryItem(input: string, result?: ResolveSuccessData): HistoryItem[] {
  const history = getHistory();
  // Avoid duplicating recent identical inputs
  const filtered = history.filter((h) => h.input.toLowerCase() !== input.toLowerCase());
  
  const newItem: HistoryItem = {
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(),
    input,
    timestamp: Date.now(),
    resolvedTo: result ? {
      id: result.chat.id,
      title: result.chat.title,
      username: result.chat.username,
      type: result.chat.type,
    } : undefined
  };

  const updated = [newItem, ...filtered];
  saveHistory(updated);
  return updated;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Error clearing history:', err);
  }
}

// --- V3 Reverse Directory Cache Management ---

export function getReverseCache(): ReverseCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Error reading reverse cache:', err);
    return {};
  }
}

export function saveReverseCache(cache: ReverseCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('Error saving reverse cache:', err);
  }
}

export function updateReverseCacheWithResult(result: ResolveSuccessData): ReverseCache {
  const cache = getReverseCache();
  const idStr = result.chat.id.toString();

  const cacheItem: ReverseCacheItem = {
    id: result.chat.id,
    title: result.chat.title,
    username: result.chat.username,
    type: result.chat.type,
    bio: result.chat.bio,
    avatarUrl: result.avatar.url,
    lastUpdated: Date.now(),
  };

  cache[idStr] = cacheItem;
  saveReverseCache(cache);
  return cache;
}

export function lookupReverseCache(id: string | number): ReverseCacheItem | null {
  const cache = getReverseCache();
  const idStr = id.toString();
  return cache[idStr] || null;
}

export function removeCacheItem(id: number): ReverseCache {
  const cache = getReverseCache();
  delete cache[id.toString()];
  saveReverseCache(cache);
  return cache;
}

export function clearReverseCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.error('Error clearing reverse cache:', err);
  }
}
