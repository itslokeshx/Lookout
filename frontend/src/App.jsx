import { useState, useEffect, useCallback } from 'react';
import TopBar from './components/TopBar';
import PromptInput from './components/PromptInput';
import MatchedUsersTable from './components/MatchedUsersTable';
import TemplatePreview from './components/TemplatePreview';
import SendProgress from './components/SendProgress';
import DispatchSummary from './components/DispatchSummary';
import DispatchHistory from './components/DispatchHistory';
import ChatView from './components/ChatView';
import SetupView from './components/SetupView';
import { TableSkeleton, TemplateSkeleton } from './components/Skeletons';
import { findUsers, approveDispatch, getDispatchHistory, getSettings } from './api';

export default function App() {
  const [view, setView] = useState('loading');
  const [mode, setMode] = useState(() => localStorage.getItem('lookout_mode') || 'chat');
  const [settings, setSettings] = useState(null);

  const [stage, setStage] = useState('idle');
  const [status, setStatus] = useState('idle');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);

  const [matchedUsers, setMatchedUsers] = useState([]);
  const [template, setTemplate] = useState(null);
  const [dispatchId, setDispatchId] = useState(null);
  const [sendResults, setSendResults] = useState([]);
  const [sendSent, setSendSent] = useState(0);
  const [sendFailed, setSendFailed] = useState(0);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        setView(s.setup_complete ? 'main' : 'setup');
      })
      .catch(() => setView('setup'));
  }, []);

  useEffect(() => {
    if (view === 'main') {
      getDispatchHistory().then(setHistory).catch(() => {});
    }
  }, [view]);

  useEffect(() => {
    localStorage.setItem('lookout_mode', mode);
  }, [mode]);

  const handleSetupComplete = useCallback(() => {
    getSettings().then((s) => {
      setSettings(s);
      setView('main');
    });
  }, []);

  const resetFlow = useCallback(() => {
    setStage('idle');
    setStatus('idle');
    setPrompt('');
    setError(null);
    setMatchedUsers([]);
    setTemplate(null);
    setDispatchId(null);
    setSendResults([]);
    setSendSent(0);
    setSendFailed(0);
    setDispatchResult(null);
    getDispatchHistory().then(setHistory).catch(() => {});
  }, []);

  const handleSubmit = useCallback(async (userPrompt) => {
    setPrompt(userPrompt);
    setStage('searching');
    setStatus('working');
    setError(null);

    try {
      const data = await findUsers(userPrompt);

      if (!data.users || data.users.length === 0) {
        setStage('idle');
        setStatus('idle');
        setError('No users matched your query. Try a different prompt.');
        return;
      }

      const users = data.users.map((u, i) => ({
        ...u,
        rank: i + 1,
        minutesListened:
          u.minutesListened ?? (u.totalListeningTime ? Math.round(u.totalListeningTime / 60) : undefined),
      }));

      setMatchedUsers(users);
      setTemplate(data.template || null);
      setDispatchId(data.dispatch_id || null);
      setStage('matched');
      setStatus('idle');
    } catch (err) {
      setError(err.message || 'Failed to find users.');
      setStage('idle');
      setStatus('idle');
    }
  }, []);

  const handleApprove = useCallback(async () => {
    setStage('sending');
    setStatus('working');
    setSendResults([]);
    setSendSent(0);
    setSendFailed(0);

    try {
      const data = await approveDispatch(dispatchId);

      if (data.results) {
        const results = data.results;
        for (let i = 0; i < results.length; i++) {
          await new Promise((r) => setTimeout(r, 120));
          setSendResults((prev) => [...prev, results[i]]);
          if (results[i].success) {
            setSendSent((prev) => prev + 1);
          } else {
            setSendFailed((prev) => prev + 1);
          }
        }
      }

      setDispatchResult(
        data.summary || {
          totalUsers: matchedUsers.length,
          sent: data.results?.filter((r) => r.success).length || 0,
          failed: data.results?.filter((r) => !r.success).length || 0,
          duration: data.duration || 0,
        }
      );

      await new Promise((r) => setTimeout(r, 600));
      setStage('complete');
      setStatus('idle');
    } catch (err) {
      setError(err.message || 'Failed to dispatch campaign.');
      setStage('idle');
      setStatus('idle');
    }
  }, [dispatchId, matchedUsers]);

  const handleReject = useCallback(() => {
    setDispatchResult({
      totalUsers: matchedUsers.length,
      sent: 0,
      failed: 0,
      rejected: matchedUsers.length,
      duration: 0,
    });
    setStage('complete');
    setStatus('idle');
  }, [matchedUsers]);

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex items-center gap-2 text-text-tertiary">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-sm">Connecting...</span>
        </div>
      </div>
    );
  }

  if (view === 'setup' || view === 'settings') {
    return (
      <div className="min-h-screen bg-surface">
        <TopBar
          status="idle"
          productName={settings?.product_name}
          onSettingsClick={view === 'settings' ? () => setView('main') : undefined}
        />
        <main className="pt-20">
          <SetupView
            existingSettings={settings}
            onComplete={handleSetupComplete}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopBar
        status={status}
        mode={mode}
        onModeChange={(m) => { setMode(m); if (m === 'mail') resetFlow(); }}
        onSettingsClick={() => setView('settings')}
        productName={settings?.product_name}
      />

      <main className="pt-16">
        {mode === 'chat' && <ChatView />}

        {mode === 'mail' && (
          <div className="pb-16 px-6">
            <div className={`flex flex-col items-center transition-all duration-500 ease-out ${
              stage === 'idle' ? 'justify-center min-h-[calc(100vh-10rem)] pt-0' : 'mt-8'
            }`}>
              {(stage === 'idle' || stage === 'searching') && (
                <div className={`w-full transition-all duration-500 ${
                  stage === 'idle' ? 'mb-0' : 'mb-10'
                }`}>
                  <PromptInput onSubmit={handleSubmit} isLoading={stage === 'searching'} />
                </div>
              )}

              {error && stage === 'idle' && (
                <div className="w-full max-w-2xl mx-auto mt-6 animate-in">
                  <div className="rounded-xl border border-error/20 bg-error/5 px-5 py-4">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                </div>
              )}

              {stage === 'searching' && (
                <div className="w-full space-y-8">
                  <TableSkeleton />
                  <TemplateSkeleton />
                </div>
              )}

              {stage === 'matched' && (
                <div className="w-full space-y-8 animate-in">
                  <div className="w-full max-w-2xl mx-auto">
                    <div className="rounded-xl bg-surface-raised border border-border px-5 py-3">
                      <p className="text-sm text-text-secondary">{prompt}</p>
                    </div>
                  </div>
                  <MatchedUsersTable users={matchedUsers} prompt={prompt} />
                  <TemplatePreview
                    template={template}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                </div>
              )}

              {stage === 'sending' && (
                <div className="w-full animate-in">
                  <SendProgress
                    results={sendResults}
                    total={matchedUsers.length}
                    sent={sendSent}
                    failed={sendFailed}
                  />
                </div>
              )}

              {stage === 'complete' && (
                <div className="w-full animate-in">
                  <DispatchSummary result={dispatchResult} onNewDispatch={resetFlow} />
                </div>
              )}

              {stage === 'idle' && <DispatchHistory dispatches={history} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
