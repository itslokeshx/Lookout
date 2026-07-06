import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useState } from 'react';

function StatusBadge({ status }) {
  const styles = {
    sent: 'bg-success/10 text-success',
    pending: 'bg-accent-muted text-accent',
    rejected: 'bg-error/10 text-error',
    sending: 'bg-accent-muted text-accent',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DispatchHistory({ dispatches = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!dispatches.length) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <div className="text-center py-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-raised border border-border mx-auto mb-3">
            <MessageSquare size={16} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-tertiary">No dispatches yet</p>
          <p className="text-xs text-text-tertiary mt-1">
            Your campaign history will appear here.
          </p>
        </div>
      </div>
    );
  }

  const visible = isExpanded ? dispatches : dispatches.slice(0, 5);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors duration-150 mb-3 cursor-pointer"
      >
        <span className="uppercase tracking-wider font-medium">
          Recent dispatches
        </span>
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      <div className="rounded-xl border border-border overflow-hidden">
        {visible.map((d, i) => (
          <div
            key={d.id || i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-hover"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{d.prompt}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {d.totalUsers} user{d.totalUsers !== 1 ? 's' : ''} ·{' '}
                {formatTime(d.timestamp)}
              </p>
            </div>
            <StatusBadge status={d.status || 'sent'} />
          </div>
        ))}
      </div>

      {dispatches.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-center py-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors duration-150 mt-1 cursor-pointer"
        >
          {isExpanded
            ? 'Show less'
            : `Show ${dispatches.length - 5} more`}
        </button>
      )}
    </div>
  );
}
