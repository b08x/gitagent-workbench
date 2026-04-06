import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { providers } from '../../../lib/providers';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export function ModelStep() {
  const { settings, updateSettings, setApiKey } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Generation Model</h2>
        <p className="text-muted-foreground">Choose which LLM will generate your agent.</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Provider</Label>
          <Select 
            value={settings.providerId} 
            onValueChange={v => updateSettings({ providerId: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(providers).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>API Key</Label>
          <Input 
            type="password" 
            placeholder="sk-..." 
            value={settings.apiKeys[settings.providerId] || ''}
            onChange={e => setApiKey(settings.providerId, e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Stored in sessionStorage only. Never persisted.</p>
        </div>

        {!providers[settings.providerId].supportsDirectBrowser && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              {settings.providerId} may require a CORS proxy for direct browser calls. OpenRouter is recommended for browser-native use.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
