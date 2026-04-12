import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppConfig {
  providerId: string;
  modelId: string;
  apiKeys: Record<string, string>;
  mcpServers: string[];
  theme: 'light' | 'dark';
}

const SettingsContext = createContext<{
  settings: AppConfig;
  updateSettings: (newSettings: Partial<AppConfig>) => void;
  setApiKey: (providerId: string, key: string) => void;
  addMcpServer: (url: string) => void;
  removeMcpServer: (url: string) => void;
} | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppConfig>(() => {
    const saved = sessionStorage.getItem('gitagent_settings');
    const defaults: AppConfig = {
      providerId: 'openrouter',
      modelId: 'anthropic/claude-3-5-sonnet',
      apiKeys: {},
      mcpServers: [],
      theme: 'light'
    };
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
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
    <SettingsContext.Provider value={{ settings, updateSettings, setApiKey, addMcpServer, removeMcpServer }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
