import React, { useState, useEffect, useRef } from 'react';
import { Send, FileChartLine, User, RotateCcw, Copy, ThumbsUp } from 'lucide-react';
import api from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const promptExamples: string[] = [];

function StreamingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        const chunkSize = Math.floor(Math.random() * 4) + 2;
        const nextIndex = Math.min(indexRef.current + chunkSize, text.length);
        setDisplayed(text.slice(0, nextIndex));
        indexRef.current = nextIndex;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <>{displayed}</>;
}

export function AIResearchChat({ selectedDocId }: { selectedDocId?: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const streamingId = (Date.now() + 1).toString();
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await api.post('/agent/chat', { message: content, history, companyId: selectedDocId || '' });
      const responseText = res.data?.response || 'No response from AI.';
      setMessages(prev => [...prev, {
        id: streamingId,
        role: 'assistant',
        content: responseText,
        streaming: true,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: streamingId,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        streaming: true,
      }]);
    }
  };

  const handleStreamComplete = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, streaming: false } : m));
    setIsStreaming(false);
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-semibold mt-4 mb-1.5 first:mt-0" style={{ color: 'var(--ad-text-primary)' }}>
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: 'var(--ad-accent)' }} />
            <span style={{ color: 'var(--ad-text-secondary)' }}>{line.slice(2)}</span>
          </div>
        );
      }
      if (line === '') return <div key={i} className="h-1" />;
      return <p key={i} className="my-0.5" style={{ color: 'var(--ad-text-secondary)' }}>{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8">
            <div className="mb-5">
              <FileChartLine className="w-12 h-12" style={{ color: 'var(--ad-accent)' }} />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-center" style={{ color: 'var(--ad-text-primary)' }}>
            Venorse - AI Financial Research Assistant
            </h2>
            <p className="text-sm text-center mb-8 max-w-md leading-relaxed" style={{ color: 'var(--ad-text-secondary)' }}>
              Ask questions about companies, financial reports, earnings, valuation, risk assessment, and market developments.
            </p>

            <div className="w-full max-w-lg space-y-2.5">
              <p className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--ad-text-muted)' }}>
                Try asking
              </p>
              {promptExamples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(ex)}
                  className="w-full text-left px-5 py-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 group"
                  style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ad-border-accent)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ad-accent-dim)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ad-border)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ad-card)';
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--ad-text-primary)' }}>{ex}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                    style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
                  >
                    <FileChartLine className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--ad-accent-dim)' : 'var(--ad-card)',
                    border: `1px solid ${msg.role === 'user' ? 'var(--ad-border-accent)' : 'var(--ad-border)'}`,
                  }}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm" style={{ color: 'var(--ad-text-primary)' }}>{msg.content}</p>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      {msg.streaming ? (
                        <StreamingText
                          text={msg.content}
                          onComplete={() => handleStreamComplete(msg.id)}
                        />
                      ) : (
                        renderContent(msg.content)
                      )}
                    </div>
                  )}

                  {msg.role === 'assistant' && !msg.streaming && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--ad-border-subtle)' }}>
                      <button
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--ad-text-muted)', backgroundColor: 'var(--ad-accent-dim)' }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                      <button
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--ad-text-muted)', backgroundColor: 'var(--ad-accent-dim)' }}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Helpful
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                    style={{ backgroundColor: 'var(--ad-card)', border: '1px solid var(--ad-border)' }}
                  >
                    <User className="w-4 h-4" style={{ color: 'var(--ad-text-secondary)' }} />
                  </div>
                )}
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-4 justify-start">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
                >
                  <FileChartLine className="w-4 h-4 text-white" />
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2"
                  style={{ backgroundColor: 'var(--ad-card)', border: '1px solid var(--ad-border)' }}
                >
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: 'var(--ad-accent)', animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6 pt-4 border-t" style={{ borderColor: 'var(--ad-border)' }}>
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything about financial data, reports, or companies..."
            rows={3}
            className="w-full px-5 py-4 pr-14 rounded-2xl border text-sm resize-none outline-none transition-all"
            style={{
              backgroundColor: 'var(--ad-card)',
              borderColor: 'var(--ad-border)',
              color: 'var(--ad-text-primary)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--ad-border-accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--ad-accent-dim)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--ad-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="absolute right-3.5 bottom-3.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--ad-text-muted)' }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
