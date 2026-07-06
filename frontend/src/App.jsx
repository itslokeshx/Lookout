import { useState, useEffect, useCallback } from 'react';
import TopBar from './components/TopBar';
import PromptInput from './components/PromptInput';
import MatchedUsersTable from './components/MatchedUsersTable';
import TemplatePreview from './components/TemplatePreview';
import SendProgress from './components/SendProgress';
import DispatchSummary from './components/DispatchSummary';
import DispatchHistory from './components/DispatchHistory';
import { TableSkeleton, TemplateSkeleton } from './components/Skeletons';
import { findUsers, approveDispatch, getDispatchHistory } from './api';

/*
  Flow stages:
  'idle'      → prompt input centered, history below
  'searching' → skeleton loaders
  'matched'   → show users + template preview + approval
  'sending'   → progress view
  'complete'  → summary view
  'error'     → error message
*/

export default function App() {
  const [stage, setStage] = useState('idle');
  const [status, setStatus] = useState('idle');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);

  // Data
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [template, setTemplate] = useState(null);
  const [dispatchId, setDispatchId] = useState(null);
  const [sendResults, setSendResults] = useState([]);
  const [sendSent, setSendSent] = useState(0);
  const [sendFailed, setSendFailed] = useState(0);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Load history on mount
  useEffect(() => {
    getDispatchHistory()
      .then(setHistory)
      .catch(() => {});
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
    // Refresh history
    getDispatchHistory()
      .then(setHistory)
      .catch(() => {});
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

      // Process users — normalize minutesListened
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

      // The backend might return results all at once
      if (data.results) {
        const results = data.results;
        // Simulate staggered arrival for better UX
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

      // Brief pause before showing summary
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

  return (
    <div className="min-h-screen bg-surface">
      <TopBar status={status} />

      <main className="pt-20 pb-16 px-6">
        <div
          className={`flex flex-col items-center transition-all duration-500 ease-out ${
            stage === 'idle' ? 'justify-center min-h-[calc(100vh-10rem)]' : 'mt-8'
          }`}
        >
          {/* Prompt input — always visible during idle/searching, collapses after */}
          {(stage === 'idle' || stage === 'searching') && (
            <div
              className={`w-full transition-all duration-500 ${
                stage === 'idle' ? 'mb-0' : 'mb-10'
              }`}
            >
              <PromptInput
                onSubmit={handleSubmit}
                isLoading={stage === 'searching'}
              />
            </div>
          )}

          {/* Error */}
          {error && stage === 'idle' && (
            <div className="w-full max-w-2xl mx-auto mt-6 animate-in">
              <div className="rounded-xl border border-error/20 bg-error/5 px-5 py-4">
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Searching skeleton */}
          {stage === 'searching' && (
            <div className="w-full space-y-8">
              <TableSkeleton />
              <TemplateSkeleton />
            </div>
          )}

          {/* Matched users + template */}
          {stage === 'matched' && (
            <div className="w-full space-y-8 animate-in">
              {/* Prompt echo */}
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

          {/* Sending */}
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

          {/* Complete */}
          {stage === 'complete' && (
            <div className="w-full animate-in">
              <DispatchSummary
                result={dispatchResult}
                onNewDispatch={resetFlow}
              />
            </div>
          )}

          {/* History — visible when idle */}
          {stage === 'idle' && <DispatchHistory dispatches={history} />}
        </div>
      </main>
    </div>
  );
}
