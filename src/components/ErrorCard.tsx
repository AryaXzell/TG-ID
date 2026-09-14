import React from 'react';
import { AlertCircle, RefreshCw, Key, ShieldAlert, WifiOff, HelpCircle, UserX } from 'lucide-react';
import { ResolveError } from '../lib/types';

interface ErrorCardProps {
  error: ResolveError;
  onRetry?: () => void;
  id?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ error, onRetry, id = 'error-card' }) => {
  const { code, message } = error;

  // Get specific visual icon and detailed advice based on error code
  const getErrorMeta = (errorCode: string) => {
    switch (errorCode) {
      case 'INVALID_INPUT':
        return {
          icon: <HelpCircle id="invalid-icon" className="w-6 h-6 text-amber-500" />,
          title: 'Malformed Input Format',
          advice: 'Verify that you entered a valid Telegram username or URL. Remove trailing spaces, commas, or special formatting characters.',
        };
      case 'UNSUPPORTED_INPUT':
        return {
          icon: <HelpCircle id="unsupported-icon" className="w-6 h-6 text-amber-500" />,
          title: 'Unsupported Identifier',
          advice: 'Ensure your lookup utilizes standard public Telegram structures (such as @username, t.me/username, or direct numeric IDs).',
        };
      case 'PRIVATE_CHAT':
        return {
          icon: <ShieldAlert id="private-icon" className="w-6 h-6 text-rose-500" />,
          title: 'Private Chat Restricted',
          advice: "This channel, group, or user account is private. Private stable IDs cannot be publicly queried or resolved without membership access.",
        };
      case 'BOT_NO_ACCESS':
        return {
          icon: <Key id="no-access-icon" className="w-6 h-6 text-rose-500" />,
          title: 'Bot Visibility Restriction',
          advice: 'The server-side Telegram Bot lacks visibility or privileges to read this chat. Ensure the bot is added as a member if querying a group ID.',
        };
      case 'NOT_FOUND':
        return {
          icon: <UserX id="not-found-icon" className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />,
          title: 'Identifier Not Found',
          advice: "Telegram failed to resolve this handle. Double-check for spelling mistakes. Note: Due to Telegram privacy rules, a Bot API lookup can only resolve personal user accounts if that user has previously started a conversation with the bot. Public channels, supergroups, and other bots can always be resolved freely.",
        };
      case 'RATE_LIMITED':
        return {
          icon: <AlertCircle id="rate-limit-icon" className="w-6 h-6 text-rose-500" />,
          title: 'Abuse Limit Exceeded',
          advice: 'You have triggered our rate limiter. Please wait 30–60 seconds before initiating subsequent query transactions.',
        };
      case 'TIMEOUT':
        return {
          icon: <WifiOff id="timeout-icon" className="w-6 h-6 text-rose-500" />,
          title: 'Gateway Timeout',
          advice: 'The Telegram API servers took too long to complete the lookup request. Verify if Telegram services are currently disrupted, and retry.',
        };
      case 'NETWORK_ERROR':
        return {
          icon: <WifiOff id="network-icon" className="w-6 h-6 text-rose-500" />,
          title: 'Network Communication Error',
          advice: 'Failed to dispatch the network request. Check your local device connection, firewall blocks, or ISP restrictions on Telegram domains.',
        };
      case 'TELEGRAM_ERROR':
      default:
        return {
          icon: <AlertCircle id="telegram-error-icon" className="w-6 h-6 text-rose-500" />,
          title: 'Telegram Server Exception',
          advice: 'An unmapped error occurred during communication. Check the raw error details below, and try again shortly.',
        };
    }
  };

  const meta = getErrorMeta(code);

  return (
    <div
      id={id}
      className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-md p-5 md:p-6 transition-colors duration-200"
    >
      <div className="flex items-start gap-3.5" id="error-header">
        <div id="error-icon-wrapper" className="flex-shrink-0 mt-0.5">
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0" id="error-title-section">
          <span
            id="error-badge-category"
            className="text-[10px] font-extrabold tracking-wider uppercase text-rose-500 block mb-0.5"
          >
            Resolution Failed
          </span>
          <h3
            id="error-headline-title"
            className="text-base font-bold text-[var(--text-color)] leading-snug"
          >
            {meta.title}
          </h3>
        </div>
      </div>

      <div className="mt-3.5" id="error-body-section">
        {/* Main Human Error Message */}
        <p id="error-human-msg" className="text-sm text-[var(--text-color)] leading-relaxed">
          {message}
        </p>

        {/* Actionable Advice Card */}
        <div
          id="error-advice-box"
          className="mt-3.5 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-xs text-[var(--text-secondary)] leading-relaxed"
        >
          <strong id="troubleshoot-label" className="text-[var(--text-color)] font-semibold block mb-1">
            Troubleshooting Steps:
          </strong>
          {meta.advice}
        </div>
      </div>

      {onRetry && (
        <button
          id="error-retry-button"
          onClick={onRetry}
          className="mt-4 w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-color)] bg-[var(--surface-color)] hover:bg-[var(--border-color)] hover:bg-opacity-20 active:scale-98 transition-all"
        >
          <RefreshCw id="retry-icon" className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
