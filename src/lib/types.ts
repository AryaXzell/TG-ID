export type ChatType = 'private' | 'group' | 'supergroup' | 'channel';

export interface ChatMetadata {
  id: number;
  type: ChatType;
  title: string;
  username: string | null;
  bio: string | null;
}

export interface TopicMetadata {
  id: number;
  name: string;
}

export interface AvatarMetadata {
  available: boolean;
  url: string | null;
}

export interface ResolveSuccessData {
  type: 'chat' | 'forum_topic';
  chat: ChatMetadata;
  topic?: TopicMetadata;
  avatar: AvatarMetadata;
}

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_INPUT'
  | 'PRIVATE_CHAT'
  | 'BOT_NO_ACCESS'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'TELEGRAM_ERROR';

export interface ResolveError {
  code: ErrorCode;
  message: string;
}

export interface ApiResponse {
  ok: boolean;
  data?: ResolveSuccessData;
  error?: ResolveError;
}

export type AppState =
  | 'IDLE'
  | 'LOADING'
  | 'SUCCESS'
  | 'ERROR'
  | 'BATCH_PROCESSING'
  | 'BATCH_COMPLETED';

export interface HistoryItem {
  id: string; // unique hash or timestamp
  input: string;
  timestamp: number;
  resolvedTo?: {
    id: number;
    title: string;
    username: string | null;
    type: ChatType;
  };
}

export interface BatchItem {
  id: string; // unique item id
  input: string;
  state: 'PENDING' | 'LOADING' | 'SUCCESS' | 'ERROR';
  result?: ResolveSuccessData;
  error?: ResolveError;
}

export interface ReverseCacheItem {
  id: number;
  title: string;
  username: string | null;
  type: ChatType;
  bio: string | null;
  avatarUrl: string | null;
  lastUpdated: number;
}

export type ReverseCache = Record<string, ReverseCacheItem>;
