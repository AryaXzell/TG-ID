import React from 'react';
import { HistoryItem } from '../lib/types';
import { History, Trash2, ArrowUpRight, Shield } from 'lucide-react';

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (input: string) => void;
  onClear: () => void;
  id?: string;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onSelect,
  onClear,
  id = 'history-list-section',
}) => {
  if (items.length === 0) return null;

  return (
    <div id={id} className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center" id="history-header">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          <History className="w-3.5 h-3.5 text-[var(--primary-color)]" />
          <span>Recent Lookups</span>
        </div>
        <button
          id="clear-history-button"
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-500 hover:bg-rose-500 hover:bg-opacity-10 px-2 py-1 rounded-lg transition-all"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1" id="history-items-container">
        {items.map((item) => (
          <button
            key={item.id}
            id={`history-item-${item.id}`}
            onClick={() => onSelect(item.input)}
            className="w-full flex items-center justify-between text-left p-2.5 rounded-xl border border-[var(--border-color)] border-opacity-50 hover:bg-[var(--border-color)] hover:bg-opacity-20 active:scale-[0.99] transition-all group"
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-xs font-semibold text-[var(--text-color)] truncate">
                {item.input}
              </span>
              {item.resolvedTo ? (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] truncate">
                  <span className="px-1 py-0.5 bg-[var(--border-color)] bg-opacity-40 rounded text-[9px] uppercase tracking-wide">
                    {item.resolvedTo.type}
                  </span>
                  <span className="truncate">{item.resolvedTo.title}</span>
                  <span className="font-mono opacity-80">({item.resolvedTo.id})</span>
                </div>
              ) : (
                <span className="text-[10px] text-[var(--text-secondary)] italic">
                  Not resolved
                </span>
              )}
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-[var(--primary-color)] transition-colors ml-2 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
