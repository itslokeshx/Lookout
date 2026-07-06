import { Mail, Check, X, Loader2 } from 'lucide-react';

export default function TemplatePreview({
  template,
  onApprove,
  onReject,
  isApproving = false,
}) {
  if (!template) return null;

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-muted">
          <Mail size={13} className="text-accent" />
        </div>
        <span className="text-sm font-medium text-text-primary">
          Email preview
        </span>
      </div>

      {/* Email preview card */}
      <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
        {/* Email header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-text-tertiary">To:</span>
            <span className="text-xs text-text-secondary">
              {template.recipient || 'recipient@example.com'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">Subject:</span>
            <span className="text-sm font-semibold text-text-primary">
              {template.subject}
            </span>
          </div>
        </div>

        {/* Email body */}
        <div className="px-5 py-5">
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {template.body}
          </div>
        </div>

        {/* Reason callout */}
        {template.reason && (
          <div className="mx-5 mb-5 px-4 py-3 rounded-lg bg-surface-hover border border-border">
            <span className="text-xs text-text-tertiary">Reasoning: </span>
            <span className="text-xs text-text-secondary">
              {template.reason}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-surface text-sm font-medium transition-all duration-150 hover:bg-accent-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          {isApproving ? 'Dispatching…' : 'Approve & Send to All'}
        </button>
        <button
          onClick={onReject}
          disabled={isApproving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-medium transition-all duration-150 hover:bg-surface-hover hover:text-text-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <X size={15} />
          Reject
        </button>
      </div>
    </div>
  );
}
