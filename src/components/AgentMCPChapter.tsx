/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AgentStep } from '../types';
import { Network, Play, RefreshCw, Layers, ArrowRight, Server, Terminal, Smartphone } from 'lucide-react';

const PRESET_GOALS = [
  'Узнай текущую погоду в Самаре и реши, брать ли зонт?',
  'Вычисли курс конвертации 100 долларов в рубли на сегодня.'
];

export default function AgentMCPChapter() {
  const [selectedGoal, setSelectedGoal] = useState<string>(PRESET_GOALS[0]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(-1);

  const handleRunAgent = () => {
    setStatus('running');
    setSteps([]);
    setActiveStepIdx(0);

    const isWeather = selectedGoal.includes('Самаре');

    const weatherSteps: AgentStep[] = [
      {
        type: 'thought',
        title: '🤔 Мысль (Thought)',
        message: 'Пользователь просит узнать погоду в Самаре. У меня нет прямого доступа к интернету, но в моей конфигурации подключен MCP Server с подходящим инструментом.',
        detail: 'Вызов реестра MCP: mcp_list_tools()',
        timestamp: '12:00:01'
      },
      {
        type: 'mcp-call',
        title: '📡 Вызов инструмента (MCP Call)',
        message: 'Инициирую запрос выполнения RPC метода к внешнему серверу погоды mcp-server-weather.',
        detail: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "get_weather_forecast",
            arguments: { city: "Самара", units: "metric" }
          }
        }, null, 2),
        timestamp: '12:00:02'
      },
      {
        type: 'mcp-response',
        title: '📥 Ответ MCP сервера (MCP Response)',
        message: 'Получен успешный пакет JSON-RPC от сервера погоды. Данные извлечены успешно.',
        detail: JSON.stringify({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: "Прогноз погоды для г. Самара: Облачно, затяжной дождь, температура +14°C, влажность 92%, ветер С-З 5 м/с."
              }
            ]
          }
        }, null, 2),
        timestamp: '12:00:03'
      },
      {
        type: 'thought',
        title: '🤔 Мысль (Thought)',
        message: 'Я получил новые данные: в Самаре затяжной дождь, +14°C. Теперь я могу завершить цикл планирования и дать пользователю обоснованный совет.',
        detail: 'Обобщение информации: Дождь = требуется зонт + теплая одежда.',
        timestamp: '12:00:04'
      },
      {
        type: 'answer',
        title: '🏁 Итоговый ответ (Final Answer)',
        message: 'В Самаре сейчас затяжной дождь при температуре +14°C. Обязательно возьмите с собой зонт и оденьтесь теплее — влажность воздуха крайне высокая (92%).',
        detail: 'Ответ сгенерирован ИИ-ассистентом на основе точных контекстных заметок инструмента.',
        timestamp: '12:00:05'
      }
    ];

    const financeSteps: AgentStep[] = [
      {
        type: 'thought',
        title: '🤔 Мысль (Thought)',
        message: 'Требуется перевести 100 долларов в рубли. Для этого необходим актуальный валютный курс. Обращаюсь к внешнему серверу обмена валют.',
        detail: 'Поиск инструмента: mcp_list_tools() -> finance_assistant',
        timestamp: '12:05:01'
      },
      {
        type: 'mcp-call',
        title: '📡 Вызов инструмента (MCP Call)',
        message: 'Отправляю JSON-RPC запрос для вычисления актуального валютного рейта к mcp-server-finance.',
        detail: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "get_latest_rates",
            arguments: { base: "USD", symbols: ["RUB"] }
          }
        }, null, 2),
        timestamp: '12:05:02'
      },
      {
        type: 'mcp-response',
        title: '📥 Ответ MCP сервера (MCP Response)',
        message: 'Сервер финансов вернул текущий биржевой рейт.',
        detail: JSON.stringify({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: "Курс USD/RUB: 91.45. Последнее обновление: сегодня, 12:00 UTC."
              }
            ]
          }
        }, null, 2),
        timestamp: '12:05:03'
      },
      {
        type: 'thought',
        title: '🤔 Мысль (Thought)',
        message: 'Курс составляет 91.45. Умножаю 100 на 91.45 = 9145 рублей. Формирую понятный ответ для пользователя.',
        detail: 'Математическое действие: 100 * 91.45 = 9145 RUB',
        timestamp: '12:05:04'
      },
      {
        type: 'answer',
        title: '🏁 Итоговый ответ (Final Answer)',
        message: '100 долларов США по текущему курсу (91.45 руб) составляют ровно 9145 рублей.',
        detail: 'Результат вычислений заземлен на свежий инструментальный замер.',
        timestamp: '12:05:05'
      }
    ];

    const activeList = isWeather ? weatherSteps : financeSteps;

    // Simulate animated step-by-step progress
    let i = 0;
    const interval = setInterval(() => {
      if (i < activeList.length) {
        setSteps(prev => [...prev, activeList[i]]);
        setActiveStepIdx(i);
        i++;
      } else {
        clearInterval(interval);
        setStatus('completed');
      }
    }, 1500);
  };

  const handleResetAgent = () => {
    setSteps([]);
    setStatus('idle');
    setActiveStepIdx(-1);
  };

  return (
    <div className="space-y-6">
      {/* Introduction box */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-950/50 rounded-lg text-violet-600 dark:text-violet-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              Глава 6: Архитектура Агентов и Протокол MCP (Agents & MCP)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              <strong>Агенты (AI Agents)</strong> работают в цикле ReAct (Рассуждение и Действие). 
              Для взаимодействия с внешним миром используется новый открытый стандарт — 
              <strong>Model Context Protocol (MCP)</strong>. Он позволяет безопасно подключать к LLM любые 
              источники данных и инструменты (веб-поиск, базы данных, API) по единому протоколу обмена сообщениями.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Goal selector & Console list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-500 animate-pulse" />
                Логи выполнения цикла ReAct Агента
              </span>
              <button
                onClick={handleResetAgent}
                className="text-xs text-slate-450 hover:text-slate-700 dark:hover:text-slate-350 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Сбросить лог
              </button>
            </div>

            {/* Goal presets buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {PRESET_GOALS.map((pg, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedGoal(pg); handleResetAgent(); }}
                  disabled={status === 'running'}
                  className={`p-3 text-left rounded-xl border text-xs font-sans transition-all active:scale-98 cursor-pointer ${
                    pg === selectedGoal
                      ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-500 text-violet-700 dark:text-violet-350 font-semibold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {pg}
                </button>
              ))}
            </div>

            {/* Trigger actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRunAgent}
                disabled={status === 'running'}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Активировать автономного Агента
              </button>
            </div>

            {/* Rendered sequential dynamic nodes */}
            <div className="mt-5 space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {steps.length === 0 ? (
                <div className="h-28 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-900/10 italic text-xs text-slate-400">
                  Нажмите кнопку выше, чтобы запустить симуляцию ReAct-агента...
                </div>
              ) : (
                steps.map((step, idx) => {
                  let accentColor = 'border-l-4 border-l-sky-500 bg-sky-50/20 dark:bg-sky-950/10';
                  if (step.type === 'mcp-call') accentColor = 'border-l-4 border-l-amber-500 bg-amber-50/15 dark:bg-amber-950/10';
                  if (step.type === 'mcp-response') accentColor = 'border-l-4 border-l-violet-500 bg-violet-50/15 dark:bg-violet-950/10';
                  if (step.type === 'answer') accentColor = 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10';

                  return (
                    <div key={idx} className={`p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 ${accentColor} space-y-2`}>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>{step.title}</span>
                        <span className="text-[9px] font-mono text-slate-400">{step.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-sans">{step.message}</p>
                      
                      {/* JSON RPC / Details viewer */}
                      {step.detail && (
                        <pre className="text-[10px] font-mono text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-805 overflow-x-auto leading-relaxed max-h-[140px]">
                          {step.detail}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="text-[10px] text-slate-450 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            💡 Цикл ReAct расшифровывается как «Reasoning + Acting» — способность LLM генерировать обоснования своих действий, а затем исполнять их.
          </div>
        </div>

        {/* MCP Sequence Diagram details column */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-medium text-slate-850 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
              <Server className="w-4 h-4 text-violet-500" />
              Топология связи MCP
            </span>

            {/* Sequence block diagrams representation */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-4 text-center">
              
              {/* User block */}
              <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">USER (Пользователь)</span>
              </div>

              {/* Arrow downward wire */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-800" />
                <span className="text-[9px] font-mono text-slate-400 font-bold">1. Естественный язык</span>
                <div className="w-0.5 h-2 bg-slate-300 dark:bg-slate-800" />
              </div>

              {/* Host client block */}
              <div className="bg-violet-50 dark:bg-violet-955 border border-violet-300 dark:border-violet-900 px-3 py-2.5 rounded-xl shadow-xs flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  CLIENT/HOST (LLM Ядро)
                </span>
                <span className="text-[9px] text-slate-400 font-sans">Оркестрирует цикл планирования ReAct</span>
              </div>

              {/* Communication wire */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-800" />
                <span className="text-[9px] font-mono text-slate-400 font-bold">2. JSON-RPC (Протокол MCP)</span>
                <div className="w-0.5 h-2 bg-slate-300 dark:bg-slate-800" />
              </div>

              {/* Remote Servers tool registry */}
              <div className="bg-amber-50 dark:bg-amber-955 border border-amber-300 dark:border-amber-900 px-3 py-2.5 rounded-xl shadow-xs flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-amber-500" />
                  MCP SERVER (Реестр)
                </span>
                <span className="text-[9px] text-slate-400 font-sans">Исполняет локальные инструменты</span>
              </div>
            </div>

            {/* Protocol highlights list */}
            <div className="text-[11px] text-slate-450 leading-relaxed font-sans bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded border border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Пакет безопасности:</span>
              Протокол MCP вырезает необходимость внедрения API-ключей в саму LLM. Клиент полностью контролирует полномочия доступа, действуя как защитный шлюз для пользователя.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
