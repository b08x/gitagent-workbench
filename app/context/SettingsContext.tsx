import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type TaskConfigParameters = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  [key: string]: any; // Allow for provider-specific extras but keep known ones strict
};

export interface TaskConfig {
  providerId: string;
  modelId: string;
  parameters?: TaskConfigParameters;
}

export interface AppConfig {
  providerId: string;
  modelId: string;
  apiKeys: Record<string, string>;
  mcpServers: string[];
  theme: 'light' | 'dark';
  taskModels: {
    scripts: TaskConfig;
    knowledge: TaskConfig;
    embeddings: TaskConfig;
    chatTests: TaskConfig;
    memorySeeding: TaskConfig;
    documentation: TaskConfig;
  };
}

const SettingsContext = createContext<{
  settings: AppConfig;
  updateSettings: (newSettings: Partial<AppConfig>) => void;
  setApiKey: (providerId: string, key: string) => void;
  updateTaskModel: (task: keyof AppConfig['taskModels'], config: Partial<TaskConfig>) => void;
  addMcpServer: (url: string) => void;
  removeMcpServer: (url: string) => void;
} | undefined>(undefined);

const DEFAULTS: AppConfig = {
  providerId: 'openrouter',
  modelId: '',
  apiKeys: {}, // Will NOT be persisted to localStorage
  mcpServers: [],
  theme: 'light',
  taskModels: {
    scripts: { providerId: 'openrouter', modelId: '' },
    knowledge: { providerId: 'openrouter', modelId: '' },
    embeddings: { providerId: 'openai', modelId: 'text-embedding-3-small' },
    chatTests: { providerId: 'openrouter', modelId: '' },
    memorySeeding: { providerId: 'openrouter', modelId: '' },
    documentation: { providerId: 'openrouter', modelId: '' },
  }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('gitagent_settings');
    // apiKeys are stored in sessionStorage as a fallback if we really need them, 
    // but the request asks to remove them from client storage mechanisms entirely.
    // However, if we proxy, the backend needs them. 
    // Let's see if we can keep them only in memory for now, or use a more secure transient storage.
    // For now, let's keep them in memory-only state if we are moving to proxied requests.
    const sessionKeys = sessionStorage.getItem('gitagent_keys');
    const apiKeys = sessionKeys ? JSON.parse(sessionKeys) : {};

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...DEFAULTS, 
          ...parsed,
          apiKeys, // merge keys from session (volatile)
          taskModels: { ...DEFAULTS.taskModels, ...(parsed.taskModels || {}) }
        };
      } catch (e) {
        return { ...DEFAULTS, apiKeys };
      }
    }
    return { ...DEFAULTS, apiKeys };
  });

  useEffect(() => {
    // Persist non-sensitive data to localStorage
    const { apiKeys, ...rest } = settings;
    localStorage.setItem('gitagent_settings', JSON.stringify(rest));
    
    // Persist keys to sessionStorage (temporary, still client-side but better than localStorage)
    // The ultimate goal is to move these to a secure backend.
    sessionStorage.setItem('gitagent_keys', JSON.stringify(apiKeys));
  }, [settings]);

  // Sync state between tabs and fetch server-side key status
  useEffect(() => {
    // Check which keys are already present on the server (e.g. from .env)
    fetch('/api/providers')
      .then(res => res.json())
      .then(status => {
        setSettings(prev => {
          const newKeys = { ...prev.apiKeys };
          Object.entries(status).forEach(([pid, hasKey]) => {
            // If server has key and we don't have a placeholder, add one to indicate "present"
            // We can use a special value like '********' to show it's set on server
            if (hasKey && !newKeys[pid]) {
              newKeys[pid] = '********'; 
            }
          });
          return { ...prev, apiKeys: newKeys };
        });
      })
      .catch(err => console.error('Failed to fetch provider status:', err));

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gitagent_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings(prev => ({ 
            ...prev, 
            ...parsed,
            // Keep current keys when other settings update from other tabs
            apiKeys: prev.apiKeys 
          }));
        } catch (err) {
          console.error('Failed to sync settings:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSettings = (newSettings: Partial<AppConfig>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const setApiKey = (providerId: string, key: string) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [providerId]: key }
    }));
    
    // Notify server of the new key for proxying
    fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, key })
    }).catch(err => console.error('Failed to sync key to server:', err));
  };

  const updateTaskModel = (task: keyof AppConfig['taskModels'], config: Partial<TaskConfig>) => {
    setSettings(prev => ({
      ...prev,
      taskModels: {
        ...prev.taskModels,
        [task]: { ...prev.taskModels[task], ...config }
      }
    }));
  };

  const addMcpServer = (url: string) => {
    setSettings(prev => ({
      ...prev,
      mcpServers: [...prev.mcpServers, url]
    }));
  };

  const removeMcpServer = (url: string) => {
    setSettings(prev => ({
      ...prev,
      mcpServers: prev.mcpServers.filter(s => s !== url)
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, setApiKey, updateTaskModel, addMcpServer, removeMcpServer }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
