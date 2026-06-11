import { create } from 'zustand';

const STORAGE_KEY = 'llm-explorer-model';
const RATE_LIMIT_KEY = 'llm-explorer-rate-limits';
const TOKEN_KEY = 'llm-explorer-api-token';

const DEFAULT_MODEL = 'moonshotai/kimi-k2.6:free';

export interface ModelRateLimit {
  available: boolean;
  reason?: 'rate_limited' | 'not_found' | 'error' | null;
  remaining?: number | null;
  limit?: number | null;
  reset?: string | null;
  latency?: number | null;
  checkedAt?: number;
}

export interface FreeModel {
  id: string;
  name: string;
  label: string;
}

interface ModelState {
  currentModel: string;
  apiToken: string;
  availableModels: FreeModel[];
  isLoadingModels: boolean;
  modelsError: string | null;
  isApplying: boolean;
  isCheckingAll: boolean;
  rateLimits: Record<string, ModelRateLimit>;
  setCurrentModel: (model: string) => void;
  setApiToken: (token: string) => void;
  clearApiToken: () => void;
  fetchAvailableModels: () => Promise<void>;
  checkModel: (modelId: string) => Promise<ModelRateLimit>;
  checkAllModels: () => Promise<void>;
  markModelRateLimited: (modelId: string) => void;
  setIsApplying: (applying: boolean) => void;
  getModelForRequest: () => string;
  getTokenForRequest: () => string;
  getRateLimit: (modelId: string) => ModelRateLimit | undefined;
  _hydrate: () => void;
}

function loadFromStorage(key: string, fallback: string = ''): string {
  if (typeof window === 'undefined') return fallback;
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function loadModelFromStorage(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.currentModel || DEFAULT_MODEL;
    }
  } catch {}
  return DEFAULT_MODEL;
}

function saveModelToStorage(model: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentModel: model })); } catch {}
}

function saveTokenToStorage(token: string) {
  if (typeof window === 'undefined') return;
  try {
    if (token) { localStorage.setItem(TOKEN_KEY, token); }
    else { localStorage.removeItem(TOKEN_KEY); }
  } catch {}
}

function loadRateLimitsFromStorage(): Record<string, ModelRateLimit> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const now = Date.now();
      const cleaned: Record<string, ModelRateLimit> = {};
      for (const [key, val] of Object.entries(parsed)) {
        const rl = val as ModelRateLimit;
        if (rl.checkedAt && now - rl.checkedAt < 10 * 60 * 1000) {
          cleaned[key] = rl;
        }
      }
      return cleaned;
    }
  } catch {}
  return {};
}

function saveRateLimitsToStorage(limits: Record<string, ModelRateLimit>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(limits)); } catch {}
}

export const useModelStore = create<ModelState>((set, get) => ({
  currentModel: DEFAULT_MODEL,
  apiToken: '',
  availableModels: [],
  isLoadingModels: false,
  modelsError: null,
  isApplying: false,
  isCheckingAll: false,
  rateLimits: {},

  setCurrentModel: (model) => {
    saveModelToStorage(model);
    set({ currentModel: model });
  },

  setApiToken: (token) => {
    saveTokenToStorage(token);
    set({ apiToken: token });
  },

  clearApiToken: () => {
    saveTokenToStorage('');
    set({ apiToken: '' });
  },

  fetchAvailableModels: async () => {
    if (get().isLoadingModels) return;
    if (get().availableModels.length > 0) return;

    set({ isLoadingModels: true, modelsError: null });

    try {
      const res = await fetch('/api/models');
      if (!res.ok) throw new Error('Не удалось загрузить список моделей');
      const data = await res.json();
      const models: FreeModel[] = data.models || [];
      set({ availableModels: models, isLoadingModels: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки моделей';
      set({ modelsError: msg, isLoadingModels: false });
    }
  },

  checkModel: async (modelId: string): Promise<ModelRateLimit> => {
    try {
      const body: Record<string, string> = { model: modelId };
      const token = get().apiToken;
      if (token) body.apiToken = token;

      const res = await fetch('/api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const info: ModelRateLimit = { available: false, reason: 'error', checkedAt: Date.now() };
        const updated = { ...get().rateLimits, [modelId]: info };
        saveRateLimitsToStorage(updated);
        set({ rateLimits: updated });
        return info;
      }

      const data = await res.json();
      const info: ModelRateLimit = {
        available: data.available,
        reason: data.reason || null,
        remaining: data.rateLimit?.remaining ?? null,
        limit: data.rateLimit?.limit ?? null,
        reset: data.rateLimit?.reset ?? null,
        latency: data.latency ?? null,
        checkedAt: Date.now(),
      };

      const updated = { ...get().rateLimits, [modelId]: info };
      saveRateLimitsToStorage(updated);
      set({ rateLimits: updated });
      return info;
    } catch {
      const info: ModelRateLimit = { available: false, reason: 'error', checkedAt: Date.now() };
      const updated = { ...get().rateLimits, [modelId]: info };
      saveRateLimitsToStorage(updated);
      set({ rateLimits: updated });
      return info;
    }
  },

  checkAllModels: async () => {
    if (get().isCheckingAll) return;
    set({ isCheckingAll: true });
    const models = get().availableModels;
    for (const model of models) {
      await get().checkModel(model.id);
      await new Promise((r) => setTimeout(r, 200));
    }
    set({ isCheckingAll: false });
  },

  markModelRateLimited: (modelId: string) => {
    const info: ModelRateLimit = { available: false, reason: 'rate_limited', checkedAt: Date.now() };
    const updated = { ...get().rateLimits, [modelId]: info };
    saveRateLimitsToStorage(updated);
    set({ rateLimits: updated });
  },

  setIsApplying: (applying) => set({ isApplying: applying }),

  getModelForRequest: () => get().currentModel,
  getTokenForRequest: () => get().apiToken,
  getRateLimit: (modelId: string) => get().rateLimits[modelId],

  _hydrate: () => {
    const model = loadModelFromStorage();
    const rateLimits = loadRateLimitsFromStorage();
    const apiToken = loadFromStorage(TOKEN_KEY);
    set({ currentModel: model, rateLimits, apiToken });
  },
}));
