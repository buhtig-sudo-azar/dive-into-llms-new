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
  Settings, 
  Activity, 
  BookOpen, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

// Import our interactive chapter components
import TokenizerChapter from './components/TokenizerChapter';
import EmbeddingsChapter from './components/EmbeddingsChapter';
import AttentionChapter from './components/AttentionChapter';
import SamplingChapter from './components/SamplingChapter';
import RAGChapter from './components/RAGChapter';
import AgentMCPChapter from './components/AgentMCPChapter';

type ActiveTab = 'tokenizer' | 'embeddings' | 'attention' | 'sampling' | 'rag' | 'agent-mcp';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tokenizer');
  const [serverState, setServerState] = useState<{ connected: boolean; hasApiKey: boolean }>({
    connected: false,
    hasApiKey: false,
  });

  // Verify the state of the backend server and Gemini API configurations
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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-violet-500/30">
      
      {/* Prime Header navigation bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl shadow-lg ring-2 ring-violet-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold tracking-tight text-base text-white font-sans uppercase">
                  Dive into LLMs
                </h1>
                <span className="bg-violet-500/10 text-violet-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-violet-500/20 font-bold uppercase tracking-wider animate-pulse">
                  Интерактивный симулятор
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Визуальное руководство по внутренним механизмам больших языковых моделей
              </p>
            </div>
          </div>

          {/* Connection diagnostics states */}
          <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 rounded-lg border border-slate-850">
              {serverState.connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold font-mono">SERVER LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500 font-bold font-mono">FALLBACK ACTIVE</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 rounded-lg border border-slate-850">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-slate-300 font-sans">
                Gemini API: {serverState.hasApiKey ? (
                  <span className="text-violet-400 font-bold">Подключен (Real)</span>
                ) : (
                  <span className="text-slate-400">Симуляция (Local)</span>
                )}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Prime Ribbon navigation bar matching guidelines (No unrequested sidebars) */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-inner flex flex-wrap gap-1.5 justify-center md:justify-between items-center">
          
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('tokenizer')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'tokenizer'
                  ? 'bg-violet-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              1. Токенизация
            </button>
            <button
              onClick={() => setActiveTab('embeddings')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'embeddings'
                  ? 'bg-teal-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              2. Эмбеддинги
            </button>
            <button
              onClick={() => setActiveTab('attention')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'attention'
                  ? 'bg-indigo-650 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              3. Самовнимание
            </button>
            <button
              onClick={() => setActiveTab('sampling')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'sampling'
                  ? 'bg-amber-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              4. Сэмплирование
            </button>
            <button
              onClick={() => setActiveTab('rag')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'rag'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Database className="w-4 h-4" />
              5. Поиск RAG
            </button>
            <button
              onClick={() => setActiveTab('agent-mcp')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'agent-mcp'
                  ? 'bg-purple-650 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Network className="w-4 h-4" />
              6. Агенты & MCP
            </button>
          </div>

          {/* Interactive handbook banner link */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-800">
            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
            <span>Разделов: 6 / Платформа: Dive-into-LLMs</span>
          </div>

        </div>

        {/* Dynamic Interactive Active Page Panel */}
        <div className="transition-all duration-300">
          {activeTab === 'tokenizer' && <TokenizerChapter />}
          {activeTab === 'embeddings' && <EmbeddingsChapter />}
          {activeTab === 'attention' && <AttentionChapter />}
          {activeTab === 'sampling' && <SamplingChapter />}
          {activeTab === 'rag' && <RAGChapter />}
          {activeTab === 'agent-mcp' && <AgentMCPChapter />}
        </div>

      </main>

      {/* Footer credit labels */}
      <footer className="border-t border-slate-850 bg-slate-950 py-5 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Интерактивный симулятор «Dive into LLMs» выполнен на React 19 & Tailwind CSS</span>
          </div>
          <div className="text-slate-400 font-medium">
            Ссылка на оригинальный проект: <a href="https://github.com/buhtig-sudo-azar/dive-into-llms" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline hover:text-violet-300">github.com/buhtig-sudo-azar/dive-into-llms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
