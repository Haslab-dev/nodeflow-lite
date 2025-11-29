// AI Configuration Storage with encryption
// Stores API keys encrypted in localStorage for reuse across workflows

export type AIProvider = 'openai-compatible' | 'deepseek' | 'openrouter' | 'zhipu';

export interface AIConfig {
  id: string;
  name: string;
  provider: AIProvider;
  baseUrl: string;
  apiKey: string; // Stored encrypted
  model: string;
  createdAt: number;
}

const STORAGE_KEY = 'nodeflow_ai_configs';
const ENCRYPTION_KEY = 'nodeflow_secret_key_2024'; // In production, use a proper key management

// Simple XOR encryption for localStorage (not cryptographically secure, but obfuscates the key)
function encrypt(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function decrypt(encoded: string): string {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

export function getAIConfigs(): AIConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const configs = JSON.parse(stored) as AIConfig[];
    // Decrypt API keys when reading
    return configs.map(c => ({ ...c, apiKey: decrypt(c.apiKey) }));
  } catch {
    return [];
  }
}

export function saveAIConfig(config: Omit<AIConfig, 'id' | 'createdAt'>): AIConfig {
  const configs = getAIConfigs();
  const newConfig: AIConfig = {
    ...config,
    provider: config.provider || 'openai-compatible',
    id: `ai_${Date.now()}`,
    createdAt: Date.now(),
  };
  
  // Encrypt API key before storing
  const toStore = configs.map(c => ({ ...c, apiKey: encrypt(c.apiKey) }));
  toStore.push({ ...newConfig, apiKey: encrypt(newConfig.apiKey) });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  return newConfig;
}

export function updateAIConfig(id: string, updates: Partial<Omit<AIConfig, 'id' | 'createdAt'>>): AIConfig | null {
  const configs = getAIConfigs();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  const existing = configs[index];
  if (!existing) return null;
  
  const updatedConfig: AIConfig = { 
    id: existing.id,
    createdAt: existing.createdAt,
    name: updates.name ?? existing.name,
    provider: updates.provider ?? existing.provider ?? 'openai-compatible',
    baseUrl: updates.baseUrl ?? existing.baseUrl,
    apiKey: updates.apiKey ?? existing.apiKey,
    model: updates.model ?? existing.model,
  };
  configs[index] = updatedConfig;
  
  // Encrypt API keys before storing
  const toStore = configs.map(c => ({ ...c, apiKey: encrypt(c.apiKey) }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  
  return updatedConfig;
}

export function deleteAIConfig(id: string): boolean {
  const configs = getAIConfigs();
  const filtered = configs.filter(c => c.id !== id);
  if (filtered.length === configs.length) return false;
  
  const toStore = filtered.map(c => ({ ...c, apiKey: encrypt(c.apiKey) }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  return true;
}

export function getAIConfigById(id: string): AIConfig | null {
  const configs = getAIConfigs();
  const found = configs.find(c => c.id === id);
  return found ?? null;
}

// Default presets for supported providers
export const AI_PRESETS: { name: string; provider: AIProvider; baseUrl: string; model: string }[] = [
  { name: 'OpenAI Compatible', provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', provider: 'deepseek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'OpenRouter', provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' },
  { name: 'Zhipu AI', provider: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
];
