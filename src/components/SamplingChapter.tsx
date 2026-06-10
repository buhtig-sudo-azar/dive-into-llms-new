/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { LogitValue } from '../types';
import { Sliders, RefreshCw, Sparkles, Play, Plus, BookOpen } from 'lucide-react';

const WORDS_POOL = [
  'строят', 'логически', 'понимают', 'генерируют', 'обучаются', 'кодируют', 
  'исследуют', 'создают', 'анализируют', 'преобразуют', 'предсказывают', 'структурируют'
];

interface LogitTemplate {
  token: string;
  baseLogit: number; // raw value
}

const CONSTANT_LOGITS: LogitTemplate[] = [
  { token: 'модели', baseLogit: 6.2 },
  { token: 'данные', baseLogit: 5.4 },
  { token: 'алгоритмы', baseLogit: 4.8 },
  { token: 'программы', baseLogit: 3.9 },
  { token: 'тексты', baseLogit: 3.1 },
  { token: 'нейросети', baseLogit: 2.5 },
  { token: 'результаты', baseLogit: 1.8 },
];

export default function SamplingChapter() {
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topK, setTopK] = useState<number>(5);
  const [topP, setTopP] = useState<number>(0.9);
  const [generatedText, setGeneratedText] = useState<string>('Крупные языковые');
  const [winnerLogit, setWinnerLogit] = useState<string | null>(null);

  // Math logic: Compute probabilities based on parameters
  const calculatedLogits = useMemo<LogitValue[]>(() => {
    // 1. Shift logits based on Temperature: scaled_logit = original_logit / Temp
    // Handle division by zero safely
    const tempValue = Math.max(0.1, temperature);
    const scaledLogits = CONSTANT_LOGITS.map(item => ({
      token: item.token,
      scaled: item.baseLogit / tempValue
    }));

    // 2. Softmax conversion
    // Subtract max scaled logit for numerical stability
    const maxScaled = Math.max(...scaledLogits.map(x => x.scaled));
    const exps = scaledLogits.map(x => Math.exp(x.scaled - maxScaled));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probs = scaledLogits.map((x, idx) => ({
      token: x.token,
      prob: exps[idx] / sumExps
    }));

    // 3. Form original base probs for comparison (using T=1.0)
    const baseExps = CONSTANT_LOGITS.map(x => Math.exp(x.baseLogit - Math.max(...CONSTANT_LOGITS.map(i => i.baseLogit))));
    const baseSum = baseExps.reduce((a, b) => a + b, 0);
    const baseProbs = CONSTANT_LOGITS.map((x, idx) => baseExps[idx] / baseSum);

    // Sort descending by probability
    const sortedProbs = probs
      .map((item, idx) => ({
        token: item.token,
        prob: item.prob,
        originalProb: baseProbs[idx]
      }))
      .sort((a, b) => b.prob - a.prob);

    // Compute cumulative sum and assign filtering statuses
    let accum = 0;
    return sortedProbs.map((item, i) => {
      accum += item.prob;
      
      let status: 'active' | 'filtered_top_k' | 'filtered_top_p' | 'selected' = 'active';
      
      // Top-K exclusion
      if (i >= topK) {
        status = 'filtered_top_k';
      }
      // Top-P exclusion: if cumulative has ALREADY exceeded P at previous token, excludes this one
      // If of course it hasn't exceeded Top K yet
      else if (accum - item.prob > topP) {
        status = 'filtered_top_p';
      }

      if (winnerLogit === item.token) {
        status = 'selected';
      }

      return {
        token: item.token,
        probability: item.prob,
        originalProbability: item.originalProb,
        cumulative: accum,
        status
      };
    });
  }, [temperature, topK, topP, winnerLogit]);

  // Dice roll sampler step
  const handleGenerateStep = () => {
    // Collect active candidates
    const activeCandidates = calculatedLogits.filter(
      x => x.status === 'active' || x.status === 'selected'
    );
    if (activeCandidates.length === 0) return;

    // Rescale active probabilities to sum to 1
    const sumActive = activeCandidates.reduce((a, b) => a + b.probability, 0);
    const roll = Math.random();
    
    let currentSum = 0;
    let selectedToken = activeCandidates[0].token;

    for (const cand of activeCandidates) {
      const normalizedProb = cand.probability / sumActive;
      currentSum += normalizedProb;
      if (roll <= currentSum) {
        selectedToken = cand.token;
        break;
      }
    }

    setWinnerLogit(selectedToken);
    
    // Animate appending the selected token to prompt text
    setTimeout(() => {
      setGeneratedText(prev => prev + ' ' + selectedToken);
      setWinnerLogit(null);
    }, 805);
  };

  const handleResetSimulator = () => {
    setGeneratedText('Крупные языковые');
    setWinnerLogit(null);
  };

  return (
    <div className="space-y-6">
      {/* Introduction box */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Глава 4: Гиперпараметры генерации (Hyperparameters & Sampling)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Модель выдает сырые оценки (logits) для каждого известного слова. 
              Гиперпараметры помогают регулировать творчество моделей. 
              <strong>Температура (Temperature)</strong> сглаживает (жарко/хаотично) или выбивает пики (холодно/детерминировано). 
              <strong>Top-K</strong> оставляет только $K$ лучших слов, а <strong>Top-P (Nucleus)</strong> срезает менее вероятный хвост.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Probability Bars Block */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Распределение вероятностей слов (Softmax)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded leading-none">
                Размер словаря: 7 кандидатов
              </span>
            </div>

            {/* Simulated bar chart distribution */}
            <div className="space-y-4 py-2">
              {calculatedLogits.map((item, idx) => {
                const isActive = item.status === 'active';
                const isSelected = item.status === 'selected';
                const isFiltered = item.status === 'filtered_top_k' || item.status === 'filtered_top_p';

                let barColor = 'bg-amber-500';
                let textColor = 'text-slate-850 dark:text-slate-200';
                let bgRowColor = 'hover:bg-slate-50 dark:hover:bg-slate-900/30';
                
                if (isFiltered) {
                  barColor = 'bg-slate-200 dark:bg-slate-800 line-through';
                  textColor = 'text-slate-400 line-through';
                } else if (isSelected) {
                  barColor = 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-800/50 animate-ping';
                  bgRowColor = 'bg-emerald-50/55 dark:bg-emerald-950/20 border-emerald-300';
                }

                return (
                  <div key={idx} className={`p-2.5 rounded-lg border border-transparent transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${bgRowColor}`}>
                    {/* Word label & index label */}
                    <div className="w-32 flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">#{idx+1}</span>
                      <span className={`text-xs font-bold font-mono ${textColor}`}>{item.token}</span>
                    </div>

                    {/* Progress representation bar */}
                    <div className="flex-1 space-y-1">
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative flex items-center">
                        <div
                          style={{ width: `${item.probability * 100}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        />
                      </div>
                      
                      {/* Secondary base comparison bar inside tiny viewport */}
                      <span className="text-[8px] text-slate-400 flex justify-between font-mono">
                        <span>Нач. вероятность: {(item.originalProbability * 100).toFixed(0)}%</span>
                        <span>Кумулятив: {(item.cumulative * 100).toFixed(0)}%</span>
                      </span>
                    </div>

                    {/* Meta stats chips */}
                    <div className="w-24 text-right">
                      {isFiltered ? (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-150 px-2 py-0.5 rounded whitespace-nowrap">
                          {item.status === 'filtered_top_k' ? 'Cut Top-K' : 'Cut Top-P'}
                        </span>
                      ) : (
                        <span className={`text-xs font-bold font-mono ${isSelected ? 'text-emerald-500 font-extrabold' : 'text-amber-600 dark:text-amber-400'}`}>
                          {(item.probability * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-[10px] text-slate-450">
            📊 Серые полосы исключены из выборки на текущем шаге согласно заданным справа границам Top-K и Top-P.
          </div>
        </div>

        {/* Sliders & Generation emulator */}
        <div className="space-y-4">
          {/* Controls box */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              Параметры генератора
            </span>

            {/* Temperature Slider */}
            <div className="space-y-1.5 font-sans">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Температура (Temp):</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-none">
                {temperature < 0.4 ? '❄️ Холодно: очень предсказуемо.' : temperature > 1.3 ? '🔥 Жарящий: дикий и случайный!' : '🤝 Оптимальный баланс.'}
              </p>
            </div>

            {/* Top K Slider */}
            <div className="space-y-1.5 font-sans">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Фильтр Top-K:</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-none">
                Ограничивается К-лучшими токенами из словаря.
              </p>
            </div>

            {/* Top P Slider */}
            <div className="space-y-1.5 font-sans">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Фильтр Top-P (Nucleus):</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{(topP * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-none">
                Выбираются токены, чья сумма не превосходит P.
              </p>
            </div>
          </div>

          {/* Interactive Generator Step */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Интерактивный плеер генератора
              </div>
              <button
                onClick={handleResetSimulator}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded text-slate-400 transition"
                title="Очистить"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </span>

            {/* Output buffer container */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 min-h-[72px] relative flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Генерируемый Текст</span>
              
              <div className="text-xs font-bold leading-relaxed text-slate-850 dark:text-slate-200 font-mono mt-1">
                {generatedText}
                {winnerLogit && (
                  <span className="ml-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[10px] animate-pulse">
                    {winnerLogit}
                  </span>
                )}
                <span className="w-1.5 h-4 bg-violet-500 inline-block ml-0.5 animate-pulse" />
              </div>
            </div>

            {/* Interactive generator buttons */}
            <button
              onClick={handleGenerateStep}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Добавить следующее слово
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
