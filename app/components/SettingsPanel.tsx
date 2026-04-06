import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ModelStep } from '../wizard/steps/ModelStep';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Server } from 'lucide-react';

export function SettingsPanel() {
  const { settings, addMcpServer, removeMcpServer } = useSettings();
  const [newMcp, setNewMcp] = useState('');

  const handleAddMcp = () => {
    if (newMcp && !settings.mcpServers.includes(newMcp)) {
      addMcpServer(newMcp);
      setNewMcp('');
    }
  };

  return (
    <div className="space-y-8">
      <ModelStep />
      
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">MCP Servers</h3>
        </div>
        <p className="text-xs text-muted-foreground">Connect to external tools via SSE endpoints.</p>
        
        <div className="flex gap-2">
          <Input 
            placeholder="http://localhost:3001/sse" 
            value={newMcp}
            onChange={e => setNewMcp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddMcp()}
          />
          <Button size="icon" variant="secondary" onClick={handleAddMcp}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {settings.mcpServers.map(url => (
            <div key={url} className="flex items-center justify-between bg-muted/50 p-2 rounded text-xs group">
              <span className="truncate max-w-[200px]">{url}</span>
              <button 
                onClick={() => removeMcpServer(url)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {settings.mcpServers.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-2">No servers connected.</p>
          )}
        </div>
      </div>
    </div>
  );
}
