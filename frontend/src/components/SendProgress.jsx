import { CheckCircle2, XCircle, Send } from 'lucide-react';

export default function SendProgress({
  results = [],
  total = 0,
  sent = 0,
  failed = 0,
}) {
  const completed = sent + failed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-muted">
          <Send size={13} className="text-accent" />
        </div>
        <span className="text-sm font-medium text-text-primary">
          Sending campaign
        </span>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary tabular-nums">
              Sending {completed} / {total}
            </span>
            <span className="text-xs text-text-tertiary tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-1 bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Result list */}
        <div className="max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-b-0 transition-all duration-300"
              style={{
                animation: `fadeSlideIn 200ms ${i * 50}ms ease-out both`,
              }}
            >
              {r.success ? (
                <CheckCircle2 size={14} className="text-success shrink-0" />
              ) : (
                <XCircle size={14} className="text-error shrink-0" />
              )}
              <span className="text-xs text-text-secondary font-mono truncate">
                {r.recipient}
              </span>
              {r.detail && (
                <span className="text-xs text-text-tertiary ml-auto truncate max-w-32">
                  {r.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
