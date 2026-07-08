import { Settings, Sun, Moon, Database } from 'lucide-react';

export default function TopBar({ status = 'idle', mode, onModeChange, onSettingsClick, productName, dbName, theme, onThemeToggle }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold tracking-tight text-text-primary">
          LookOut
        </span>
        {productName && (
          <>
            <span className="text-text-tertiary text-xs">/</span>
            <span className="text-xs font-medium text-text-secondary">{productName}</span>
          </>
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

        {/* Connection status chip */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              status === 'working'
                ? 'bg-accent animate-pulse'
                : status === 'connected'
                  ? 'bg-success'
                  : 'bg-text-tertiary'
            }`}
          />
          {dbName && status === 'connected' ? (
            <div className="flex items-center gap-1.5">
              <Database size={11} className="text-text-tertiary" />
              <span className="text-xs text-text-secondary font-medium">{dbName}</span>
            </div>
          ) : (
            <span className="text-xs text-text-tertiary">
              {status === 'working' ? 'Processing…' : status}
            </span>
          )}
        </div>

        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all duration-150 cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}

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
