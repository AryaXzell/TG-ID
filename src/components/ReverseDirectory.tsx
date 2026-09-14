import React, { useState, useEffect } from 'react';
import { ReverseCache, ReverseCacheItem } from '../lib/types';
import { getReverseCache, removeCacheItem, clearReverseCache } from '../lib/storage';
import { Database, Search, Copy, Check, Trash2, Shield, Eye, HelpCircle, ExternalLink, Calendar, Info } from 'lucide-react';

interface ReverseDirectoryProps {
  cacheVersion: number; // Trigger reload when updated
  onUpdateCache: () => void;
  id?: string;
}

export const ReverseDirectory: React.FC<ReverseDirectoryProps> = ({
  cacheVersion,
  onUpdateCache,
  id = 'reverse-directory-panel',
}) => {
  const [cache, setCache] = useState<ReverseCache>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setCache(getReverseCache());
  }, [cacheVersion]);

  const handleCopy = (text: string, entryId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(entryId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (idNum: number) => {
    const updated = removeCacheItem(idNum);
    setCache(updated);
    onUpdateCache();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear the entire offline directory cache?')) {
      clearReverseCache();
      setCache({});
      onUpdateCache();
    }
  };

  const cacheEntries = Object.values(cache) as ReverseCacheItem[];

  // Filter entries based on id string, username, title, or bio
  const filteredEntries = cacheEntries.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.id.toString().includes(query) ||
      (item.username || '').toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      (item.bio || '').toLowerCase().includes(query)
    );
  });

  return (
    <div id={id} className="w-full flex flex-col gap-5">
      {/* Search Cache */}
      <div className="flex flex-col gap-3" id="cache-search-container">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Database className="w-3.5 h-3.5 text-[var(--primary-color)]" />
            <span>Reverse Cache Database</span>
          </div>
          {cacheEntries.length > 0 && (
            <button
              id="clear-cache-button"
              onClick={handleClearAll}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-500 hover:bg-rose-500 hover:bg-opacity-10 px-2.5 py-1 rounded-lg transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Wipe DB</span>
            </button>
          )}
        </div>

        <div className="relative flex items-center" id="cache-search-input-wrapper">
          <input
            id="cache-search-input"
            type="text"
            placeholder="Search by ID, Title, Username, or Bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-color)] placeholder-[var(--text-secondary)] placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all text-xs"
          />
          <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
        </div>
      </div>

      {/* Stats and helper block */}
      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed flex items-center gap-2 px-1" id="cache-stats-bar">
        <Info className="w-3.5 h-3.5 text-[var(--primary-color)] flex-shrink-0" />
        <span>
          <strong>Local Directory Offline Cache</strong> maps numeric IDs back to usernames & profiles after they have been resolved once.
        </span>
      </div>

      {/* Cache Items Grid/List */}
      <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1" id="cache-items-viewport">
        {filteredEntries.length === 0 ? (
          <div 
            id="empty-cache-view" 
            className="text-center py-10 border border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center gap-4 bg-[var(--surface-color)] bg-opacity-30 animate-fade-in"
          >
            {/* Anime-Style Chibi Vector Mascot */}
            <div className="w-24 h-24 flex items-center justify-center select-none" id="anime-mascot-cache">
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform hover:scale-105 transition-transform duration-300">
                {/* Soft floating background particles / magic sparks */}
                <circle cx="16" cy="24" r="2.5" fill="#3b82f6" fillOpacity="0.4" className="animate-bounce" />
                <circle cx="82" cy="56" r="1.5" fill="#3b82f6" fillOpacity="0.3" />
                <path d="M78 22L80 26L84 27L80 28L78 32L76 28L72 27L76 26L78 22Z" fill="#fbbf24" fillOpacity="0.7" />
                <path d="M14 68L15 71L18 72L15 73L14 76L13 73L10 72L13 71L14 68Z" fill="#3b82f6" fillOpacity="0.5" />
                
                {/* Cute Chibi Bot Head Shadow */}
                <ellipse cx="48" cy="80" rx="26" ry="6" fill="#000" fillOpacity="0.08" />

                {/* Cat Ears / Tech Antenna Ears */}
                <path d="M28 32C28 32 18 16 20 14C22 12 38 24 38 24" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M28 32C28 32 21 21 22 20C23 19 32 27 32 27" fill="#93c5fd" />
                
                <path d="M68 32C68 32 78 16 76 14C74 12 58 24 58 24" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M68 32C68 32 75 21 74 20C73 19 64 27 64 27" fill="#93c5fd" />

                {/* Round Chibi Face Body */}
                <rect x="22" y="28" width="52" height="46" rx="23" fill="#eff6ff" stroke="#3b82f6" strokeWidth="4" />
                
                {/* Visor / Cute Digital Glass Face */}
                <rect x="28" y="34" width="40" height="28" rx="14" fill="#1e293b" />

                {/* Sparkling High-Contrast Anime Eyes */}
                <circle cx="38" cy="46" r="3.5" fill="#ffffff" />
                <circle cx="40" cy="44" r="1.5" fill="#60a5fa" />
                <circle cx="36.5" cy="47.5" r="1" fill="#ffffff" />

                <circle cx="58" cy="46" r="3.5" fill="#ffffff" />
                <circle cx="60" cy="44" r="1.5" fill="#60a5fa" />
                <circle cx="56.5" cy="47.5" r="1" fill="#ffffff" />

                {/* Cute Cat-like Blush Cheeks (●'◡'●) */}
                <ellipse cx="32" cy="54" rx="3.5" ry="2" fill="#ff85a2" fillOpacity="0.8" />
                <ellipse cx="64" cy="54" rx="3.5" ry="2" fill="#ff85a2" fillOpacity="0.8" />

                {/* Tiny Curve Mouth 'w' style */}
                <path d="M46 51C46 52 47 53 48 53C49 53 50 52 50 51M42 51C42 52 43 53 44 53C45 53 46 52 46 51" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                
                {/* Sleek Search Headband */}
                <path d="M22 42C22 42 21 48 21 52" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                <path d="M74 42C74 42 75 48 75 52" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs font-bold text-[var(--text-color)]">
                {searchQuery ? 'No search results found' : 'Offline Database is Empty'}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] max-w-[280px] mx-auto leading-relaxed">
                {searchQuery ? 'Check spelling or query index.' : 'Resolve usernames in Single or Batch mode to build your custom offline database automatically.'}
              </span>
            </div>
          </div>
        ) : (
          filteredEntries.map((item) => {
            const isCopied = copiedId === item.id.toString();
            return (
              <div
                key={item.id}
                id={`cache-entry-${item.id}`}
                className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3 group/entry relative"
              >
                {/* Upper row: Identity */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circle Proxy Avatar or Letter placeholder */}
                    {item.avatarUrl ? (
                      <img
                        id={`cache-avatar-${item.id}`}
                        src={item.avatarUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[var(--border-color)] bg-opacity-40 flex items-center justify-center font-bold text-xs text-[var(--text-color)] flex-shrink-0">
                        {item.title.substring(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--text-color)] truncate leading-tight">
                        {item.title}
                      </span>
                      {item.username ? (
                        <span className="text-[10px] text-[var(--primary-color)] font-medium truncate">
                          @{item.username}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-secondary)] italic">
                          No public username
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges and actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-[var(--border-color)] bg-opacity-60 text-[var(--text-secondary)]">
                      {item.type}
                    </span>
                    <button
                      id={`delete-cache-item-${item.id}`}
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500 hover:bg-opacity-10 transition-all opacity-0 group-hover/entry:opacity-100 focus:opacity-100"
                      title="Delete profile from offline database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bio Description if available */}
                {item.bio && (
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--border-color)] pl-2">
                    {item.bio}
                  </p>
                )}

                {/* Downwards stats: ID & copy action */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] border-opacity-50 text-[10px]">
                  <div className="flex items-center gap-1 text-[var(--text-secondary)] font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>Updated: {new Date(item.lastUpdated).toLocaleDateString()}</span>
                  </div>

                  <button
                    id={`copy-cache-id-${item.id}`}
                    onClick={() => handleCopy(item.id.toString(), item.id.toString())}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-color)] text-[11px] font-bold font-mono text-[var(--text-color)] hover:border-[var(--primary-color)] transition-all"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[var(--text-secondary)]" />
                        <span>{item.id}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
