import React, { useState, useRef } from 'react';
import { BatchItem, ResolveSuccessData, ResolveError } from '../lib/types';
import { Play, Download, Trash2, Ban, RefreshCw, FileSpreadsheet, FileJson, AlertTriangle, CheckCircle, Info, Layers } from 'lucide-react';
import { addHistoryItem, updateReverseCacheWithResult } from '../lib/storage';

interface BatchLookupProps {
  onUpdateCache: () => void;
  id?: string;
}

export const BatchLookup: React.FC<BatchLookupProps> = ({
  onUpdateCache,
  id = 'batch-lookup-panel',
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const cancelRef = useRef<boolean>(false);

  const parseInputs = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const currentInputs = parseInputs(inputText);

  const startBatchProcess = async () => {
    const inputs = parseInputs(inputText);
    if (inputs.length === 0) return;

    setIsProcessing(true);
    cancelRef.current = false;

    // Build initial list
    const initialItems: BatchItem[] = inputs.map((input, idx) => ({
      id: `${idx}-${Date.now()}`,
      input,
      state: 'PENDING',
    }));
    setBatchItems(initialItems);

    for (let i = 0; i < initialItems.length; i++) {
      if (cancelRef.current) break;

      // Update state to loading
      setBatchItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, state: 'LOADING' } : item))
      );

      const targetItem = initialItems[i];
      
      // Delay request slightly to avoid severe rate-limiting of Telegram APIs
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (cancelRef.current) break;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('/api/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: targetItem.input }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const resData = await response.json();

        if (cancelRef.current) break;

        if (response.ok && resData.ok && resData.data) {
          const successData: ResolveSuccessData = resData.data;
          
          // Save success result in the local reverse database and quick search logs
          updateReverseCacheWithResult(successData);
          addHistoryItem(targetItem.input, successData);

          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, state: 'SUCCESS', result: successData }
                : item
            )
          );
        } else {
          const errData: ResolveError = resData.error || {
            code: 'TELEGRAM_ERROR',
            message: 'Server failed to resolve username.',
          };
          addHistoryItem(targetItem.input);

          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, state: 'ERROR', error: errData } : item
            )
          );
        }
      } catch (err: any) {
        if (cancelRef.current) break;
        const errorDetail: ResolveError = {
          code: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: err.name === 'AbortError' ? 'Timeout' : 'Network/Connection error',
        };
        addHistoryItem(targetItem.input);

        setBatchItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, state: 'ERROR', error: errorDetail } : item
          )
        );
      }
    }

    setIsProcessing(false);
    onUpdateCache(); // Alert parent that cache changed
  };

  const cancelBatchProcess = () => {
    cancelRef.current = true;
    setIsProcessing(false);
  };

  const handleClear = () => {
    setInputText('');
    setBatchItems([]);
    cancelRef.current = false;
  };

  // CSV Generator
  const downloadCSV = () => {
    if (batchItems.length === 0) return;

    const headers = ['Input', 'Status', 'Resolved ID', 'Type', 'Title', 'Username', 'Bio', 'Error Code', 'Error Message'];
    const rows = batchItems.map((item) => {
      const isSuccess = item.state === 'SUCCESS';
      return [
        item.input,
        item.state,
        isSuccess ? item.result?.chat.id : '',
        isSuccess ? item.result?.chat.type : '',
        isSuccess ? `"${item.result?.chat.title.replace(/"/g, '""')}"` : '',
        isSuccess ? item.result?.chat.username || '' : '',
        isSuccess ? `"${(item.result?.chat.bio || '').replace(/"/g, '""')}"` : '',
        !isSuccess ? item.error?.code || '' : '',
        !isSuccess ? `"${(item.error?.message || '').replace(/"/g, '""')}"` : '',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tg_ids_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Generator
  const downloadJSON = () => {
    if (batchItems.length === 0) return;
    
    const blob = new Blob([JSON.stringify(batchItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tg_ids_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = batchItems.filter((i) => i.state === 'SUCCESS' || i.state === 'ERROR').length;
  const successCount = batchItems.filter((i) => i.state === 'SUCCESS').length;
  const errorCount = batchItems.filter((i) => i.state === 'ERROR').length;

  return (
    <div id={id} className="w-full flex flex-col gap-5">
      
      {/* Input container */}
      <div className="flex flex-col gap-3" id="batch-input-card">
        <label
          htmlFor="batch-textarea"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block"
        >
          Batch Inputs (Max 50)
        </label>
        
        <textarea
          id="batch-textarea"
          placeholder="Enter Telegram handles or links separated by commas, semicolons, or newlines. Example:&#10;@durov, t.me/telegram, @username"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isProcessing}
          rows={5}
          className="w-full p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-color)] placeholder-[var(--text-secondary)] placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] disabled:opacity-60 transition-all duration-150 text-xs font-mono leading-relaxed resize-none"
        />

        <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]" id="batch-meta-indicator">
          <span>{currentInputs.length} unique items parsed</span>
          <span>Max safe limit: 50 lookups</span>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2" id="batch-controls-group">
          {isProcessing ? (
            <button
              id="cancel-batch-button"
              type="button"
              onClick={cancelBatchProcess}
              className="flex-1 h-11 flex items-center justify-center gap-2 font-semibold text-xs tracking-wide rounded-xl border border-rose-400 text-rose-500 hover:bg-rose-500 hover:bg-opacity-10 cursor-pointer transition-all active:scale-95"
            >
              <Ban className="w-4 h-4" />
              <span>Cancel Batch</span>
            </button>
          ) : (
            <button
              id="start-batch-button"
              type="button"
              onClick={startBatchProcess}
              disabled={currentInputs.length === 0 || currentInputs.length > 50}
              className="flex-1 h-11 flex items-center justify-center gap-2 font-semibold text-xs tracking-wide rounded-xl shadow-sm cursor-pointer transition-all btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>Resolve All ({currentInputs.length})</span>
            </button>
          )}

          <button
            id="clear-batch-button"
            type="button"
            onClick={handleClear}
            disabled={isProcessing || (!inputText && batchItems.length === 0)}
            className="px-4 h-11 flex items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-rose-500 hover:border-rose-300 transition-all disabled:opacity-40"
            title="Reset batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State Illustration */}
      {batchItems.length === 0 && (
        <div 
          id="batch-empty-state" 
          className="text-center py-10 border border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center gap-4 bg-[var(--surface-color)] bg-opacity-30 animate-fade-in"
        >
          {/* Anime-Style Chibi Vector Mascot */}
          <div className="w-24 h-24 flex items-center justify-center select-none" id="anime-mascot-batch">
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
              Ready for Batch Processing
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] max-w-[280px] mx-auto leading-relaxed">
              Input multiple Telegram handles or URLs above separated by commas, then hit "Resolve All" to lookup multiple IDs concurrently.
            </span>
          </div>
        </div>
      )}

      {/* Progress & Results visualizer */}
      {batchItems.length > 0 && (
        <div className="flex flex-col gap-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-4 animate-fade-in" id="batch-result-display">
          
          {/* Header Stats */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3" id="batch-stats-bar">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Progress Status</span>
              <span className="text-[11px] text-[var(--text-color)] font-mono">
                {completedCount} / {batchItems.length} Processed
              </span>
            </div>
            
            {/* Download/Export Buttons when not processing */}
            {!isProcessing && completedCount > 0 && (
              <div className="flex items-center gap-1.5" id="batch-exports-buttons">
                <button
                  id="csv-export-button"
                  onClick={downloadCSV}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-25 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>CSV</span>
                </button>
                <button
                  id="json-export-button"
                  onClick={downloadJSON}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-25 transition-all"
                >
                  <FileJson className="w-3.5 h-3.5 text-blue-400" />
                  <span>JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden relative" id="batch-progress-bar-container">
            <div
              id="batch-progress-bar-fill"
              className="bg-[var(--primary-color)] h-full transition-all duration-300"
              style={{ width: `${(completedCount / batchItems.length) * 100}%` }}
            />
          </div>

          {/* Table / List View */}
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1" id="batch-items-list">
            {batchItems.map((item, idx) => {
              return (
                <div
                  key={item.id}
                  id={`batch-row-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] border-opacity-40 bg-[var(--bg-color)] bg-opacity-30 text-[11px]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-[var(--text-secondary)] opacity-60 w-5">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold text-[var(--text-color)] truncate max-w-[120px]">
                      {item.input}
                    </span>
                    
                    {/* Resolved Metadata Label */}
                    {item.state === 'SUCCESS' && item.result && (
                      <span className="truncate text-[var(--text-secondary)] opacity-80 pl-2 border-l border-[var(--border-color)]">
                        {item.result.chat.title}
                      </span>
                    )}

                    {item.state === 'ERROR' && item.error && (
                      <span className="text-rose-400 truncate pl-2 border-l border-[var(--border-color)] font-mono text-[10px]">
                        {item.error.code}
                      </span>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex-shrink-0 ml-2">
                    {item.state === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--border-color)] bg-opacity-40 text-[var(--text-secondary)]">
                        Pending
                      </span>
                    )}

                    {item.state === 'LOADING' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--primary-color)] bg-opacity-10 text-[var(--primary-color)] flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Loading
                      </span>
                    )}

                    {item.state === 'SUCCESS' && item.result && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono bg-emerald-500 bg-opacity-10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.result.chat.id}
                        </span>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    )}

                    {item.state === 'ERROR' && item.error && (
                      <div className="flex items-center gap-1" title={item.error.message}>
                        <span className="text-rose-400 font-medium">Failed</span>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick summary alert */}
          {!isProcessing && completedCount === batchItems.length && (
            <div className="bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-20 text-emerald-500 p-3 rounded-xl flex items-center gap-2 text-xs" id="batch-completed-alert">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Batch complete!</strong> Successfully resolved {successCount} item(s) and logged cache profiles.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
