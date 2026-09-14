import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchInput } from './components/SearchInput';
import { ResultCard } from './components/ResultCard';
import { ErrorCard } from './components/ErrorCard';
import { HistoryList } from './components/HistoryList';
import { BatchLookup } from './components/BatchLookup';
import { ReverseDirectory } from './components/ReverseDirectory';
import { AppState, ResolveSuccessData, ResolveError, HistoryItem } from './lib/types';
import {
  getHistory,
  addHistoryItem,
  clearHistory,
  lookupReverseCache,
  updateReverseCacheWithResult
} from './lib/storage';
import { ShieldCheck, HelpCircle, ArrowRight, EyeOff, KeyRound, FileText, Layers, Database, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'BATCH' | 'OFFLINE'>('SINGLE');
  const [state, setState] = useState<AppState>('IDLE');
  const [result, setResult] = useState<ResolveSuccessData | null>(null);
  const [error, setError] = useState<ResolveError | null>(null);
  const [lastInput, setLastInput] = useState<string>('');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [cacheVersion, setCacheVersion] = useState<number>(0);
  const [isOfflineCachedResult, setIsOfflineCachedResult] = useState<boolean>(false);

  // Initialize history log from browser storage
  useEffect(() => {
    setHistoryItems(getHistory());
  }, []);

  const handleUpdateCache = () => {
    setCacheVersion((v) => v + 1);
    setHistoryItems(getHistory());
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistoryItems([]);
  };

  const handleSelectHistoryItem = (input: string) => {
    setActiveTab('SINGLE');
    handleResolve(input);
  };

  // Main fetch function to resolve the ID
  const handleResolve = async (input: string) => {
    setState('LOADING');
    setResult(null);
    setError(null);
    setLastInput(input);
    setIsOfflineCachedResult(false);

    // V3 Local Database Precheck for Instant/Offline Recovery
    const offlineCached = lookupReverseCache(input);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second request timeout

    try {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        // V3 Fallback: If Telegram API fails, check if we have a cached database profile locally
        if (offlineCached) {
          setResult({
            type: 'chat',
            chat: {
              id: offlineCached.id,
              type: offlineCached.type,
              title: offlineCached.title,
              username: offlineCached.username,
              bio: offlineCached.bio,
            },
            avatar: {
              available: !!offlineCached.avatarUrl,
              url: offlineCached.avatarUrl,
            }
          });
          setIsOfflineCachedResult(true);
          setState('SUCCESS');
          setHistoryItems(addHistoryItem(input, {
            type: 'chat',
            chat: {
              id: offlineCached.id,
              type: offlineCached.type,
              title: offlineCached.title,
              username: offlineCached.username,
              bio: offlineCached.bio,
            },
            avatar: {
              available: !!offlineCached.avatarUrl,
              url: offlineCached.avatarUrl,
            }
          }));
        } else {
          setError({
            code: data.error?.code || 'TELEGRAM_ERROR',
            message: data.error?.message || 'A server-side communication exception occurred.',
          });
          setState('ERROR');
          setHistoryItems(addHistoryItem(input));
        }
      } else {
        const resolvedData = data.data;
        setResult(resolvedData);
        setState('SUCCESS');

        // Update caches
        updateReverseCacheWithResult(resolvedData);
        setHistoryItems(addHistoryItem(input, resolvedData));
        setCacheVersion((v) => v + 1);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', err);

      // V3 Fallback: Try cached copy on network drop or offline timeouts
      if (offlineCached) {
        setResult({
          type: 'chat',
          chat: {
            id: offlineCached.id,
            type: offlineCached.type,
            title: offlineCached.title,
            username: offlineCached.username,
            bio: offlineCached.bio,
          },
          avatar: {
            available: !!offlineCached.avatarUrl,
            url: offlineCached.avatarUrl,
          }
        });
        setIsOfflineCachedResult(true);
        setState('SUCCESS');
        setHistoryItems(addHistoryItem(input, {
          type: 'chat',
          chat: {
            id: offlineCached.id,
            type: offlineCached.type,
            title: offlineCached.title,
            username: offlineCached.username,
            bio: offlineCached.bio,
          },
          avatar: {
            available: !!offlineCached.avatarUrl,
            url: offlineCached.avatarUrl,
          }
        }));
      } else {
        if (err.name === 'AbortError') {
          setError({
            code: 'TIMEOUT',
            message: 'The connection timed out. Telegram servers or the server took too long to respond.',
          });
        } else {
          setError({
            code: 'NETWORK_ERROR',
            message: 'Could not complete the query. Verify your device internet connection and retry.',
          });
        }
        setState('ERROR');
        setHistoryItems(addHistoryItem(input));
      }
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      handleResolve(lastInput);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-200 flex flex-col" id="app-root-layout">
      {/* 1. Header component */}
      <Header id="main-app-header" />

      {/* 2. Main Content Body */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-8 flex flex-col gap-5" id="main-content-container">
        
        {/* Intro/Welcome section */}
        <div className="text-center sm:text-left" id="welcome-intro-block">
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-color)]" id="hero-heading">
            Resolve Telegram IDs
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed" id="hero-description">
            Lookup usernames, channel links, forum topics, and restore raw identifiers through the secure offline directory database.
          </p>
        </div>

        {/* Tab Selector Segmented Control */}
        <div className="flex bg-[var(--surface-color)] border border-[var(--border-color)] p-1 rounded-xl" id="mode-tab-selector">
          <button
            id="tab-single-mode"
            type="button"
            onClick={() => setActiveTab('SINGLE')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer
              ${activeTab === 'SINGLE'
                ? 'bg-[var(--primary-color)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-color)]'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Single</span>
          </button>
          
          <button
            id="tab-batch-mode"
            type="button"
            onClick={() => setActiveTab('BATCH')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer
              ${activeTab === 'BATCH'
                ? 'bg-[var(--primary-color)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-color)]'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch</span>
          </button>

          <button
            id="tab-offline-mode"
            type="button"
            onClick={() => setActiveTab('OFFLINE')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer
              ${activeTab === 'OFFLINE'
                ? 'bg-[var(--primary-color)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-color)]'
              }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Directory</span>
          </button>
        </div>

        {/* 3. Screen Views based on selected mode tab with smooth AnimatePresence transitions */}
        <div className="flex-1 flex flex-col gap-5" id="view-content-wrapper">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: SINGLE MODE */}
            {activeTab === 'SINGLE' && (
              <motion.div
                key="SINGLE"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="flex flex-col gap-5 w-full"
              >
                <SearchInput
                  id="identifier-search-input"
                  onSearch={handleResolve}
                  isLoading={state === 'LOADING'}
                />

                {/* Active display panel (Success or Error views) */}
                <div className="flex flex-col gap-4" id="resolution-result-viewport">
                  
                  {state === 'SUCCESS' && result && (
                    <div className="flex flex-col gap-3">
                      {isOfflineCachedResult && (
                        <div className="bg-amber-500 bg-opacity-10 border border-amber-500 border-opacity-20 text-amber-500 p-2.5 rounded-xl flex items-center gap-2 text-[10px]" id="offline-cache-banner">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span>Served from Local Offline Directory Cache (Telegram API restricted/inactive)</span>
                        </div>
                      )}
                      <ResultCard id="successful-result-card" data={result} />
                    </div>
                  )}

                  {state === 'ERROR' && error && (
                    <ErrorCard
                      id="failure-error-card"
                      error={error}
                      onRetry={lastInput ? handleRetry : undefined}
                    />
                  )}

                  {state === 'LOADING' && (
                    <div
                      id="loading-skeleton-mask"
                      className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col gap-4 animate-pulse"
                    >
                      <div className="flex items-center gap-4" id="loading-skeleton-header">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--border-color)] bg-opacity-60" id="skeleton-avatar" />
                        <div className="flex-1 flex flex-col gap-2" id="skeleton-identity">
                          <div className="h-4 w-2/3 bg-[var(--border-color)] rounded" id="skeleton-title" />
                          <div className="h-3 w-1/3 bg-[var(--border-color)] rounded" id="skeleton-handle" />
                        </div>
                      </div>
                      <div className="h-12 w-full bg-[var(--border-color)] bg-opacity-40 rounded-xl mt-2" id="skeleton-details" />
                    </div>
                  )}
                </div>

                {/* History listing log */}
                <HistoryList
                  id="search-history-log"
                  items={historyItems}
                  onSelect={handleSelectHistoryItem}
                  onClear={handleClearHistory}
                />
              </motion.div>
            )}

            {/* TAB 2: BATCH MODE */}
            {activeTab === 'BATCH' && (
              <motion.div
                key="BATCH"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="w-full"
              >
                <BatchLookup
                  id="batch-lookup-section"
                  onUpdateCache={handleUpdateCache}
                />
              </motion.div>
            )}

            {/* TAB 3: DIRECTORY OFFLINE CACHE */}
            {activeTab === 'OFFLINE' && (
              <motion.div
                key="OFFLINE"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="w-full"
              >
                <ReverseDirectory
                  id="reverse-cache-directory-section"
                  cacheVersion={cacheVersion}
                  onUpdateCache={handleUpdateCache}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* 4. Utility Privacy Safeguard Disclaimer */}
        <div
          id="privacy-safeguard-disclaimer"
          className="p-3.5 rounded-xl border border-[var(--border-color)] border-opacity-60 bg-[var(--surface-color)] bg-opacity-50 text-[11px] text-[var(--text-secondary)] leading-relaxed"
        >
          <div className="flex items-start gap-2.5" id="disclaimer-layout">
            <EyeOff id="eye-off-icon" className="w-4 h-4 text-[var(--primary-color)] flex-shrink-0 mt-0.5" />
            <p id="disclaimer-text">
              <strong className="text-[var(--text-color)] font-semibold block mb-0.5">Privacy & Cache Guard</strong>
              Lookups are temporarily cached locally inside your browser's persistent database block (`localStorage`) for quick offline access. No server persistence or database logging takes place.
            </p>
          </div>
        </div>

      </main>

      {/* Footer copyright */}
      <footer className="py-6 text-center text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-color)]" id="footer-copyright-block">
        <p>© {new Date().getFullYear()} TG ID.</p>
      </footer>
    </div>
  );
}
