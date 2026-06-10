/**
 * Vercel Serverless Function entry point.
 * Wraps the Express app for serverless deployment.
 */
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY is not configured or holds placeholder value.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Predefined mock dimensions for common terms to use as fallback
const FALLBACK_EMBEDDINGS: Record<string, number[]> = {
  'кинг': [0.25, 0.45],
  'королева': [0.35, 0.55],
  'мужчина': [0.20, 0.10],
  'женщина': [0.30, 0.20],
  'яблоко': [-0.60, -0.40],
  'банан': [-0.50, -0.55],
  'груша': [-0.55, -0.45],
  'компьютер': [0.70, -0.60],
  'сервер': [0.80, -0.70],
  'код': [0.65, -0.50],
  'собака': [-0.10, -0.20],
  'кошка': [-0.05, -0.15],
  'тигр': [-0.15, -0.30],
};

function getMockEmbedding2D(word: string): { x: number; y: number } {
  const normWord = word.toLowerCase().trim();
  if (FALLBACK_EMBEDDINGS[normWord]) {
    return { x: FALLBACK_EMBEDDINGS[normWord][0], y: FALLBACK_EMBEDDINGS[normWord][1] };
  }
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < normWord.length; i++) {
    hash1 = normWord.charCodeAt(i) + ((hash1 << 5) - hash1);
    hash2 = normWord.charCodeAt(i) + ((hash2 << 7) - hash2);
  }
  const x = ((Math.abs(hash1) % 1000) / 500) - 1;
  const y = ((Math.abs(hash2) % 1000) / 500) - 1;
  return { x: x * 0.8, y: y * 0.8 };
}

// API Routes

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  });
});

// Real or simulated embeddings resolver
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
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: word,
        });

        const vector = response.embeddings?.[0]?.values || (response as any).embedding?.values;
        if (vector) {
          let sumOdd = 0;
          let sumEven = 0;
          for (let i = 0; i < vector.length; i++) {
            if (i % 2 === 0) sumEven += vector[i];
            else sumOdd += vector[i];
          }
          const rawX = Math.sin(sumEven * 10) * 0.7;
          const rawY = Math.cos(sumOdd * 10) * 0.7;
          results.push({ word, x: rawX, y: rawY, originalEmbedding: vector });
        } else {
          const coords = getMockEmbedding2D(word);
          results.push({ word, ...coords });
        }
      } catch (err) {
        console.warn(`Gemini embedding failed for word: ${word}. Falling back to visual simulation coords.`, err);
        const coords = getMockEmbedding2D(word);
        results.push({ word, ...coords });
      }
    }

    res.json({ success: true, embeddings: results });
  } catch (err) {
    const results = words.map(word => {
      const coords = getMockEmbedding2D(word);
      return { word, ...coords };
    });
    res.json({ success: true, embeddings: results, fallbackMode: true });
  }
});

// AI Generation for RAG / Agent Loop / Sampling Demo
app.post('/api/generate', async (req, res) => {
  const { prompt, systemInstruction, temperature, topP, topK } = req.body;

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        topP: typeof topP === 'number' ? topP : 0.95,
        topK: typeof topK === 'number' ? topK : 40,
        maxOutputTokens: 250,
      }
    });

    res.json({ success: true, text: response.text || '' });
  } catch (err: any) {
    console.warn('Gemini chat failed. Simulating local responses for testing.', err.message);

    const textLower = prompt.toLowerCase();
    let reply = "Анализатор LLM: Вага вера... Я получил ваш запрос. В симуляционном режиме (без API-ключа) я отвечаю локально.";

    if (textLower.includes('claude')) {
      reply = "Claude от Anthropic — это семейство больших языковых моделей, разработанных с акцентом на безопасность, конституционный ИИ (Constitutional AI) и длинный контекст (до 200 тысяч токенов). Модель превосходно справляется с кодингом и логическими задачами.";
    } else if (textLower.includes('gemini')) {
      reply = "Gemini от Google — мультимодальная модель следующего поколения, изначально спроектированная работать с текстом, звуком, кодом, видео и изображениями. Имеет гигантское окно контекста до 2 миллионов токенов и высокую скорость работы.";
    } else if (textLower.includes('gpt-5') || textLower.includes('gpt')) {
      reply = "GPT-5 — следующее мифическое поколение LLM от OpenAI, ожидается как прорывная модель в области глубокого рассуждения, планирования задач высокой сложности и продвинутой мультимодальности.";
    } else if (textLower.includes('llama')) {
      reply = "LLaMA от Meta — популярная свободная (open-access) серия весов моделей. Она послужила основой для расцвета open-source сообщества, позволяя запускать эффективные языковые модели локально на потребительских видеокартах.";
    } else if (textLower.includes('зонт') || textLower.includes('погод')) {
      reply = "На основе полученных данных о погоде в Самаре (пасмурно, дождь, +14°C), я настоятельно рекомендую взять с собой зонт и надеть ветровку! Влажность воздуха составляет 92%.";
    }

    res.json({ success: true, text: reply, simulated: true });
  }
});

// Export for Vercel Serverless Functions
export default app;
