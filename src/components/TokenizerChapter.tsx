/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { TokenInfo } from '../types';
import { Sparkles, Info, BookOpen, Layers, BarChart2 } from 'lucide-react';

const PALETTE = [
  'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900',
  'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900',
  'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-900',
  'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900',
  'bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-900',
  'bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-900',
  'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-900',
  'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-900',
];

// Helper to determine simulated BPE tokens
const COMMON_SUFFIXES = ['ing', 'ed', 'ly', 'es', 'er', 'est', 'tion', 'ness', 'ment', 'able', 'al', 'ие', 'ии', 'овать', 'тель', 'ник', 'ение', 'ность', 'ский', 'ый', 'ая', 'ое'];
const COMMON_PREFIXES = ['un', 're', 'in', 'dis', 'pre', 'de', 'con', 'pro', 'ex', 'суб', 'про', 'пре', 'не', 'без', 'раз', 'на'];

export default function TokenizerChapter() {
  const [inputText, setInputText] = useState<string>(
    'Learning Large Language Models is incredibly amazing and opens new horizons!'
  );
  const [tokenizerType, setTokenizerType] = useState<'bpe' | 'char' | 'word'>('bpe');
  const [hoveredToken, setHoveredToken] = useState<TokenInfo | null>(null);

  // Perform mock split based on BPE rules or simple primitives
  const tokens = useMemo<TokenInfo[]>(() => {
    if (!inputText.trim()) return [];

    const result: TokenInfo[] = [];
    let idCounter = 1720; // Starting arbitrary vocab id offset

    if (tokenizerType === 'char') {
      for (let i = 0; i < inputText.length; i++) {
        const char = inputText[i];
        const color = PALETTE[char.charCodeAt(0) % PALETTE.length];
        const bytes = encodeURIComponent(char).split('%').filter(Boolean).map(b => '0x' + b).join(' ');
        result.push({
          id: 50 + char.charCodeAt(0),
          text: char === ' ' ? '␣' : char,
          color,
          bytes: bytes || '0x' + char.charCodeAt(0).toString(16).toUpperCase(),
        });
      }
    } else if (tokenizerType === 'word') {
      const words = inputText.split(/(\s+)/);
      words.forEach((word, index) => {
        if (!word) return;
        const color = PALETTE[index % PALETTE.length];
        const bytes = Array.from(new TextEncoder().encode(word))
          .map(b => '0x' + b.toString(16).toUpperCase())
          .join(' ');
        result.push({
          id: idCounter + index,
          text: word.replace(/\s/g, '␣'),
          color,
          bytes,
        });
      });
    } else {
      // Subword BPE Simulator
      // We will traverse words and check for split positions representing prefixes, roots, and suffixes
      const splitRegex = /(\s+|[.,!?;:()\[\]{}]+)/;
      const chunks = inputText.split(splitRegex).filter(Boolean);

      chunks.forEach((chunk, chunkIndex) => {
        if (/\s+/.test(chunk)) {
          // It is a space token
          const spaceRepresentation = chunk.replace(/\s/g, '␣');
          result.push({
            id: 220 + chunk.length,
            text: spaceRepresentation,
            color: 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800',
            bytes: '0x20'.repeat(chunk.length),
          });
          return;
        }

        if (/^[.,!?;:()\[\]{}]+$/.test(chunk)) {
          // Punctuation
          result.push({
            id: 1000 + chunk.charCodeAt(0),
            text: chunk,
            color: 'bg-stone-100 dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-800',
            bytes: chunk.charCodeAt(0).toString(16).toUpperCase(),
          });
          return;
        }

        // Simulating subword splits for regular words
        let word = chunk;
        let subparts: string[] = [];

        // Check prefixes
        let matchedPrefix = '';
        for (const pref of COMMON_PREFIXES) {
          if (word.toLowerCase().startsWith(pref) && word.length > pref.length + 2) {
            matchedPrefix = word.slice(0, pref.length);
            word = word.slice(pref.length);
            break;
          }
        }

        // Check suffixes
        let matchedSuffix = '';
        for (const suff of COMMON_SUFFIXES) {
          if (word.toLowerCase().endsWith(suff) && word.length > suff.length + 2) {
            matchedSuffix = word.slice(word.length - suff.length);
            word = word.slice(0, word.length - suff.length);
            break;
          }
        }

        // Assemble subparts
        if (matchedPrefix) subparts.push(matchedPrefix);
        if (word.length > 5) {
          // Split root in half to simulate subword chunking for long roots
          const half = Math.floor(word.length / 2);
          subparts.push(word.slice(0, half));
          subparts.push(word.slice(half));
        } else {
          subparts.push(word);
        }
        if (matchedSuffix) subparts.push(matchedSuffix);

        // Filter empty elements
        subparts = subparts.filter(Boolean);

        subparts.forEach((part, subIndex) => {
          const combinedIndex = chunkIndex * 10 + subIndex;
          const color = PALETTE[combinedIndex % PALETTE.length];
          const bytes = Array.from(new TextEncoder().encode(part))
            .map(b => '0x' + b.toString(16).toUpperCase())
            .join(' ');

          result.push({
            id: idCounter + combinedIndex,
            text: part,
            color,
            bytes,
          });
        });
      });
    }

    return result;
  }, [inputText, tokenizerType]);

  const stats = useMemo(() => {
    const rawWords = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
    const totalTokens = tokens.length;
    const compression = rawWords ? Number((totalTokens / rawWords).toFixed(2)) : 0;
    const averageLength = totalTokens ? Number((inputText.length / totalTokens).toFixed(1)) : 0;

    return { rawWords, totalTokens, compression, averageLength };
  }, [inputText, tokens]);

  return (
    <div className="space-y-6">
      {/* Description header */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-950/50 rounded-lg text-violet-600 dark:text-violet-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Глава 1: Анатомия токенизации (Tokenization)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Языковые модели не читают текст так же, как люди. Перед обработкой исходный текст разбивается 
              на специальные смысловые части — <strong>токены</strong> (subwords). Кодировщик находит 
              баланс между посимвольным представлением и длинными словами, чтобы эффективно работать в рамках словаря.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input & Split Type column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-500" />
                Ввод текста для симулятора
              </span>
              
              {/* Tokenizer selects */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setTokenizerType('bpe')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    tokenizerType === 'bpe'
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  BPE (Субслова)
                </button>
                <button
                  onClick={() => setTokenizerType('word')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    tokenizerType === 'word'
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Слова
                </button>
                <button
                  onClick={() => setTokenizerType('char')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    tokenizerType === 'char'
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Символы
                </button>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Введите текст для анализа его структуры токенизации..."
              className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-sans"
            />
          </div>

          {/* Render box of parsed tokens */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm min-h-[160px] flex flex-col justify-between">
            <div>
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Визуальное представление токенов</span>
                <span className="text-slate-400 capitalize bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px]">
                  Режим: {tokenizerType === 'bpe' ? 'BPE (GPT / Llama)' : tokenizerType === 'char' ? 'Посимвольный' : 'По словам'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-900">
                {tokens.length === 0 ? (
                  <span className="text-sm text-slate-400 italic">Начните вводить текст выше, чтобы увидеть токены...</span>
                ) : (
                  tokens.map((tok, idx) => (
                    <span
                      key={idx}
                      onMouseEnter={() => setHoveredToken(tok)}
                      onMouseLeave={() => setHoveredToken(null)}
                      className={`inline-block px-2.5 py-1 text-sm font-sans font-medium select-none rounded border cursor-pointer transition-all hover:scale-105 shadow-xs ${tok.color} ${
                        hoveredToken?.id === tok.id ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-950' : ''
                      }`}
                    >
                      {tok.text}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Quick interactive lookup details for hovered item */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 min-h-[48px] flex items-center">
              {hoveredToken ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-400">Фрагмент:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      "{hoveredToken.text}"
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-400">ID Токена:</span>
                    <span className="font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded">
                      {hoveredToken.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-400">UTF-8 Байты:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      {hoveredToken.bytes}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-300" />
                  Наведите курсор мыши на любой токен для детального просмотра метаданных в реальном времени.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-4">
          {/* Numerical statistics */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm">
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              Метрики документа
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Всего слов</span>
                <p className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">{stats.rawWords}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Всего токенов</span>
                <p className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-400 mt-1">{stats.totalTokens}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Коэф. Сжатия</span>
                <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.compression}x
                </p>
                <span className="text-[9px] text-slate-400">токенов на слово</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ср. токенов</span>
                <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {stats.averageLength} симв.
                </p>
                <span className="text-[9px] text-slate-400">под символ / токен</span>
              </div>
            </div>
            {stats.compression > 1.2 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 text-xs p-3 rounded-lg border border-amber-100 dark:border-amber-900 mt-3 flex items-start gap-2 leading-relaxed">
                <span>⚠️</span>
                <span>Высокое отношение токенов к словам связано с большим количеством незнакомых слогов. Это снижает эффективную вместимость контекстного окна!</span>
              </div>
            )}
          </div>

          {/* Mini Vocab Dictionary representation */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm max-h-[250px] flex flex-col">
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              Словарь модели (Vocabulary)
            </span>
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 py-1 text-xs">
              {tokens.length === 0 ? (
                <span className="text-slate-400 italic">Словарь пуст</span>
              ) : (
                tokens.reduce<TokenInfo[]>((acc, current) => {
                  if (!acc.some(x => x.id === current.id)) {
                    acc.push(current);
                  }
                  return acc;
                }, []).map((tok, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1.5 px-2 bg-slate-50 dark:bg-slate-900 font-mono rounded border border-slate-100 dark:border-slate-800/60"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-bold">"{tok.text}"</span>
                    <span className="text-violet-500 dark:text-violet-400 text-[11px] font-bold">ID: {tok.id}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
