import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TaskConfig {
  providerId: string;
  modelId: string;
  parameters?: Record<string, any>;
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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppConfig>(() => {
    const saved = sessionStorage.getItem('gitagent_settings');
    const defaultTask: TaskConfig = { providerId: 'openrouter', modelId: '' };
    const defaults: AppConfig = {
      providerId: 'openrouter',
      modelId: '',
      apiKeys: {},
      mcpServers: [],
      theme: 'light',
      taskModels: {
        scripts: { ...defaultTask },
        knowledge: { ...defaultTask },
        embeddings: { providerId: 'openai', modelId: 'text-embedding-3-small' },
        chatTests: { ...defaultTask },
        memorySeeding: { ...defaultTask },
        documentation: { ...defaultTask },
      }
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...defaults, 
          ...parsed,
          taskModels: { ...defaults.taskModels, ...(parsed.taskModels || {}) }
        };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });

  useEffect(() => {
    sessionStorage.setItem('gitagent_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppConfig>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const setApiKey = (providerId: string, key: string) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [providerId]: key }
    }));
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
