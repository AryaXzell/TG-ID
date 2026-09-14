import React, { useState, useEffect } from 'react';
import { Delete, X, ClipboardPaste } from 'lucide-react';

interface SearchInputProps {
  onSearch: (value: string) => void;
  isLoading: boolean;
  id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  isLoading,
  id = 'search-section',
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const maxLength = 256;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      setInputValue(val);
    }
  };

  const handleClear = () => {
    setInputValue('');
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const truncated = text.substring(0, maxLength);
          setInputValue(truncated);
        }
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.warn('Clipboard read access blocked or unsupported:', err);
      // We do not fail the app, just alert the user in a non-disruptive way or show a tooltip.
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  };

  return (
    <div id={id} className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" id="lookup-form">
        <label
          htmlFor="telegram-input"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block mb-1"
          id="input-field-label"
        >
          Telegram Identifier
        </label>
        
        <div className="relative flex items-center" id="input-positioning-container">
          <input
            id="telegram-input"
            type="text"
            placeholder="@username, t.me/channel, or numeric ID"
            value={inputValue}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full h-12 pl-4 pr-24 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-color)] placeholder-[var(--text-secondary)] placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] disabled:opacity-60 transition-all duration-150"
            maxLength={maxLength}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />

          <div
            className="absolute right-3 flex items-center gap-2"
            id="input-actions-container"
          >
            {inputValue && !isLoading && (
              <button
                id="clear-input-button"
                type="button"
                onClick={handleClear}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-30 transition-all"
                title="Clear input"
              >
                <X id="clear-icon" className="w-4 h-4" />
              </button>
            )}

            {!isLoading && (
              <button
                id="paste-input-button"
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-20 active:scale-95 transition-all"
                title="Paste from clipboard"
              >
                <ClipboardPaste id="paste-icon" className="w-3.5 h-3.5" />
                <span id="paste-label" className="hidden sm:inline font-medium">Paste</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-1 text-xs text-[var(--text-secondary)]" id="input-info-footer">
          <span id="help-hint">
            Supports @username, t.me links, & public topic links.
          </span>
          <span id="char-counter" className={inputValue.length > maxLength - 20 ? 'text-rose-500 font-bold' : ''}>
            {inputValue.length} / {maxLength}
          </span>
        </div>

        <button
          id="resolve-action-button"
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className={`w-full h-12 flex items-center justify-center font-semibold text-sm tracking-wide rounded-xl shadow-sm cursor-pointer transition-all duration-200
            ${isLoading ? 'loading-button-glow cursor-wait' : 'btn-primary'}
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span id="button-loading-text" className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-color)] animate-ping" />
              Checking Telegram...
            </span>
          ) : (
            <span id="button-idle-text">Check ID</span>
          )}
        </button>
      </form>
    </div>
  );
};
