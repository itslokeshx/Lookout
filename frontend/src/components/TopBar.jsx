import { Radio } from 'lucide-react';

export default function TopBar({ status = 'idle' }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold tracking-tight text-text-primary">
          Lookout
        </span>
        <span className="text-xs text-text-tertiary font-medium tracking-wide uppercase">
          SoulSync
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            status === 'working'
              ? 'bg-accent animate-pulse'
              : status === 'connected'
                ? 'bg-success'
                : 'bg-text-tertiary'
          }`}
        />
        <span className="text-xs text-text-tertiary capitalize">{status}</span>
      </div>
    </header>
  );
}
