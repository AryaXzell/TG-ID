import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, MessageSquare, Info, Shield } from 'lucide-react';
import { ResolveSuccessData } from '../lib/types';

interface ResultCardProps {
  data: ResolveSuccessData;
  id?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, id = 'result-card' }) => {
  const { type, chat, topic, avatar } = data;
  const [copiedId, setCopiedId] = useState<'chat' | 'topic' | 'json' | null>(null);
  const [isJsonOpen, setIsJsonOpen] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Handle clipboard copy with fallback
  const handleCopy = async (textToCopy: string, typeKey: 'chat' | 'topic' | 'json') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedId(typeKey);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        // Fallback for older browsers or restricted environments
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedId(typeKey);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Get Initials for placeholder avatar
  const getInitials = (title: string) => {
    return title
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'TG';
  };

  // Map type to a human readable badge
  const getTypeLabel = (chatType: string) => {
    switch (chatType) {
      case 'supergroup':
        return 'Supergroup (Forum)';
      case 'group':
        return 'Group Chat';
      case 'channel':
        return 'Channel';
      case 'private':
        return 'User / Bot';
      default:
        return chatType;
    }
  };

  return (
    <div
      id={id}
      className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-md p-5 md:p-6 transition-all duration-200"
    >
      {/* 1. Primary Identity Header Section */}
      <div className="flex items-start gap-4" id="identity-header">
        {/* Avatar Area */}
        <div className="relative flex-shrink-0" id="avatar-container">
          {avatar.available && avatar.url && !imgError ? (
            <img
              id="chat-avatar-image"
              src={avatar.url}
              alt={chat.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-16 h-16 rounded-2xl object-cover border border-[var(--border-color)] shadow-sm"
            />
          ) : (
            <div
              id="avatar-placeholder"
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white bg-[var(--primary-color)] shadow-sm tracking-wide"
            >
              {getInitials(chat.title)}
            </div>
          )}
          <span
            id="chat-type-indicator"
            className="absolute -bottom-1 -right-1 flex items-center justify-center bg-[var(--text-color)] text-[var(--bg-color)] text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full scale-90 border border-[var(--border-color)]"
          >
            {chat.type}
          </span>
        </div>

        {/* Name and Handle Info */}
        <div className="flex-1 min-w-0" id="identity-meta">
          <div className="flex items-center gap-2 flex-wrap" id="title-row">
            <h2
              id="chat-title"
              className="text-lg font-bold text-[var(--text-color)] leading-snug truncate"
            >
              {chat.title}
            </h2>
          </div>

          <div className="flex flex-col gap-1 mt-1" id="handle-row">
            {chat.username ? (
              <a
                id="telegram-profile-link"
                href={`https://t.me/${chat.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[var(--primary-color)] hover:underline inline-flex items-center gap-1 w-max"
              >
                @{chat.username}
                <ExternalLink id="external-link-icon" className="w-3 h-3" />
              </a>
            ) : (
              <span id="private-identifier" className="text-xs text-[var(--text-secondary)] font-medium">
                No public username
              </span>
            )}

            <span id="chat-badge-label" className="text-[11px] font-semibold text-[var(--text-secondary)]">
              {getTypeLabel(chat.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Bio Description (if present) */}
      {chat.bio && (
        <div
          id="chat-bio-container"
          className="mt-4 p-3 rounded-xl bg-[var(--surface-color-2)] text-xs text-[var(--text-color)] border border-[var(--border-color)] border-opacity-40 leading-relaxed"
        >
          <p id="chat-bio-text">{chat.bio}</p>
        </div>
      )}

      {/* 2. Core Result Action (Chat ID copy row) */}
      <div className="mt-5 pt-4 border-t border-[var(--border-color)] border-dashed flex flex-col gap-3.5" id="resolution-details">
        
        {/* Chat ID Resolution Row */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)]" id="chat-id-row">
          <div className="flex flex-col min-w-0" id="chat-id-info">
            <span id="chat-id-label" className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-secondary)]">
              Resolved Chat ID
            </span>
            <code id="chat-id-code" className="text-sm font-mono font-bold text-[var(--text-color)] select-all truncate mt-0.5">
              {chat.id}
            </code>
          </div>

          <button
            id="copy-chat-id-button"
            onClick={() => handleCopy(chat.id.toString(), 'chat')}
            className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-150
              ${copiedId === 'chat' 
                ? 'bg-emerald-500 border-emerald-500 text-white' 
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-20 active:scale-95'}`}
            title="Copy Chat ID"
          >
            {copiedId === 'chat' ? (
              <Check id="copied-chat-check" className="w-4 h-4 animate-scale-up" />
            ) : (
              <Copy id="copy-chat-icon" className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 3. Forum Topic specifics if type === 'forum_topic' */}
        {type === 'forum_topic' && topic && (
          <div id="forum-topic-wrapper" className="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--primary-color)] border-opacity-40 bg-[var(--surface-color-2)] bg-opacity-30">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary-color)]" id="topic-header">
              <MessageSquare id="topic-chat-icon" className="w-4 h-4" />
              <span>FORUM TOPIC RESOLVED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="topic-grid">
              {/* Topic Name */}
              <div className="flex flex-col min-w-0" id="topic-name-col">
                <span id="topic-name-label" className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                  Topic Title / Name
                </span>
                <span id="topic-name-val" className="text-sm font-semibold text-[var(--text-color)] truncate mt-0.5">
                  {topic.name}
                </span>
              </div>

              {/* Topic ID */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-color)] border border-[var(--border-color)]" id="topic-id-col">
                <div className="flex flex-col min-w-0" id="topic-id-info">
                  <span id="topic-id-label" className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                    Topic ID
                  </span>
                  <code id="topic-id-code" className="text-xs font-mono font-bold text-[var(--text-color)] truncate mt-0.5">
                    {topic.id}
                  </code>
                </div>

                <button
                  id="copy-topic-id-button"
                  onClick={() => handleCopy(topic.id.toString(), 'topic')}
                  className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-150
                    ${copiedId === 'topic' 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-20 active:scale-95'}`}
                  title="Copy Topic ID"
                >
                  {copiedId === 'topic' ? (
                    <Check id="copied-topic-check" className="w-3.5 h-3.5" />
                  ) : (
                    <Copy id="copy-topic-icon" className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Developer Disclosure Panel */}
      <div className="mt-5 border-t border-[var(--border-color)] pt-3" id="developer-drawer">
        <button
          id="toggle-raw-json-button"
          onClick={() => setIsJsonOpen(!isJsonOpen)}
          className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-color)] py-1.5 transition-colors"
        >
          <span id="developer-toggle-label" className="flex items-center gap-2">
            <Terminal id="terminal-icon" className="w-3.5 h-3.5" />
            Raw Telegram Metadata (JSON)
          </span>
          <span id="developer-toggle-chevron">{isJsonOpen ? 'Close' : 'View'}</span>
        </button>

        {isJsonOpen && (
          <div className="mt-2.5 flex flex-col rounded-xl border border-[var(--border-color)] overflow-hidden" id="json-block-container">
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-[var(--surface-color-2)] px-3 py-2 border-b border-[var(--border-color)]" id="json-header-bar">
              <span id="json-type-badge" className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)]">
                Response Output
              </span>
              <button
                id="copy-json-button"
                onClick={() => handleCopy(JSON.stringify(data, null, 2), 'json')}
                className="flex items-center gap-1 text-[10px] font-bold text-[var(--primary-color)] hover:underline"
              >
                {copiedId === 'json' ? (
                  <>
                    <Check id="copied-json-check" className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy id="copy-json-icon" className="w-3 h-3" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Structured Pre Block */}
            <pre
              id="raw-json-output"
              className="p-3.5 bg-[var(--bg-color)] text-[var(--text-color)] text-[11px] font-mono overflow-auto max-h-56 custom-scrollbar select-all"
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
