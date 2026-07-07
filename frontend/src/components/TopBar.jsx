import { Settings } from 'lucide-react';

export default function TopBar({ status = 'idle', mode, onModeChange, onSettingsClick, productName }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold tracking-tight text-text-primary">
          Lookout
        </span>
        {productName && (
          <span className="text-xs text-text-tertiary font-medium tracking-wide uppercase">
            {productName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {mode && (
          <div className="flex items-center bg-surface-raised border border-border rounded-lg p-0.5">
            <button
              onClick={() => onModeChange('chat')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                mode === 'chat'
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onModeChange('mail')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                mode === 'mail'
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Mail
            </button>
          </div>
        )}

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

        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all duration-150 cursor-pointer"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
