import { CheckCircle2, XCircle, Send, Zap, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

const ACTIVITY_MESSAGES = [
  'Preparing email payload…',
  'Connecting to Brevo…',
  'Authenticating sender…',
  'Rendering personalized template…',
  'Dispatching to recipient…',
  'Verifying delivery status…',
  'Processing next recipient…',
  'Finalizing batch…',
];

export default function SendProgress({
  results = [],
  total = 0,
  sent = 0,
  failed = 0,
}) {
  const completed = sent + failed;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const [activityIdx, setActivityIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIdx((prev) => (prev + 1) % ACTIVITY_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-muted">
          <Send size={13} className="text-accent" />
        </div>
        <span className="text-sm font-medium text-text-primary">
          Dispatching campaign
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
        {/* Progress hero section */}
        <div className="px-6 py-8 border-b border-border">
          <div className="flex items-center gap-8">
            {/* Animated ring */}
            <div className="relative shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="6"
                />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-text-primary tabular-nums">
                  {Math.round(progress)}%
                </span>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
                  complete
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
                  <p className="text-xl font-bold text-text-primary tabular-nums">{completed}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">
                    of {total}
                  </p>
                </div>
                <div className="bg-surface border border-success/20 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-xl font-bold text-success tabular-nums">{sent}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">Sent</p>
                </div>
                <div className="bg-surface border border-error/20 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-xl font-bold text-error tabular-nums">{failed}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">Failed</p>
                </div>
              </div>

              {/* Activity message */}
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent send-pulse" />
                <span className="text-xs text-text-tertiary send-activity-text" key={activityIdx}>
                  {completed < total ? ACTIVITY_MESSAGES[activityIdx] : 'Wrapping up…'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: failed > 0
                      ? 'linear-gradient(90deg, var(--success), var(--warning))'
                      : 'var(--accent)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live result feed */}
        <div className="max-h-56 overflow-y-auto">
          {results.length === 0 && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Mail size={14} className="text-text-tertiary animate-pulse" />
              <span className="text-xs text-text-tertiary">Waiting for first delivery…</span>
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-b-0"
              style={{
                animation: `fadeSlideIn 250ms ${Math.min(i * 40, 400)}ms ease-out both`,
              }}
            >
              {r.success ? (
                <CheckCircle2 size={14} className="text-success shrink-0" />
              ) : (
                <XCircle size={14} className="text-error shrink-0" />
              )}
              <span className="text-xs text-text-secondary font-mono truncate flex-1">
                {r.recipient}
              </span>
              <span className={`text-[10px] uppercase tracking-wider font-medium ${r.success ? 'text-success' : 'text-error'}`}>
                {r.success ? 'delivered' : 'failed'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sendPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .send-pulse {
          animation: sendPulse 1.2s ease-in-out infinite;
        }
        .send-activity-text {
          animation: fadeSlideIn 300ms ease-out both;
        }
      `}</style>
    </div>
  );
}
