/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Terminal, 
  Layers, 
  Compass, 
  Eye, 
  Sliders, 
  Database, 
  Network, 
  Sparkles, 
  Activity, 
  BookOpen, 
  Wifi, 
  WifiOff,
  MessageCircle
} from 'lucide-react';

import TokenizerChapter from './components/TokenizerChapter';
import EmbeddingsChapter from './components/EmbeddingsChapter';
import AttentionChapter from './components/AttentionChapter';
import SamplingChapter from './components/SamplingChapter';
import RAGChapter from './components/RAGChapter';
import AgentMCPChapter from './components/AgentMCPChapter';
import ChatPopup from './components/ChatPopup';
import { ModelSelector } from './components/ModelSelector';
import { useModelStore } from './store/model-store';

type ActiveTab = 'tokenizer' | 'embeddings' | 'attention' | 'sampling' | 'rag' | 'agent-mcp';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tokenizer');
  const [chatOpen, setChatOpen] = useState(false);
  const [serverState, setServerState] = useState<{ connected: boolean; hasApiKey: boolean }>({
    connected: false,
    hasApiKey: false,
  });

  const { _hydrate, apiToken } = useModelStore();

  useEffect(() => {
    _hydrate();
  }, [_hydrate]);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.status === 'ok') {
          setServerState({ connected: true, hasApiKey: data.hasApiKey });
        }
      } catch (err) {
        console.warn('Backend server is starting up or in static fallback mode.', err);
        setServerState({ connected: false, hasApiKey: false });
      }
    };
    checkServerHealth();
  }, []);

  // Determine if user has their own key or server key
  const hasKey = apiToken.length > 0 || serverState.hasApiKey;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-violet-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-3 sm:px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-lg sm:rounded-xl shadow-lg ring-2 ring-violet-500/20">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold tracking-tight text-sm sm:text-base text-white font-sans uppercase">
                  LLM Explorer
                </h1>
                <span className="bg-violet-500/10 text-violet-400 text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full border border-violet-500/20 font-bold uppercase tracking-wider animate-pulse">
                  Симулятор
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                Визуальное руководство по внутренним механизмам LLM
              </p>
            </div>
          </div>

          {/* Right side: Model selector + Connection status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Model Selector */}
            <ModelSelector />

            {/* Connection status */}
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs bg-slate-900 border border-slate-800 p-1 sm:p-1.5 rounded-lg sm:rounded-xl">
              <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 bg-slate-950 rounded-md sm:rounded-lg border border-slate-800">
                {serverState.connected ? (
                  <>
                    <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-bold font-mono hidden sm:inline">SERVER LIVE</span>
                    <span className="text-emerald-500 font-bold font-mono sm:hidden">LIVE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                    <span className="text-amber-500 font-bold font-mono hidden sm:inline">FALLBACK</span>
                    <span className="text-amber-500 font-bold font-mono sm:hidden">SIM</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 bg-slate-950 rounded-md sm:rounded-lg border border-slate-800">
                <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-400" />
                <span className="text-slate-400 font-sans">
                  {hasKey ? (
                    <span className="text-violet-400 font-bold">OpenRouter</span>
                  ) : (
                    <span className="text-slate-500">No Key</span>
                  )}
                </span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* Navigation tabs */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-inner">
          <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center items-center">
            <TabButton
              active={activeTab === 'tokenizer'}
              onClick={() => setActiveTab('tokenizer')}
              activeClass="bg-violet-600"
              icon={<Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="1. Токенизация"
              shortLabel="1. Токены"
            />
            <TabButton
              active={activeTab === 'embeddings'}
              onClick={() => setActiveTab('embeddings')}
              activeClass="bg-teal-600"
              icon={<Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="2. Эмбеддинги"
              shortLabel="2. Эмбед."
            />
            <TabButton
              active={activeTab === 'attention'}
              onClick={() => setActiveTab('attention')}
              activeClass="bg-indigo-600"
              icon={<Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="3. Самовнимание"
              shortLabel="3. Attention"
            />
            <TabButton
              active={activeTab === 'sampling'}
              onClick={() => setActiveTab('sampling')}
              activeClass="bg-amber-600"
              icon={<Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="4. Сэмплирование"
              shortLabel="4. Сэмп."
            />
            <TabButton
              active={activeTab === 'rag'}
              onClick={() => setActiveTab('rag')}
              activeClass="bg-emerald-600"
              icon={<Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="5. Поиск RAG"
              shortLabel="5. RAG"
            />
            <TabButton
              active={activeTab === 'agent-mcp'}
              onClick={() => setActiveTab('agent-mcp')}
              activeClass="bg-purple-600"
              icon={<Network className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="6. Агенты & MCP"
              shortLabel="6. Агенты"
            />

            {/* Desktop badge */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-800 ml-auto">
              <BookOpen className="w-3.5 h-3.5 text-violet-400" />
              <span>6 разделов</span>
            </div>
          </div>
        </div>

        {/* Active chapter */}
        <div className="transition-all duration-300">
          {activeTab === 'tokenizer' && <TokenizerChapter />}
          {activeTab === 'embeddings' && <EmbeddingsChapter />}
          {activeTab === 'attention' && <AttentionChapter />}
          {activeTab === 'sampling' && <SamplingChapter />}
          {activeTab === 'rag' && <RAGChapter />}
          {activeTab === 'agent-mcp' && <AgentMCPChapter />}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 sm:py-5 px-3 sm:px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Интерактивный симулятор «LLM Explorer»</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">|</span>
            <span className="font-semibold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent text-sm">
              Создатель AZAR
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">React 19 & Tailwind CSS</span>
          </div>
        </div>
      </footer>

      {/* Floating chat button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all flex items-center justify-center group"
          aria-label="Открыть чат с AI-наставником"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
        </button>
      )}

      {/* Chat popup */}
      <ChatPopup
        activeTab={activeTab}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

    </div>
  );
}

// Responsive tab button component
function TabButton({
  active,
  onClick,
  activeClass,
  icon,
  label,
  shortLabel,
}: {
  active: boolean;
  onClick: () => void;
  activeClass: string;
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 sm:px-3 md:px-3.5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
        active
          ? `${activeClass} text-white shadow-md font-bold`
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );
}
