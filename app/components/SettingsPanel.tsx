import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ModelStep } from '../wizard/steps/ModelStep';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Plus, X, Server, Moon, Sun, Sparkles, Brain, Monitor, Globe } from 'lucide-react';
import { TaskModelSettings } from './TaskModelSettings';

export function SettingsPanel() {
  const { settings, updateSettings, addMcpServer, removeMcpServer } = useSettings();
  const [newMcp, setNewMcp] = useState('');

  const handleAddMcp = () => {
    if (newMcp && !settings.mcpServers.includes(newMcp)) {
      addMcpServer(newMcp);
      setNewMcp('');
    }
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const toggleDebug = () => {
    updateSettings({ debugLogging: !settings.debugLogging });
  };

  return (
    <Tabs defaultValue="global" className="w-full">
      <TabsList className="grid grid-cols-4 w-full mb-6">
        <TabsTrigger value="global" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">Global</span>
        </TabsTrigger>
        <TabsTrigger value="generation" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Generation</span>
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks</span>
        </TabsTrigger>
        <TabsTrigger value="mcp" className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          <span className="hidden sm:inline">MCP</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="global" className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes.</p>
              </div>
            </div>
            <Switch 
              checked={settings.theme === 'dark'} 
              onCheckedChange={toggleTheme} 
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Debug Logging</p>
                <p className="text-xs text-muted-foreground">Enable verbose logs in the browser console.</p>
              </div>
            </div>
            <Switch 
              checked={settings.debugLogging} 
              onCheckedChange={toggleDebug} 
            />
          </div>

          <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Persistence Status
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              API keys entered manually are session-only. To persist them, use the <span className="font-bold text-foreground underline decoration-primary/50 underline-offset-2">Secrets</span> button in the AI Studio header.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {settings.envProviders?.map(pid => (
                <Badge key={pid} variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 capitalize font-mono px-2 py-0.5">
                  {pid} ACTIVE
                </Badge>
              ))}
              {(!settings.envProviders || settings.envProviders.length === 0) && (
                <p className="text-[10px] text-muted-foreground italic bg-muted/50 px-2 py-1 rounded">No persistent keys found.</p>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="generation">
        <div className="bg-muted/10 p-1 rounded-lg">
          <ModelStep hideRuntime={true} />
        </div>
      </TabsContent>

      <TabsContent value="tasks">
        <div className="bg-muted/10 p-1 rounded-lg">
          <TaskModelSettings />
        </div>
      </TabsContent>

      <TabsContent value="mcp" className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">MCP Servers</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Model Context Protocol (MCP) servers allow your agent to connect to external tools, databases, and APIs via specialized SSE endpoints.
          </p>
          
          <div className="flex gap-2 bg-muted/30 p-2 rounded-lg">
            <Input 
              placeholder="https://mcp-server.example.com/sse" 
              value={newMcp}
              className="bg-background border-none shadow-none"
              onChange={e => setNewMcp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMcp()}
            />
            <Button size="default" variant="default" onClick={handleAddMcp} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>

          <div className="space-y-2 mt-4">
            {settings.mcpServers.map(url => (
              <div key={url} className="flex items-center justify-between bg-muted/50 px-4 py-3 rounded-lg text-sm border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="truncate font-mono text-xs">{url}</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => removeMcpServer(url)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {settings.mcpServers.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <div className="bg-muted w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No MCP servers connected</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Connect a server to expand your agent's capabilities</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
