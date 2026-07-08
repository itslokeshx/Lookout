import { Mail, Check, X, Loader2, Sparkles } from 'lucide-react';

export default function TemplatePreview({
  template,
  onApprove,
  onReject,
  isApproving = false,
}) {
  if (!template) return null;

  const bodyLines = (template.body || '').split('\n').filter(l => l.trim());

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-muted">
            <Mail size={13} className="text-accent" />
          </div>
          <span className="text-sm font-medium text-text-primary">
            Generated email template
          </span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-text-tertiary uppercase tracking-wider">
          <Sparkles size={10} /> AI Preview
        </span>
      </div>

      {/* Email card — mimics a real email client */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Browser-like header bar */}
        <div className="px-5 py-3 bg-surface-raised border-b border-border flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <span className="text-[10px] text-text-tertiary ml-2 uppercase tracking-wider">Email Preview</span>
        </div>

        {/* Email metadata */}
        <div className="px-5 py-4 bg-surface-raised border-b border-border space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider w-14 shrink-0">To</span>
            <span className="text-sm text-text-secondary font-mono">
              {template.recipient || 'recipient@example.com'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider w-14 shrink-0">Subject</span>
            <span className="text-sm font-semibold text-text-primary">
              {template.subject}
            </span>
          </div>
        </div>

        {/* Email body — rendered as paragraphs */}
        <div className="px-6 py-6 bg-surface space-y-3">
          {bodyLines.map((line, i) => (
            <p key={i} className="text-sm text-text-secondary leading-relaxed m-0">
              {line}
            </p>
          ))}
        </div>

        {/* Reasoning callout */}
        {template.reason && (
          <div className="mx-5 mb-5">
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-accent-muted/50 border border-accent/10">
              <Sparkles size={12} className="text-accent mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] text-accent uppercase tracking-wider font-semibold block mb-0.5">
                  AI Reasoning
                </span>
                <span className="text-xs text-text-secondary leading-relaxed">
                  {template.reason}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-surface text-sm font-medium transition-all duration-150 hover:bg-accent-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
