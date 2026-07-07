import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../api';

export default function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await sendChatMessage(trimmed, history.slice(0, -1));
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {messages.length > 0 && (
        <div className="flex justify-end px-6 py-2 border-b border-border bg-surface-raised/40">
          <button
            onClick={() => setMessages([])}
            className="text-[11px] font-medium text-text-tertiary hover:text-error transition-colors cursor-pointer"
          >
            Clear chat
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg font-medium text-text-secondary mb-2">
                Ask anything about your data
              </p>
              <p className="text-sm text-text-tertiary max-w-md">
                Try "how many users joined this month" or "what's the average engagement score"
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent-muted text-text-primary chat-bubble-user'
                      : 'bg-surface-raised border border-border text-text-secondary chat-bubble-agent'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-raised border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" style={{ animation: 'pulse-dot 1.2s ease-in-out 0.2s infinite' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" style={{ animation: 'pulse-dot 1.2s ease-in-out 0.4s infinite' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border px-6 py-4 bg-surface">
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-xl border border-border bg-surface-raised transition-all duration-200 focus-within:border-border-strong focus-within:bg-surface-hover">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask about your data..."
              rows={1}
              className="w-full resize-none bg-transparent text-text-primary text-sm leading-relaxed placeholder:text-text-tertiary px-4 py-3 pr-12 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-surface transition-all duration-150 hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowUp size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-text-tertiary mt-2">
            Read-only access to your database. Cannot send emails or modify data.
          </p>
        </div>
      </div>
    </div>
  );
}
