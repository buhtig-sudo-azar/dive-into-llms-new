import { useState, useEffect, useRef } from 'react';
import { useModelStore } from '../store/model-store';
import type { FreeModel, ModelRateLimit } from '../store/model-store';
import { ApiTokenInput } from './ApiTokenInput';
import {
  Check,
  ChevronDown,
  Cpu,
  Loader2,
  Sparkles,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  AlertCircle,
  Key,
  Search,
  X,
} from 'lucide-react';

function RateLimitIndicator({ rateLimit }: { rateLimit?: ModelRateLimit }) {
  if (!rateLimit || !rateLimit.checkedAt) {
    return (
      <span className="shrink-0 flex items-center gap-1 cursor-help" title="Статус не проверен">
        <span className="w-2 h-2 rounded-full bg-slate-600" />
      </span>
    );
  }

  if (rateLimit.available) {
    return (
      <span
        className="shrink-0 flex items-center gap-1 cursor-help"
        title={`Доступна${rateLimit.remaining != null ? `. Осталось: ${rateLimit.remaining}` : ''}${rateLimit.latency != null ? `. Задержка: ${rateLimit.latency}мс` : ''}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        {rateLimit.remaining != null && (
          <span className="text-[9px] text-slate-500 font-mono">{rateLimit.remaining}</span>
        )}
      </span>
    );
  }

  return (
    <span
      className="shrink-0 flex items-center gap-1 cursor-help"
      title={rateLimit.reason === 'rate_limited' ? 'Суточный лимит исчерпан' : rateLimit.reason === 'not_found' ? 'Модель не найдена' : 'Ошибка при проверке'}
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-[9px] text-red-500 font-medium">лимит</span>
    </span>
  );
}

export function ModelSelector() {
  const {
    currentModel,
    availableModels,
    isLoadingModels,
    isApplying,
    isCheckingAll,
    rateLimits,
    apiToken,
    setCurrentModel,
    fetchAvailableModels,
    checkAllModels,
    setIsApplying,
    _hydrate,
  } = useModelStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => { _hydrate(); }, [_hydrate]);

  useEffect(() => {
    if (open && availableModels.length === 0) {
      fetchAvailableModels();
    }
  }, [open, availableModels.length, fetchAvailableModels]);

  // Focus search when popover opens
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const applyModel = (model: string) => {
    setIsApplying(true);
    setCurrentModel(model);
    setOpen(false);
    setTimeout(() => setIsApplying(false), 300);
  };

  const handleCustomSubmit = () => {
    const model = customInput.trim();
    if (!model) return;
    applyModel(model);
    setCustomInput('');
    setShowCustom(false);
  };

  const handleCheckAll = async () => {
    await checkAllModels();
  };

  // Get current model label
  const currentModelData = availableModels.find((m) => m.id === currentModel);
  const currentLabel = currentModelData?.label || currentModel.split('/').pop() || currentModel;
  const isKnownModel = availableModels.some((m) => m.id === currentModel);
  const currentRateLimit = rateLimits[currentModel];
  const limitedCount = Object.values(rateLimits).filter(r => !r.available && r.checkedAt).length;

  // Filter models by search
  const filteredModels = search
    ? availableModels.filter(m =>
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
      )
    : availableModels;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={isApplying}
        className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-700/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-slate-300 disabled:opacity-50"
      >
        {isApplying ? (
          <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
        ) : currentRateLimit && !currentRateLimit.available && currentRateLimit.checkedAt ? (
          <AlertCircle className="h-3 w-3 text-red-500" />
        ) : (
          <Cpu className="h-3 w-3 text-violet-400" />
        )}
        <span className="max-w-[80px] sm:max-w-[140px] truncate">
          {isApplying ? 'Применение...' : currentLabel}
        </span>
        {!isKnownModel && (
          <span className="text-[9px] px-1 py-0 h-4 rounded bg-slate-800 text-slate-500 border border-slate-700">
            custom
          </span>
        )}
        {apiToken && (
          <span className="text-[9px] px-1 py-0 h-4 rounded border border-emerald-500/30 text-emerald-500 flex items-center gap-0.5">
            <Key className="h-2 w-2" />свой
          </span>
        )}
        {limitedCount > 0 && (
          <span className="text-[9px] px-1 py-0 h-4 rounded bg-red-500/10 text-red-400 border border-red-500/30">
            {limitedCount} лимит
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-slate-500" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-slate-950 border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
            <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded-lg px-2.5 h-8 border border-slate-800 focus-within:border-violet-500/30">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск модели..."
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={handleCheckAll}
              disabled={isCheckingAll || isLoadingModels}
              className="h-8 px-2 text-[10px] gap-1 shrink-0 flex items-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              title="Проверить доступность всех моделей"
            >
              {isCheckingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Activity className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{isCheckingAll ? 'Проверка...' : 'Проверить'}</span>
            </button>
          </div>

          {/* Models list */}
          <div className="max-h-[280px] overflow-y-auto">
            {isLoadingModels && availableModels.length === 0 ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span className="text-sm text-slate-500">Загрузка моделей...</span>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">Модель не найдена</div>
            ) : (
              <div>
                {/* Free models header */}
                <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-950 z-10">
                  <Wifi className="h-3 w-3" />
                  <span>Бесплатные модели ({filteredModels.length})</span>
                </div>
                {filteredModels.map((model: FreeModel) => {
                  const rl = rateLimits[model.id];
                  return (
                    <button
                      key={model.id}
                      onClick={() => applyModel(model.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        currentModel === model.id ? 'bg-violet-500/5' : ''
                      }`}
                    >
                      <Check className={`h-3.5 w-3.5 shrink-0 ${currentModel === model.id ? 'text-violet-400' : 'opacity-0'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{model.label}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{model.id}</div>
                      </div>
                      <RateLimitIndicator rateLimit={rl} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom model section */}
            <div className="border-t border-slate-800">
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                <span>Своё</span>
              </div>
              {!showCustom ? (
                <button
                  onClick={() => { setShowCustom(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <WifiOff className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-sm text-slate-300">Вставить свою модель</span>
                </button>
              ) : (
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="vendor/model-name:free"
                      className="flex-1 h-8 text-xs font-mono bg-slate-900 border border-slate-700/50 rounded-lg px-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleCustomSubmit(); }
                      }}
                    />
                    <button
                      onClick={handleCustomSubmit}
                      disabled={!customInput.trim() || isApplying}
                      className="h-8 px-3 text-xs gap-1 shrink-0 flex items-center rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40"
                    >
                      {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Применить
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Формат: <code className="font-mono text-violet-400/80">провайдер/модель:free</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* API Token section */}
          <div className="px-3 py-2.5 border-t border-slate-800">
            <ApiTokenInput />
          </div>

          {/* Rate limit legend */}
          <div className="px-3 py-2 border-t border-slate-800">
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1" title="Доступна">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Доступна
              </span>
              <span className="flex items-center gap-1" title="Лимит исчерпан">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Лимит
              </span>
              <span className="flex items-center gap-1" title="Не проверена">
                <span className="w-2 h-2 rounded-full bg-slate-600" /> Не проверена
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
