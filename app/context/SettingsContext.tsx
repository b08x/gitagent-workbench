import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppConfig {
  providerId: string;
  apiKeys: Record<string, string>;
  mcpServers: string[];
}

const SettingsContext = createContext<{
  settings: AppConfig;
  updateSettings: (newSettings: Partial<AppConfig>) => void;
  setApiKey: (providerId: string, key: string) => void;
} | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppConfig>(() => {
    const saved = sessionStorage.getItem('gitagent_settings');
    return saved ? JSON.parse(saved) : {
      providerId: 'openrouter',
      apiKeys: {},
      mcpServers: []
    };
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

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, setApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
