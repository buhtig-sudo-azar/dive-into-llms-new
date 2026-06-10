import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2, Maximize2, Shrink, Send, Sparkles, MessageSquare, RefreshCw } from 'lucide-react';
import { agents, ChatMessage } from './chatData';

interface ChatPopupProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
}

// AbortController for cancelling in-flight requests
let currentAbortController: AbortController | null = null;

export default function ChatPopup({ activeTab, isOpen, onClose }: ChatPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastError, setLastError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const agent = agents[activeTab] || agents['tokenizer'];

  // Reset when tab changes
  useEffect(() => {
    setMessages([]);
    setIsMinimized(false);
    setLastError(false);
    // Cancel any in-flight request
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  }, [activeTab]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const appendToLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return msgs;
    });
  }, []);

  const sendMessage = useCallback(async (text: string, isRetry = false) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Cancel previous request
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }

    setLastError(false);

    // Add user message (skip if retry — it's already there)
    if (!isRetry) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }]);
    }
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    currentAbortController = controller;

    try {
      // Build conversation history for multi-turn
      const currentMessages = messages
        .filter(m => isRetry ? m !== messages[messages.length - 1] : true) // remove error msg on retry
        .map(m => ({ role: m.role, content: m.content }));
      if (!isRetry) {
        currentMessages.push({ role: 'user', content: trimmed });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          systemPrompt: agent.systemPrompt,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (controller.signal.aborted) return;
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.error === 'All models unavailable'
          ? 'Все модели заняты. Попробуйте подождать пару минут или задайте вопрос снова.'
          : `Ошибка сервера (${response.status}). Попробуйте ещё раз.`;
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: errMsg }]);
        setLastError(true);
        setIsLoading(false);
        return;
      }

      // SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Ошибка: нет потока данных.' }]);
        setLastError(true);
        setIsLoading(false);
        return;
      }

      // Add empty assistant message for streaming
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          const data = trimmedLine.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // Skip custom model_info events
            if (parsed.type === 'model_info') continue;
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              appendToLastMessage(content);
            }
          } catch {
            // Incomplete JSON — will be in next chunk
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6).trim();
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type !== 'model_info') {
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) appendToLastMessage(content);
            }
          } catch { /* ignore */ }
        }
      }

      // Check if we got any content
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, content: 'Не удалось получить ответ. Попробуйте ещё раз.' };
          setLastError(true);
          return updated;
        }
        return prev;
      });

    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Произошла ошибка сети. Проверьте подключение и попробуйте снова.' }]);
      setLastError(true);
    } finally {
      if (currentAbortController === controller) {
        currentAbortController = null;
      }
      setIsLoading(false);
    }
  }, [isLoading, agent.systemPrompt, messages, appendToLastMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClose = useCallback(() => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    onClose();
    setIsMinimized(false);
    setIsExpanded(false);
  }, [onClose]);

  const handleRetry = useCallback(() => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Remove the error assistant message
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') updated.pop();
        return updated;
      });
      sendMessage(lastUserMsg.content, true);
    }
  }, [messages, sendMessage]);

  if (!isOpen) return null;

  // Minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-24 right-4 sm:right-6 z-50 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={() => setIsMinimized(false)} className="group relative focus:outline-none">
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
    <div className={`fixed z-50 flex flex-col bg-slate-950 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'sm:bottom-4 sm:right-4 sm:top-4 sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-2rem)] max-sm:inset-2 max-sm:max-h-[calc(100vh-1rem)]' : 'sm:bottom-20 sm:right-6 sm:w-[400px] sm:max-h-[580px] max-sm:inset-x-3 max-sm:bottom-20 max-sm:top-auto max-sm:max-h-[70vh]'} animate-in slide-in-from-bottom-4 fade-in duration-200`}>
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
            <button onClick={() => setIsExpanded(prev => !prev)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors" aria-label={isExpanded ? 'Свернуть окно' : 'Развернуть окно'}>
              {isExpanded ? <Shrink className="h-3.5 w-3.5 text-slate-400" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-400" />}
            </button>
            <button onClick={() => setIsMinimized(true)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors" aria-label="Свернуть">
              <Minimize2 className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button onClick={handleClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors" aria-label="Закрыть">
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
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
            <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mb-4">{agent.greeting}</p>
            <div className="w-full max-w-[280px] space-y-1.5">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Попробуйте спросить</p>
              {agent.suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} disabled={isLoading} className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-700/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-violet-600' : `bg-gradient-to-br ${agent.gradient}`}`}>
                  {msg.role === 'user' ? <span className="text-[10px] text-white font-bold">Я</span> : <Sparkles className="w-3 h-3 text-white" />}
                </div>
                <div className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-violet-600/20 text-violet-100' : 'bg-slate-800/50 text-slate-300'}`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse pl-8">
                <Sparkles className="w-3 h-3" />
                <span>Думаю...</span>
              </div>
            )}
            {/* Retry button on error */}
            {!isLoading && lastError && (
              <div className="flex justify-center pt-1">
                <button onClick={handleRetry} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors text-slate-400 hover:text-slate-200">
                  <RefreshCw className="w-3 h-3" />
                  Попробовать снова
                </button>
              </div>
            )}
            {/* Suggestions after response */}
            {!isLoading && !lastError && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
              <div className="pt-2 space-y-1">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Ещё вопросы</p>
                {agent.suggestions.slice(0, 2).map((s, i) => (
                  <button key={`f-${i}`} onClick={() => sendMessage(s)} className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors text-slate-500 hover:text-slate-300">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задайте вопрос по теме..."
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
