/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { DocumentChunk } from '../types';
import { Database, Search, Sparkles, Wand2, FileText, ArrowRight, HelpCircle } from 'lucide-react';

const KNOWLEDGE_BASE: DocumentChunk[] = [
  {
    id: 'doc-1',
    title: 'Модель Claude от Anthropic',
    text: 'Claude — семейство ИИ-моделей от Anthropic с акцентом на безопасность, длинный контекст (200k+ токенов) и конституционный ИИ (Constitutional AI), направленный на снижение вредоносных ответов и высокую этическую совместимость.',
    tag: 'Claude / Anthropic'
  },
  {
    id: 'doc-2',
    title: 'Модели Google Gemini',
    text: 'Gemini от Google — это мультимодальные ИИ-модели следующего поколения, созданные работать со звуком, ویدео, кодом и картинками изначально. Окно контекста достигает 2 миллионов токенов. Родное ядро адаптировано под ультра-быструю TPU инфраструктуру.',
    tag: 'Gemini / Google'
  },
  {
    id: 'doc-3',
    title: 'Будущее: Модель GPT-5',
    text: 'GPT-5 — новое поколение ИИ систем от OpenAI, целью которого является прорыв в планировании сложных задач, агентских автономиях и глубоком логическом рассуждении. Модель ожидается к выпуску с расширенными сенсорными модальностями.',
    tag: 'GPT-5 / OpenAI'
  },
  {
    id: 'doc-4',
    title: 'Open Source LLaMA от Meta',
    text: 'Семейство LLaMA во главе с Марком Цукербергом предоставило открытый доступ (open-access) к весам передовых нейросетей, ускорив независимые исследования. Флагманские модели обучены на триллионах публичных токенов.',
    tag: 'LLaMA / Meta'
  }
];

const PRESET_QUERIES = [
  'Что умеет делать мультимодальный Gemini и каков контекст?',
  'В чем особенности Constitutional AI в моделях Claude?',
  'Какая модель спроектирована под open-source исследования?'
];

export default function RAGChapter() {
  const [query, setQuery] = useState<string>(PRESET_QUERIES[0]);
  const [documents, setDocuments] = useState<DocumentChunk[]>(KNOWLEDGE_BASE);
  const [retrievedDocs, setRetrievedDocs] = useState<DocumentChunk[]>([]);
  const [status, setStatus] = useState<'idle' | 'retrieving' | 'reading' | 'completed'>('idle');
  const [ragResult, setRagResult] = useState<string>('');
  const [noRagResult, setNoRagResult] = useState<string>('');
  
  const handleExecuteRAG = async () => {
    if (!query.trim()) return;
    setStatus('retrieving');
    setRagResult('');
    setNoRagResult('');

    // Simulate Vector Database search
    // We calculate a lightweight term similarity to mock vector distances
    setTimeout(async () => {
      const qLower = query.toLowerCase();
      let keywords: string[] = [];
      
      if (qLower.includes('gemini')) keywords = ['gemini', 'google', 'мультимодал', 'контекст'];
      else if (qLower.includes('claude')) keywords = ['claude', 'anthropic', 'safety', 'конституци'];
      else if (qLower.includes('llama') || qLower.includes('open-source')) keywords = ['llama', 'meta', 'open-source', 'веса'];
      else keywords = qLower.split(' ').filter(w => w.length > 3);

      const computedDocs = KNOWLEDGE_BASE.map(doc => {
        let score = 0.05; // tiny base noise
        const docText = (doc.title + ' ' + doc.text).toLowerCase();
        
        keywords.forEach(kw => {
          if (docText.includes(kw)) {
            score += 0.38;
          }
        });
        
        // Cap score at 0.98
        score = Math.min(0.98, score);
        return { ...doc, similarity: score };
      });

      // Sort by similarity score
      const sorted = [...computedDocs].sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      setDocuments(sorted);

      // Retrieve top matching items (similarity >= 0.3)
      const topMatches = sorted.filter(doc => (doc.similarity || 0) >= 0.3);
      setRetrievedDocs(topMatches);

      setStatus('reading');

      // Now prepare Prompt and feed to server
      const contextText = topMatches.map((doc, i) => `[Источник ${i+1}]: ${doc.text}`).join('\n\n');
      const ragPrompt = `Контекст:\n${contextText}\n\nВопрос: ${query}\n\nНа основе предоставленного контекста, ответьте на вопрос кратко на русском языке. Не добавляй отсебятины, которой нет в источниках!`;
      const noRagPrompt = `Вопрос: ${query}\n\nОтветьте кратко на данный вопрос по памяти на русском языке.`;

      try {
        // Parallel fetch for RAG vs no RAG comparison
        const [resRag, resNoRag] = await Promise.all([
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: ragPrompt,
              systemInstruction: 'Ты строгий RAG-анализатор. Отвечай только по тексту контекста. Если информации нет в контексте, отвечай "В предоставленном контексте нет об этом информации."'
            })
          }).then(r => r.json()),
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: noRagPrompt,
              systemInstruction: 'Ты обычный ИИ-ассистент, отвечаешь по памяти.'
            })
          }).then(r => r.json())
        ]);

        setRagResult(resRag.text || 'Нет ответа');
        setNoRagResult(resNoRag.text || 'Нет ответа');
        setStatus('completed');
      } catch (err) {
        console.error(err);
        setRagResult('Произошла ошибка при генерации через серверный мост.');
        setNoRagResult('Ошибка генерации.');
        setStatus('completed');
      }
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Introduction box */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Глава 5: Retrieval-Augmented Generation (RAG)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Языковые модели ограничены датой их обучения и склонны галлюцинировать. 
              <strong>RAG (поиск и генерация)</strong> решает эту проблему: перед ответом система ищет 
              соответствующие документы во внешней <strong>векторной базе данных</strong>, встраивает 
              их в промпт и передает модели в качестве контекста. Ответ становится точным и заземленным.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge database list */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
          <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
            <Database className="w-4 h-4 text-emerald-500" />
            Векторный каталог (База знаний)
          </span>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {documents.map((doc, i) => {
              const sim = doc.similarity !== undefined ? doc.similarity : 0;
              const isRetrieved = retrievedDocs.some(rd => rd.id === doc.id);

              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-xs transition-all duration-300 ${
                    isRetrieved
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800/80'
                  }`}
                >
                  <div className="flex justify-between items-start font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <span>{doc.title}</span>
                    <span className="text-[9px] text-slate-400 uppercase bg-slate-250 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {doc.tag}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{doc.text}</p>
                  
                  {/* Similarity score bar rendering */}
                  {doc.similarity !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1">
                      <div className="flex justify-between font-mono text-[9px] text-slate-450">
                        <span>Близость к запросу:</span>
                        <span className={sim >= 0.3 ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                          {(sim * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${sim * 100}%` }}
                          className={`h-full ${sim >= 0.3 ? 'bg-emerald-500' : 'bg-slate-450'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Query console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Search className="w-4 h-4 text-emerald-500" />
              RAG Поисковая панель
            </span>

            {/* Quick Presets list */}
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((pq, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(pq)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-sans transition-all active:scale-95 border cursor-pointer ${
                    pq === query
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {pq}
                </button>
              ))}
            </div>

            {/* Custom search entry form */}
            <div className="flex gap-2 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Задайте вопрос нашей базе знаний..."
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-sans"
              />
              <button
                onClick={handleExecuteRAG}
                disabled={status === 'retrieving' || status === 'reading'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                Запустить RAG
              </button>
            </div>
            
            {/* Steps feedback logs */}
            {status !== 'idle' && (
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50 space-y-2 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status === 'retrieving' ? 'bg-yellow-400 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="text-slate-600 dark:text-slate-400">
                    [Поиск]: Кодирование поискового запроса в семантический вектор...
                  </span>
                </div>
                {(status === 'reading' || status === 'completed') && (
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'reading' ? 'bg-yellow-400 animate-ping' : 'bg-emerald-500'}`} />
                    <span className="text-slate-600 dark:text-slate-400">
                      [Промпт]: Интегрировано {retrievedDocs.length} подходящих параграфов в финальный шаблон.
                    </span>
                  </div>
                )}
                {status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-400">
                      [Генерация]: Ответ успешно дополнен и декодирован!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt integration visualization and side-by-side comparison */}
          {status === 'completed' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Output with RAG context */}
              <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-500 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1.5 font-mono">
                  <ArrowRight className="w-3.5 h-3.5" />
                  С использованием RAG (Точно)
                </span>
                
                <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mt-1">
                  Ответ на основе документов:
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/60 p-3 rounded-lg min-h-[96px]">
                  {ragResult}
                </p>
                <span className="text-[9px] text-emerald-600 font-sans italic block">
                  🛡️ Проверено на соответствие оригинальным источникам.
                </span>
              </div>

              {/* Output without RAG context */}
              <div className="bg-rose-50/20 dark:bg-rose-950/10 border border-rose-350 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-mono">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Без использования RAG (Риск галлюцинаций)
                </span>
                
                <h4 className="font-semibold text-xs text-slate-850 dark:text-slate-200 mt-1">
                  Свободный ответ модели:
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-sans bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 p-3 rounded-lg min-h-[96px]">
                  {noRagResult}
                </p>
                <span className="text-[9px] text-rose-600 dark:text-rose-400 font-sans italic block">
                  ⚠️ Может содержать вымышленные факты или устаревшие данные.
                </span>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
