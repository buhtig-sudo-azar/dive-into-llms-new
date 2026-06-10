import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2, Maximize2, Shrink, Send, Sparkles, MessageSquare } from 'lucide-react';
import { agents, ChatMessage } from './chatData';

interface ChatPopupProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPopup({ activeTab, isOpen, onClose }: ChatPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const agent = agents[activeTab] || agents['tokenizer'];

  // Reset messages when tab changes
  useEffect(() => {
    setMessages([]);
    setIsMinimized(false);
  }, [activeTab]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          systemInstruction: agent.systemPrompt,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const reply = data.text || 'Не удалось получить ответ. Попробуйте ещё раз.';

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Произошла ошибка сети. Проверьте подключение и попробуйте снова.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, agent.systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
    setIsMinimized(false);
    setIsExpanded(false);
  }, [onClose]);

  if (!isOpen) return null;

  // Minimized — small floating avatar
  if (isMinimized) {
    return (
      <div className="fixed bottom-24 right-4 sm:right-6 z-50 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="group relative focus:outline-none"
        >
          <span className={`absolute -inset-1 rounded-full bg-gradient-to-br ${agent.gradient} opacity-50 group-hover:opacity-80 transition-opacity`} />
          <span className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-800 shadow-lg bg-slate-900">
            <Sparkles className="w-7 h-7 text-white" />
          </span>
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
              {messages.length}
            </span>
          )}
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`
        fixed z-50 flex flex-col
        bg-slate-950 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden
        transition-all duration-300 ease-in-out
        ${isExpanded
          ? 'sm:bottom-4 sm:right-4 sm:top-4 sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-2rem)] max-sm:inset-2 max-sm:max-h-[calc(100vh-1rem)]'
          : 'sm:bottom-20 sm:right-6 sm:w-[400px] sm:max-h-[580px] max-sm:inset-x-3 max-sm:bottom-20 max-sm:top-auto max-sm:max-h-[70vh]'
        }
        animate-in slide-in-from-bottom-4 fade-in duration-200
      `}
    >
      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0">
        <div className={`absolute inset-0 bg-gradient-to-r ${agent.gradient} opacity-[0.08]`} />
        <div className="relative flex items-center gap-3 w-full">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br ${agent.gradient} shadow-md flex-shrink-0`}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-100 truncate">{agent.name}</h3>
            <p className="text-[11px] text-slate-400 truncate">{agent.role}</p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
              aria-label={isExpanded ? 'Свернуть окно' : 'Развернуть окно'}
            >
              {isExpanded ? <Shrink className="h-3.5 w-3.5 text-slate-400" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-400" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Свернуть"
            >
              <Minimize2 className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              onClick={handleClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Закрыть"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br ${agent.gradient} mb-3 shadow-lg`}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <p className="text-sm font-semibold text-slate-200">{agent.name}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mb-4">
              {agent.greeting}
            </p>
            <div className="w-full max-w-[280px] space-y-1.5">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Попробуйте спросить</p>
              {agent.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-700/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-violet-600' : `bg-gradient-to-br ${agent.gradient}`
                }`}>
                  {msg.role === 'user' ? (
                    <span className="text-[10px] text-white font-bold">Я</span>
                  ) : (
                    <Sparkles className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600/20 text-violet-100'
                    : 'bg-slate-800/50 text-slate-300'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse pl-8">
                <Sparkles className="w-3 h-3" />
                <span>Думаю...</span>
              </div>
            )}
            {/* Suggestions after response */}
            {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <div className="pt-2 space-y-1">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Ещё вопросы</p>
                {agent.suggestions.slice(0, 2).map((s, i) => (
                  <button
                    key={`f-${i}`}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors text-slate-500 hover:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задайте вопрос..."
            className="flex-1 min-h-[40px] max-h-24 resize-none text-sm bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${agent.gradient} text-white shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
