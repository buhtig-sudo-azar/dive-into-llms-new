/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, FormEvent } from 'react';
import { EmbeddingPoint } from '../types';
import { Target, Search, RefreshCw, Compass, PlusCircle, HelpCircle } from 'lucide-react';

const INITIAL_POINTS: EmbeddingPoint[] = [
  // Fruits
  { word: 'яблоко', x: -0.65, y: -0.40, category: 'fruits' },
  { word: 'банан', x: -0.50, y: -0.55, category: 'fruits' },
  { word: 'груша', x: -0.58, y: -0.46, category: 'fruits' },
  
  // Vector Math concepts (Gender clusters)
  { word: 'мужчина', x: 0.15, y: 0.12, category: 'vector-math' },
  { word: 'женщина', x: 0.32, y: 0.28, category: 'vector-math' },
  { word: 'король', x: 0.22, y: 0.44, category: 'vector-math' },
  { word: 'королева', x: 0.38, y: 0.58, category: 'vector-math' },

  // Technology
  { word: 'компьютер', x: 0.70, y: -0.55, category: 'technology' },
  { word: 'сервер', x: 0.78, y: -0.65, category: 'technology' },
  { word: 'программист', x: 0.62, y: -0.44, category: 'technology' },

  // Animals
  { word: 'собака', x: -0.15, y: -0.22, category: 'animals' },
  { word: 'кошка', x: -0.05, y: -0.15, category: 'animals' },
  { word: 'тигр', x: -0.22, y: -0.32, category: 'animals' },
];

export default function EmbeddingsChapter() {
  const [points, setPoints] = useState<EmbeddingPoint[]>(INITIAL_POINTS);
  const [customWord, setCustomWord] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');
  
  // For Distance calculator
  const [selectedWordA, setSelectedWordA] = useState<string>('король');
  const [selectedWordB, setSelectedWordB] = useState<string>('королева');

  // Compute mock or real Cosine similarity between two words
  const computedSimilarity = useMemo(() => {
    const ptA = points.find(p => p.word === selectedWordA);
    const ptB = points.find(p => p.word === selectedWordB);
    
    if (!ptA || !ptB) return 0;

    // If we have actual high-D embeddings, we calculate real cosine dot product!
    if (ptA.originalEmbedding && ptB.originalEmbedding) {
      const vecA = ptA.originalEmbedding;
      const vecB = ptB.originalEmbedding;
      
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Otherwise, calculate Euclidean similarity of their projected coordinates
    const distance = Math.sqrt(Math.pow(ptA.x - ptB.x, 2) + Math.pow(ptA.y - ptB.y, 2));
    // Normalize to 1 (near) down to 0 (far)
    const sim = Math.max(0, 1 - (distance / 1.5));
    // Add custom nuances for standard semantic matches
    if (ptA.category === ptB.category) {
      return Math.min(0.95, sim + 0.15);
    }
    return Math.max(0.05, sim - 0.2);
  }, [points, selectedWordA, selectedWordB]);

  // Handle requesting high-quality embeddings from Gemini
  const handleAddWord = async (e: FormEvent) => {
    e.preventDefault();
    const word = customWord.trim();
    if (!word) return;

    if (points.some(p => p.word.toLowerCase() === word.toLowerCase())) {
      setErrorText('Это слово уже на карте пространства!');
      return;
    }

    setLoading(true);
    setErrorText('');

    try {
      const res = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [word] })
      });
      const data = await res.json();
      
      if (data.success && data.embeddings && data.embeddings.length > 0) {
        const resultItem = data.embeddings[0];
        const newPoint: EmbeddingPoint = {
          word: resultItem.word,
          x: resultItem.x,
          y: resultItem.y,
          category: 'custom',
          originalEmbedding: resultItem.originalEmbedding
        };
        
        setPoints(prev => [...prev, newPoint]);
        setCustomWord('');
        // Automatically set selectors to compare new word!
        setSelectedWordB(newPoint.word);
      } else {
        throw new Error('Некорректный формат ответа');
      }
    } catch (err: any) {
      console.error(err);
      setErrorText('Не удалось рассчитать эмбеддинг. Отображаю локальную проекцию.');
      // Local fallback projection
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash += word.charCodeAt(i);
      }
      const fallbackPoint: EmbeddingPoint = {
        word,
        x: (Math.sin(hash) * 0.7),
        y: (Math.cos(hash) * 0.7),
        category: 'custom'
      };
      setPoints(prev => [...prev, fallbackPoint]);
      setCustomWord('');
      setSelectedWordB(fallbackPoint.word);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPoints = () => {
    setPoints(INITIAL_POINTS);
    setSelectedWordA('король');
    setSelectedWordB('королева');
    setErrorText('');
  };

  return (
    <div className="space-y-6">
      {/* Introduction box */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 dark:bg-teal-950/50 rounded-lg text-teal-600 dark:text-teal-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Глава 2: Пространство эмбеддингов (Embeddings)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Эмбеддинг — это волшебство перевода токенов в многомерные векторы (обычно от 768 до 1536 измерений). 
              В этом пространстве геометрическая близость векторов обозначает их <strong>смысловую близость</strong>. 
              Схожую тему можно представить как кластеры, а направление векторов позволяет совершать смысловую арифметику, 
              например: <span className="font-semibold text-slate-800 dark:text-slate-200">«Король — Мужчина + Женщина ≈ Королева»</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Coordinates Canvas Plot */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-500" />
                2D Семантическая проекция слов
              </span>
              <button
                onClick={handleResetPoints}
                className="text-xs text-slate-450 hover:text-slate-700 dark:hover:text-slate-350 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Сбросить карту
              </button>
            </div>

            {/* Embeddings graph canvas */}
            <div className="relative w-full aspect-square md:aspect-[4/3] bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal Center-Grid Axis */}
                <line x1="0" y1="50" x2="100" y2="50" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.4" strokeDasharray="2" />
                {/* Vertical Center-Grid Axis */}
                <line x1="50" y1="0" x2="50" y2="100" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.4" strokeDasharray="2" />
              </svg>

              {/* Plotted terms inside coordinate boundaries */}
              {points.map((pt, idx) => {
                // Convert coordinates from -1..1 values directly inside 0%..100% SVG box
                const posX = 50 + pt.x * 45; // scale factor
                const posY = 50 - pt.y * 42; // scale factor (invert Y for computer screen top is 0)

                let badgeColor = 'bg-rose-550 border-rose-600 text-rose-50';
                if (pt.category === 'fruits') badgeColor = 'bg-emerald-500 border-emerald-600 text-emerald-50';
                if (pt.category === 'technology') badgeColor = 'bg-sky-500 border-sky-600 text-sky-50';
                if (pt.category === 'animals') badgeColor = 'bg-amber-500 border-amber-600 text-amber-50';
                if (pt.category === 'custom') badgeColor = 'bg-violet-650 border-violet-750 text-violet-50';

                const isA = selectedWordA === pt.word;
                const isB = selectedWordB === pt.word;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      // Click alternates switching word A / word B for comparison logic!
                      if (selectedWordA !== pt.word) {
                        setSelectedWordB(selectedWordA);
                        setSelectedWordA(pt.word);
                      }
                    }}
                    style={{ left: `${posX}%`, top: `${posY}%` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-sans font-semibold rounded-full border shadow-sm transition-all duration-300 hover:scale-110 flex items-center gap-1.5 ${badgeColor} ${
                      isA ? 'ring-4 ring-offset-2 ring-teal-500 dark:ring-offset-slate-900 border-teal-500' : ''
                    } ${
                      isB ? 'ring-4 ring-offset-2 ring-purple-500 dark:ring-offset-slate-900 border-purple-500' : ''
                    }`}
                  >
                    {isA && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                    {isB && <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce" />}
                    {pt.word}
                  </button>
                );
              })}

              {/* Grid indicators */}
              <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 bg-white/80 dark:bg-slate-950/80 px-1.5 py-0.5 rounded leading-none">
                Y+ (Семантика абстрактного)
              </div>
              <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-400 bg-white/80 dark:bg-slate-950/80 px-1.5 py-0.5 rounded leading-none">
                X+ (Технологический вектор)
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-xs text-slate-500">
            💡 Нажмите на слова на карте, чтобы выбрать их для быстрого расчета схожести ниже. Категории: 
            <span className="text-emerald-500 font-semibold ml-1.5">Фрукты</span>, 
            <span className="text-rose-500 font-semibold ml-1.5">Векторный тест</span>, 
            <span className="text-sky-500 font-semibold ml-1.5">Технологии</span>, 
            <span className="text-amber-500 font-semibold ml-1.5">Животные</span>.
          </div>
        </div>

        {/* Math & Embed Additions Columns */}
        <div className="space-y-4">
          {/* Add a customized word using backend */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm">
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <PlusCircle className="w-4 h-4 text-purple-500" />
              Добавить слово в пространство
            </span>
            <form onSubmit={handleAddWord} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  placeholder="Например: кофе, космос..."
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 text-slate-805 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-sans"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1.5 p-1 bg-purple-550 hover:bg-purple-650 text-white rounded-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errorText && <p className="text-[10px] text-amber-500 font-sans">{errorText}</p>}
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Система отправит запрос на расчет оригинального вектора Gemini API и поместит его в оптимальное семантическое русло.
              </p>
            </form>
          </div>

          {/* Cosine Similarity gauge and formulas */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
              <Compass className="w-4 h-4 text-teal-500" />
              Косинусное сходство (Similarity)
            </span>

            {/* Select options */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Слово А</span>
                <select
                  value={selectedWordA}
                  onChange={(e) => setSelectedWordA(e.target.value)}
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                >
                  {points.map((p, i) => (
                    <option key={i} value={p.word}>{p.word}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Слово Б</span>
                <select
                  value={selectedWordB}
                  onChange={(e) => setSelectedWordB(e.target.value)}
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                >
                  {points.map((p, i) => (
                    <option key={i} value={p.word}>{p.word}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Similarity radial/gauge metric */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest text-center">Косинус угла θ (Сходство)</span>
              
              {/* Score bar gauge indicator */}
              <div className="w-full bg-slate-200 dark:bg-slate-850 h-3 rounded-full overflow-hidden relative flex items-center">
                <div
                  style={{ width: `${(computedSimilarity + 1) * 50}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-teal-500 rounded-full transition-all duration-500"
                />
                <div className="absolute left-1/2 w-0.5 h-full bg-slate-450 opacity-40 transform -translate-x-1/2" />
              </div>

              <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 leading-none">
                <span>Противоположно (-1)</span>
                <span>Идентично (+1)</span>
              </div>

              <div className="text-3xl font-bold font-mono text-slate-850 dark:text-slate-100 flex items-baseline">
                {computedSimilarity.toFixed(4)}
              </div>
            </div>

            {/* Scientific annotation explanation */}
            <div className="text-[11px] text-slate-450 leading-relaxed font-sans bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold mb-1 border-b border-slate-200/50 dark:border-slate-800/50 pb-1">
                <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                Что показывает Гаусс?
              </div>
              Косинусное сходство — это нормализованный скалярный объем произведения векторов A и B.
              Чем ближе значение к <strong>1.0000</strong>, тем теснее слова переплетены контекстной близостью.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
