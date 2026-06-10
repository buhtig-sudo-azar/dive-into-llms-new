import { useState, useRef, useEffect } from 'react';
import { Key, Eye, EyeOff, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useModelStore } from '../store/model-store';

export function ApiTokenInput() {
  const { apiToken, setApiToken, clearApiToken } = useModelStore();
  const [inputValue, setInputValue] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleSave = () => {
    const token = inputValue.trim();
    if (!token) return;
    setApiToken(token);
    setIsValid(null);
    setInputValue('');
    setIsExpanded(false);
  };

  const handleVerify = async () => {
    const token = apiToken;
    if (!token) return;

    setIsVerifying(true);
    setIsValid(null);

    try {
      const res = await fetch('/api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'moonshotai/kimi-k2.6:free', apiToken: token }),
      });

      const data = await res.json();
      setIsValid(data.available === true || data.reason === 'rate_limited');
    } catch {
      setIsValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = () => {
    clearApiToken();
    setIsValid(null);
  };

  const hasToken = apiToken.length > 0;
  const maskedToken = hasToken
    ? apiToken.slice(0, 6) + '...' + apiToken.slice(-4)
    : '';

  return (
    <div className="space-y-2">
      {/* No token, collapsed */}
      {!isExpanded && !hasToken && (
        <div className="space-y-1.5">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center gap-2 h-8 text-xs font-medium rounded-lg border border-dashed border-violet-500/30 hover:border-violet-500/50 hover:bg-violet-500/5 text-violet-400 transition-colors"
          >
            <Key className="h-3.5 w-3.5" />
            Свой токен OpenRouter
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            Ключ бесплатно:{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>
      )}

      {/* Has token, collapsed */}
      {!isExpanded && hasToken && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-700/50 bg-slate-900 text-xs">
            <Key className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="font-mono text-slate-400 truncate flex-1">
              {showToken ? apiToken : maskedToken}
            </span>
            <button
              onClick={() => setShowToken(!showToken)}
              className="p-0.5 hover:text-slate-200 transition-colors text-slate-500"
            >
              {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
            title="Проверить токен"
          >
            {isVerifying ? (
              <span className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : isValid === true ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : isValid === false ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5 text-slate-600" />
            )}
          </button>
          <button
            onClick={handleRemove}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 hover:text-red-400 transition-colors text-slate-500"
            title="Удалить токен"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Expanded input */}
      {isExpanded && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="sk-or-v1-..."
              type={showToken ? 'text' : 'password'}
              className="flex-1 h-8 text-xs font-mono bg-slate-900 border border-slate-700/50 rounded-lg px-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
                if (e.key === 'Escape') { setIsExpanded(false); setInputValue(''); }
              }}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
            >
              {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!inputValue.trim()}
              className="h-7 px-3 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Key className="h-3 w-3" />
              Сохранить
            </button>
            <button
              onClick={() => { setIsExpanded(false); setInputValue(''); }}
              className="h-7 px-3 text-xs font-medium rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
            >
              Отмена
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Токен хранится только в вашем браузере. Получить бесплатно:{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              openrouter.ai/keys
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
