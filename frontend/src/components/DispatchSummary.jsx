import { CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';

export default function DispatchSummary({ result, onNewDispatch }) {
  if (!result) return null;

  const stats = [
    {
      label: 'Sent',
      value: result.sent,
      icon: CheckCircle2,
      color: 'text-success',
    },
    {
      label: 'Failed',
      value: result.failed,
      icon: XCircle,
      color: 'text-error',
    },
    {
      label: 'Duration',
      value: `${result.duration}s`,
      icon: Clock,
      color: 'text-text-secondary',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      {/* Stats grid */}
      <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
        <div className="px-5 py-5 border-b border-border">
          <p className="text-sm text-text-secondary mb-1">
            Campaign dispatched
          </p>
          <p className="text-xs text-text-tertiary">
            {result.totalUsers} user{result.totalUsers !== 1 ? 's' : ''}{' '}
            targeted
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="px-5 py-6 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Icon size={14} className={color} />
              </div>
              <p className="text-2xl font-semibold text-text-primary tabular-nums tracking-tight">
                {value}
              </p>
              <p className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">
                {label}
              </p>
            </div>
          ))}
        </div>

        {result.rejected > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <p className="text-xs text-text-tertiary">
              {result.rejected} user{result.rejected !== 1 ? 's' : ''} not sent
              (campaign rejected)
            </p>
          </div>
        )}
      </div>

      {/* New dispatch */}
      <div className="flex justify-center mt-6">
        <button
          onClick={onNewDispatch}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary text-sm transition-all duration-150 hover:bg-surface-hover hover:text-text-primary cursor-pointer"
        >
          <RotateCcw size={14} />
          New dispatch
        </button>
      </div>
    </div>
  );
}
