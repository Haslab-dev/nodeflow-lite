// MQTT Broker Configuration Storage
// Stores MQTT broker configs in localStorage for reuse across workflows

export interface MQTTConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string; // Stored encrypted
  tls: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'nodeflow_mqtt_configs';
const ENCRYPTION_KEY = 'nodeflow_mqtt_key_2024';

// Simple XOR encryption for localStorage
function encrypt(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function decrypt(encoded: string): string {
  if (!encoded) return '';
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

export function getMQTTConfigs(): MQTTConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const configs = JSON.parse(stored) as MQTTConfig[];
    // Decrypt passwords when reading
    return configs.map(c => ({ ...c, password: c.password ? decrypt(c.password) : '' }));
  } catch {
    return [];
  }
}

export function saveMQTTConfig(config: Omit<MQTTConfig, 'id' | 'createdAt'>): MQTTConfig {
  const configs = getMQTTConfigs();
  const newConfig: MQTTConfig = {
    ...config,
    id: `mqtt_${Date.now()}`,
    createdAt: Date.now(),
  };
  
  // Encrypt password before storing
  const toStore = configs.map(c => ({ ...c, password: c.password ? encrypt(c.password) : '' }));
  toStore.push({ ...newConfig, password: newConfig.password ? encrypt(newConfig.password) : '' });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  return newConfig;
}

export function updateMQTTConfig(id: string, updates: Partial<Omit<MQTTConfig, 'id' | 'createdAt'>>): MQTTConfig | null {
  const configs = getMQTTConfigs();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  const existing = configs[index];
  if (!existing) return null;
  
  const updatedConfig: MQTTConfig = { 
    id: existing.id,
    createdAt: existing.createdAt,
    name: updates.name ?? existing.name,
    url: updates.url ?? existing.url,
    username: updates.username ?? existing.username,
    password: updates.password ?? existing.password,
    tls: updates.tls ?? existing.tls,
  };
  configs[index] = updatedConfig;
  
  // Encrypt passwords before storing
  const toStore = configs.map(c => ({ ...c, password: c.password ? encrypt(c.password) : '' }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  
  return updatedConfig;
}

export function deleteMQTTConfig(id: string): boolean {
  const configs = getMQTTConfigs();
  const filtered = configs.filter(c => c.id !== id);
  if (filtered.length === configs.length) return false;
  
  const toStore = filtered.map(c => ({ ...c, password: c.password ? encrypt(c.password) : '' }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  return true;
}

export function getMQTTConfigById(id: string): MQTTConfig | null {
  const configs = getMQTTConfigs();
  const found = configs.find(c => c.id === id);
  return found ?? null;
}

// Default presets for common MQTT brokers
export const MQTT_PRESETS: { name: string; url: string; tls: boolean }[] = [
  { name: 'Local Broker', url: 'mqtt://localhost:1883', tls: false },
  { name: 'HiveMQ Public', url: 'mqtt://broker.hivemq.com:1883', tls: false },
  { name: 'Eclipse Mosquitto', url: 'mqtt://test.mosquitto.org:1883', tls: false },
  { name: 'EMQX Public', url: 'mqtt://broker.emqx.io:1883', tls: false },
];
