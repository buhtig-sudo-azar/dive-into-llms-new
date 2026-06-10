/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Eye, Settings, HelpCircle, Layers, Zap } from 'lucide-react';

interface SentenceConfig {
  english: string;
  russian: string;
  tokens: string[];
  attentionMaps: Record<number, Record<number, number>>; // mapping hoveredToken -> targetToken -> weight
}

const SAMPLE_SENTENCES: SentenceConfig[] = [
  {
    english: "The bank of the river is muddy but the bank manages money.",
    russian: "Берег реки покрыт грязью, но банк управляет деньгами.",
    tokens: ["The", "bank₁", "of", "the", "river", "is", "muddy", "but", "the", "bank₂", "manages", "money"],
    attentionMaps: {
      1: { 1: 0.12, 2: 0.04, 3: 0.18, 4: 0.28, 5: 0.14, 6: 0.16, 7: 0.02, 8: 0.01, 9: 0.02, 10: 0.01 }, // bank₁ -> "river", "muddy"
      4: { 0: 0.04, 1: 0.22, 2: 0.08, 3: 0.12, 4: 0.35, 5: 0.10, 6: 0.09 }, // river -> attends mainly to bank₁ / itself
      9: { 0: 0.01, 1: 0.02, 6: 0.01, 7: 0.05, 8: 0.11, 9: 0.18, 10: 0.31, 11: 0.31 }, // bank₂ -> "manages", "money"
      11: { 8: 0.10, 9: 0.45, 10: 0.30, 11: 0.15 } // money -> "bank₂", "manages"
    }
  },
  {
    english: "The organ makes music, but the human organ is complex.",
    russian: "Музыкальный орган издает звуки, а человеческий орган устроен сложно.",
    tokens: ["The", "organ₁", "makes", "music", "but", "the", "human", "organ₂", "is", "complex"],
    attentionMaps: {
      1: { 1: 0.15, 2: 0.25, 3: 0.48, 0: 0.04, 4: 0.08 }, // organ₁ -> "makes", "music"
      3: { 1: 0.38, 2: 0.22, 3: 0.40 }, // music -> "organ₁", "makes"
      6: { 6: 0.22, 7: 0.55, 8: 0.10, 9: 0.13 }, // human -> "organ₂"
      7: { 5: 0.05, 6: 0.38, 7: 0.15, 8: 0.14, 9: 0.28 } // organ₂ -> "human", "complex"
    }
  }
];

export default function AttentionChapter() {
  const [selectedSentIndex, setSelectedSentIndex] = useState<number>(0);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(1); // default hover on first homonym
  const [mathStage, setMathStage] = useState<'dot-product' | 'softmax' | 'output'>('dot-product');

  const activeSentence = SAMPLE_SENTENCES[selectedSentIndex];

  // Derive attention lines weights based on hover
  const attentionWeights = useMemo(() => {
    if (hoveredTokenIndex === null) return {};
    
    // Look up attention maps. If exact index is not configured, generate deterministic contextual ones for illustration
    const configuredMap = activeSentence.attentionMaps[hoveredTokenIndex];
    if (configuredMap) return configuredMap;

    const genMap: Record<number, number> = {};
    let sum = 0;
    activeSentence.tokens.forEach((_, idx) => {
      // Create bells curves around current token
      const dist = Math.abs(idx - hoveredTokenIndex);
      const rawVal = Math.exp(-dist / 2);
      genMap[idx] = rawVal;
      sum += rawVal;
    });
    // scale to sum up to 1.0
    activeSentence.tokens.forEach((_, idx) => {
      genMap[idx] = Number((genMap[idx] / sum).toFixed(2));
    });
    return genMap;
  }, [activeSentence, hoveredTokenIndex]);

  // Query, Key, Value visual weights simulation for active hovered item
  const mathValues = useMemo(() => {
    const word = hoveredTokenIndex !== null ? activeSentence.tokens[hoveredTokenIndex] : '';
    // Let's create reproducible mock vectors
    const qHash = (word.length * 3) % 10;
    const qVector = [qHash / 10, (10 - qHash) / 10, 0.4, -0.2].map(v => Number(v.toFixed(1)));
    
    return {
      word,
      query: qVector,
      keys: activeSentence.tokens.map((tok, i) => {
        const hash = (tok.length * (i + 5)) % 10;
        return [hash / 10, -0.3, (10 - hash) / 10, 0.1].map(v => Number(v.toFixed(1)));
      })
    };
  }, [activeSentence, hoveredTokenIndex]);

  return (
    <div className="space-y-6">
      {/* Introduction box */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-950/50 rounded-lg text-violet-600 dark:text-violet-400">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Глава 3: Механизм внимания (Self-Attention)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Механизм Self-Attention (самовнимание) позволяет каждому слову в предложении оценивать важность других слов. 
              Благодаря этому модель понимает контекст омонимов: например, слово <strong>«орган»</strong> в сочетании с 
              «музыкальный» направляет энергию внимания на инструмент, а рядом с «человеческий» переключается на биологию.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive connection wires box */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 gap-3">
              <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-500 animate-pulse" />
                Карта связей внимания (Проводник)
              </span>
              
              {/* Select sentences */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg gap-1">
                <button
                  onClick={() => { setSelectedSentIndex(0); setHoveredTokenIndex(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedSentIndex === 0
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  Разрез «Река vs Банк»
                </button>
                <button
                  onClick={() => { setSelectedSentIndex(1); setHoveredTokenIndex(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedSentIndex === 1
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  Разрез «Музыка vs Анатомия»
                </button>
              </div>
            </div>

            {/* Sub-label showing the translation */}
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-100/30 dark:border-rose-950/40 mb-5 font-medium leading-relaxed">
              <strong>🇷🇺 Проверяемый контекст:</strong> {activeSentence.russian}
            </p>

            {/* Token nodes diagram rendering linear links */}
            <div className="relative border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-905 p-6 md:p-8 rounded-xl h-[280px] flex flex-col justify-between overflow-hidden">
              
              {/* SVG Link wires overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {hoveredTokenIndex !== null && activeSentence.tokens.map((_, idx) => {
                  const weight = attentionWeights[idx] || 0;
                  if (weight < 0.02) return null;

                  // Define dynamic curve paths from active hovered index to target node index
                  // We can anchor starting at bottom center and connecting to top center
                  const elemStart = document.getElementById(`tok-node-${hoveredTokenIndex}`);
                  const elemEnd = document.getElementById(`tok-node-${idx}`);
                  const parentDiv = document.getElementById(`tok-canvas-container`);

                  if (elemStart && elemEnd && parentDiv) {
                    const rectStart = elemStart.getBoundingClientRect();
                    const rectEnd = elemEnd.getBoundingClientRect();
                    const parentRect = parentDiv.getBoundingClientRect();

                    const xA = rectStart.left + rectStart.width / 2 - parentRect.left;
                    const yA = rectStart.top - parentRect.top;
                    const xB = rectEnd.left + rectEnd.width / 2 - parentRect.left;
                    const yB = rectEnd.top + rectEnd.height - parentRect.top;

                    // Standard quadratic bezier curves
                    const controlX = (xA + xB) / 2;
                    const controlY = Math.min(yA, yB) - 40 - Math.abs(xA - xB) * 0.15;

                    return (
                      <g key={idx}>
                        <path
                          d={`M ${xA} ${yA} Q ${controlX} ${controlY} ${xB} ${yB}`}
                          fill="none"
                          className="stroke-violet-550 dark:stroke-violet-400 transition-all duration-300"
                          strokeWidth={weight * 8 + 0.5}
                          strokeOpacity={Math.max(0.12, weight * 0.95)}
                        />
                        <text
                          x={controlX}
                          y={controlY + 12}
                          className="fill-violet-600 dark:fill-violet-300 font-mono text-[9px] font-bold"
                          textAnchor="middle"
                        >
                          {(weight * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}
              </svg>

              {/* Node Placement Rows */}
              <div id="tok-canvas-container" className="w-full h-full flex flex-col justify-between py-2 z-10">
                {/* Target Nodes row */}
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                  {activeSentence.tokens.map((tok, idx) => {
                    const weight = attentionWeights[idx] || 0;
                    return (
                      <div
                        id={`tok-node-${idx}`}
                        key={idx}
                        style={{ opacity: hoveredTokenIndex === null ? 1 : Math.max(0.4, weight * 2) }}
                        className={`px-2.5 py-1 text-xs font-mono rounded border transition-all ${
                          weight > 0.18
                            ? 'bg-violet-600 border-violet-750 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        {tok}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {hoveredTokenIndex !== null && (
                    <span>Как слово «{activeSentence.tokens[hoveredTokenIndex]}» видит окружение</span>
                  )}
                </div>

                {/* Sender/Queries Row */}
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                  {activeSentence.tokens.map((tok, idx) => {
                    const isActive = hoveredTokenIndex === idx;
                    return (
                      <button
                        onMouseEnter={() => setHoveredTokenIndex(idx)}
                        key={idx}
                        className={`px-3 py-1.5 text-xs font-sans font-semibold rounded-lg border transition-all active:scale-95 duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-violet-100 dark:bg-violet-950/60 border-violet-500 text-violet-700 dark:text-violet-350 shadow-sm font-bold scale-105'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-800'
                        }`}
                      >
                        {tok}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center mt-3">
            💡 Наведите курсор на синие нижние кнопки, чтобы сменить фокус на Query (Запрос) и увидеть соответствующее распределение веса.
          </p>
        </div>

        {/* Matrix Math column */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
              <Settings className="w-4 h-4 text-violet-500" />
              Алгебра внимания (Q, K, V)
            </span>

            {/* Stage selectors */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <button
                onClick={() => setMathStage('dot-product')}
                className={`py-1 text-[10px] font-bold rounded text-center transition-all ${
                  mathStage === 'dot-product'
                    ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Скаляр (Q·Kᵀ)
              </button>
              <button
                onClick={() => setMathStage('softmax')}
                className={`py-1 text-[10px] font-bold rounded text-center transition-all ${
                  mathStage === 'softmax'
                    ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Softmax
              </button>
              <button
                onClick={() => setMathStage('output')}
                className={`py-1 text-[10px] font-bold rounded text-center transition-all ${
                  mathStage === 'output'
                    ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Выход (Value)
              </button>
            </div>

            {/* Stage representation container */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 min-h-[220px]">
              {mathStage === 'dot-product' && (
                <div className="space-y-3 font-sans">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Шаг 1: Скалярный поиск по сходству
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Query вектор (A) умножается покоординатно на Key векторы (B). Большое произведение означает высокую ценность связи.
                  </p>
                  
                  {/* Visualizing vectors */}
                  <div className="space-y-2 text-[10px] font-mono select-none">
                    <div className="flex items-center gap-2 bg-violet-50/50 dark:bg-violet-950/20 p-1.5 rounded">
                      <span className="font-bold text-violet-500 w-16">Query ({mathValues.word}):</span>
                      <span className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">
                        [{mathValues.query.join(', ')}]
                      </span>
                    </div>

                    <div className="text-slate-400 font-bold px-4">×</div>

                    <div className="max-h-[100px] overflow-y-auto space-y-1">
                      {activeSentence.tokens.slice(0, 5).map((tok, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-1 hover:bg-slate-200/30 rounded">
                          <span className="text-emerald-500 font-bold w-16 text-ellipsis overflow-hidden">{tok}:</span>
                          <span className="text-slate-500 px-1.5 py-0.5 bg-white dark:bg-slate-950 rounded border border-slate-200/40 dark:border-slate-800">
                            [{mathValues.keys[idx]?.join(', ')}]
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mathStage === 'softmax' && (
                <div className="space-y-3 font-sans">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Шаг 2: Нормализация Softmax
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Все скалярные сходства делятся на размерность √d_k (квадратный корень из размерности ключей) и пропускаются через экспоненту, чтобы получить вероятностное распределение весов на сумму 1.0.
                  </p>
                  
                  {/* Softmax bar list */}
                  <div className="space-y-2 font-mono">
                    {activeSentence.tokens.slice(0, 6).map((tok, idx) => {
                      const weight = attentionWeights[idx] || 0.05;
                      return (
                        <div key={idx} className="space-y-1 text-[11px]">
                          <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                            <span>{tok}</span>
                            <span className="text-violet-600 dark:text-violet-400">{(weight * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${weight * 100}%` }}
                              className="h-full bg-violet-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mathStage === 'output' && (
                <div className="space-y-3 font-sans">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Шаг 3: Взвешенный выход (Value)
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Модель берет исходные значения Value-векторов слов и объединяет их, умножая на соответствующие веса Softmax. 
                    Полученное состояние передает смысл слова, «обогащенный» нужным контекстом.
                  </p>
                  
                  <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 text-[10px] p-2.5 rounded border border-amber-100/60 dark:border-amber-900/60 font-mono select-none">
                    Output = Sum(Weight_i × Value_i)
                    <div className="mt-1.5 text-slate-700 dark:text-slate-300 font-bold">
                      Вектор контекста собран!
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Math info annotation footer */}
            <div className="text-[10px] text-slate-450 leading-relaxed font-sans bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                Формула Внимания
              </div>
              <code className="block bg-slate-200/80 dark:bg-slate-900 px-2 py-1.5 rounded text-[11px] font-mono text-violet-600 dark:text-violet-400 text-center font-bold">
                Softmax( Q Kᵀ / √d_k ) V
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
