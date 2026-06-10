/**
 * Vercel Serverless Function entry point.
 * Uses OpenRouter API with SSE streaming and free-model fallback chain.
 * Keeps Gemini for embeddings only.
 */
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// ─── OpenRouter Configuration ─────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_TIMEOUT_MS = 10000; // 10s per model attempt

// Cache free models list (5 min TTL)
let cachedFreeModels: string[] = [];
let cachedFreeModelDetails: { id: string; name: string }[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function getFallbackModels(): string[] {
  return [
    'moonshotai/kimi-k2.6:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'google/gemma-4-31b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'google/gemma-4-26b-a4b-it:free',
  ];
}

async function getFreeModels(): Promise<string[]> {
  const now = Date.now();
  if (cachedFreeModels.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return cachedFreeModels;
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return cachedFreeModels.length > 0 ? cachedFreeModels : getFallbackModels();
    const data = await res.json();
    const models = data?.data || [];
    const freeModels = models
      .filter((m: { id: string }) => m.id.endsWith(':free') && !m.id.includes('content-safety'))
      .map((m: { id: string; name?: string }) => ({ id: m.id, name: m.name || m.id }));
    cachedFreeModelDetails = freeModels;
    cachedFreeModels = freeModels.map((m: { id: string }) => m.id);
    lastFetchTime = now;
    return cachedFreeModels.length > 0 ? cachedFreeModels : getFallbackModels();
  } catch {
    return cachedFreeModels.length > 0 ? cachedFreeModels : getFallbackModels();
  }
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

// ─── Gemini (embeddings only) ─────────────────────────────
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const FALLBACK_EMBEDDINGS: Record<string, number[]> = {
  'кинг': [0.25, 0.45], 'королева': [0.35, 0.55],
  'мужчина': [0.20, 0.10], 'женщина': [0.30, 0.20],
  'яблоко': [-0.60, -0.40], 'банан': [-0.50, -0.55], 'груша': [-0.55, -0.45],
  'компьютер': [0.70, -0.60], 'сервер': [0.80, -0.70], 'код': [0.65, -0.50],
  'собака': [-0.10, -0.20], 'кошка': [-0.05, -0.15], 'тигр': [-0.15, -0.30],
};

function getMockEmbedding2D(word: string): { x: number; y: number } {
  const normWord = word.toLowerCase().trim();
  if (FALLBACK_EMBEDDINGS[normWord]) {
    return { x: FALLBACK_EMBEDDINGS[normWord][0], y: FALLBACK_EMBEDDINGS[normWord][1] };
  }
  let hash1 = 0, hash2 = 0;
  for (let i = 0; i < normWord.length; i++) {
    hash1 = normWord.charCodeAt(i) + ((hash1 << 5) - hash1);
    hash2 = normWord.charCodeAt(i) + ((hash2 << 7) - hash2);
  }
  return { x: ((Math.abs(hash1) % 1000) / 500 - 1) * 0.8, y: ((Math.abs(hash2) % 1000) / 500 - 1) * 0.8 };
}

// ─── API Routes ────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!OPENROUTER_API_KEY,
    provider: 'openrouter',
  });
});

// List free models from OpenRouter
app.get('/api/models', async (_req, res) => {
  try {
    const now = Date.now();
    if (cachedFreeModelDetails.length > 0 && now - lastFetchTime < CACHE_TTL) {
      const models = cachedFreeModelDetails.map(m => ({
        id: m.id,
        name: m.name,
        label: m.name.replace(/\s*\(free\)\s*/i, '').trim() || m.id,
      })).sort((a, b) => a.label.localeCompare(b.label));
      return res.json({ models });
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      // Return fallback
      const models = getFallbackModels().map(id => {
        const parts = id.split('/');
        const name = parts[parts.length - 1].replace(':free', '');
        return { id, name, label: name };
      });
      return res.json({ models });
    }

    const data = await response.json();
    const allModels = data?.data || [];
    const freeModels = allModels
      .filter((m: { id: string }) => m.id.endsWith(':free') && !m.id.includes('content-safety'))
      .map((m: { id: string; name?: string }) => {
        const label = (m.name || m.id).replace(/\s*\(free\)\s*/i, '').trim() || m.id;
        return { id: m.id, name: m.name || m.id, label };
      })
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

    // Update cache
    cachedFreeModelDetails = freeModels.map(m => ({ id: m.id, name: m.name }));
    cachedFreeModels = freeModels.map((m: { id: string }) => m.id);
    lastFetchTime = now;

    res.json({ models: freeModels });
  } catch {
    const models = getFallbackModels().map(id => {
      const parts = id.split('/');
      const name = parts[parts.length - 1].replace(':free', '');
      return { id, name, label: name };
    });
    res.json({ models });
  }
});

// Check model availability
app.post('/api/models/check', async (req, res) => {
  const { model, apiToken } = req.body;
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'model is required' });
  }

  const apiKey = apiToken || OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.json({ available: false, reason: 'error', model });
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dive-into-llms-new.vercel.app',
        'X-Title': 'LLM Explorer',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      }),
    }, 8000);

    const latency = Date.now() - start;

    if (response.ok) {
      const limit = response.headers.get('x-ratelimit-limit');
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');

      return res.json({
        available: true,
        model,
        latency,
        rateLimit: {
          limit: limit ? parseInt(limit, 10) : null,
          remaining: remaining ? parseInt(remaining, 10) : null,
          reset: reset || null,
        },
      });
    }

    if (response.status === 429) {
      const limit = response.headers.get('x-ratelimit-limit');
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');

      return res.json({
        available: false,
        reason: 'rate_limited',
        model,
        latency,
        rateLimit: {
          limit: limit ? parseInt(limit, 10) : null,
          remaining: remaining ? parseInt(remaining, 10) : null,
          reset: reset || null,
        },
      });
    }

    if (response.status === 404) {
      return res.json({ available: false, reason: 'not_found', model, latency });
    }

    return res.json({ available: false, reason: 'error', model, latency });
  } catch {
    return res.json({ available: false, reason: 'error', model, latency: Date.now() - start });
  }
});

// Embeddings (still uses Gemini)
app.post('/api/embeddings', async (req, res) => {
  const { words }: { words: string[] } = req.body;
  if (!words || !Array.isArray(words)) {
    return res.status(400).json({ error: 'words array is required' });
  }
  try {
    const ai = getGeminiClient();
    const results = [];
    for (const word of words) {
      try {
        const response = await ai.models.embedContent({ model: 'text-embedding-004', contents: word });
        const vector = response.embeddings?.[0]?.values || (response as any).embedding?.values;
        if (vector) {
          let sumOdd = 0, sumEven = 0;
          for (let i = 0; i < vector.length; i++) { if (i % 2 === 0) sumEven += vector[i]; else sumOdd += vector[i]; }
          results.push({ word, x: Math.sin(sumEven * 10) * 0.7, y: Math.cos(sumOdd * 10) * 0.7, originalEmbedding: vector });
        } else {
          results.push({ word, ...getMockEmbedding2D(word) });
        }
      } catch {
        results.push({ word, ...getMockEmbedding2D(word) });
      }
    }
    res.json({ success: true, embeddings: results });
  } catch {
    res.json({ success: true, embeddings: words.map(w => ({ word: w, ...getMockEmbedding2D(w) })), fallbackMode: true });
  }
});

// Legacy generate endpoint (non-streaming, for RAG chapter etc.)
app.post('/api/generate', async (req, res) => {
  const { prompt, systemInstruction, temperature, apiToken, model: clientModel } = req.body;

  const apiKey = apiToken || OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.json({ success: false, text: 'API ключ не настроен. Добавьте свой токен OpenRouter в настройках.', simulated: true });
  }

  try {
    const freeModels = await getFreeModels();
    const preferredModel = clientModel || '';
    const modelsToTry = preferredModel
      ? [preferredModel, ...freeModels.filter(m => m !== preferredModel)]
      : freeModels;
    const allMessages = [
      { role: 'system', content: systemInstruction || 'Ты — полезный AI-ассистент. Отвечай на русском.' },
      { role: 'user', content: prompt },
    ];

    for (const model of modelsToTry) {
      try {
        const response = await fetchWithTimeout(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dive-into-llms-new.vercel.app',
            'X-Title': 'LLM Explorer',
          },
          body: JSON.stringify({
            model,
            messages: allMessages,
            max_tokens: 512,
            temperature: typeof temperature === 'number' ? temperature : 0.7,
          }),
        }, MODEL_TIMEOUT_MS);

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          return res.json({ success: true, text, model });
        }
        if (response.status === 429) continue;
      } catch { continue; }
    }
    res.json({ success: false, text: 'Все модели заняты. Попробуйте позже.' });
  } catch (err: any) {
    res.json({ success: false, text: 'Ошибка сервера: ' + (err.message || 'unknown'), simulated: true });
  }
});

// Chat endpoint — SSE streaming via OpenRouter
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt, model: clientModel, max_tokens, temperature: clientTemp, apiToken } = req.body;

  const apiKey = apiToken || OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API ключ не настроен. Добавьте свой токен OpenRouter в настройках модели.' });
  }

  const maxTokens = max_tokens ?? 2048;
  const temperature = clientTemp !== undefined ? Math.max(0, Math.min(2, clientTemp)) : 0.7;

  const allMessages = [
    { role: 'system', content: systemPrompt || 'Ты — полезный AI-ассистент. Отвечай на русском языке.' },
    ...(messages || []),
  ];

  try {
    const freeModels = await getFreeModels();
    const preferredModel = clientModel || '';
    const modelsToTry = preferredModel
      ? [preferredModel, ...freeModels.filter(m => m !== preferredModel)]
      : freeModels;

    const rateLimitedModels: string[] = [];

    for (const model of modelsToTry) {
      try {
        const response = await fetchWithTimeout(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dive-into-llms-new.vercel.app',
            'X-Title': 'LLM Explorer',
          },
          body: JSON.stringify({
            model,
            messages: allMessages,
            stream: true,
            max_tokens: maxTokens,
            temperature,
          }),
        }, MODEL_TIMEOUT_MS);

        if (response.ok) {
          // Inject custom model_info SSE event
          const modelInfoEvent = `data: ${JSON.stringify({ type: 'model_info', model, rateLimited: rateLimitedModels })}\n\n`;

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Model-Used': model,
          });

          // Send model_info first
          res.write(modelInfoEvent);

          // Pipe the OpenRouter stream
          const reader = response.body?.getReader();
          if (!reader) {
            res.end();
            return;
          }

          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              // Forward SSE chunks directly
              res.write(decoder.decode(value, { stream: true }));
            }
          } catch (err) {
            console.warn('Stream read error:', err);
          }

          res.end();
          return;
        }

        if (response.status === 429) {
          rateLimitedModels.push(model);
        }
        console.warn(`Model ${model} failed (${response.status})`);
        continue;
      } catch (fetchError: any) {
        console.warn(`Model ${model} error:`, fetchError.message);
        continue;
      }
    }

    // All models failed
    res.status(503).json({ error: 'All models unavailable', rateLimitedModels });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default app;
