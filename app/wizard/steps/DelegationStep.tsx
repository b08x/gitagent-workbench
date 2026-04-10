import React, { useState } from 'react';
import { useAgentWorkspace, SubAgentEntry, A2AServerEntry } from '../../context/AgentContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Globe, Users } from 'lucide-react';
import { SubAgentMiniWizard } from '../components/SubAgentMiniWizard';

export function DelegationStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const [showAddAgent, setShowAddAgent] = useState(false);

  if (state.selectedTemplate !== 'full') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Delegation is only available for the Full template.</p>
      </div>
    );
  }

  const updateDelegation = (mode: 'auto' | 'manual' | 'none') => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        delegation: { ...state.delegation, mode }
      }
    });
  };

  const addAgent = (agent: SubAgentEntry) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        subAgentsList: [...state.subAgentsList, agent]
      }
    });
    setShowAddAgent(false);
  };

  const removeAgent = (index: number) => {
    const newList = [...state.subAgentsList];
    newList.splice(index, 1);
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { subAgentsList: newList }
    });
  };

  const addA2A = () => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        a2aServers: [...state.a2aServers, { url: '', capabilities: [], authentication: { type: 'bearer' } }]
      }
    });
  };

  const updateA2A = (index: number, updates: Partial<A2AServerEntry>) => {
    const newList = [...state.a2aServers];
    newList[index] = { ...newList[index], ...updates };
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { a2aServers: newList }
    });
  };

  const removeA2A = (index: number) => {
    const newList = [...state.a2aServers];
    newList.splice(index, 1);
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { a2aServers: newList }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Delegation & Sub-Agents</h2>
        <p className="text-muted-foreground">Configure how your agent manages tasks and delegates to other agents.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delegation Mode</CardTitle>
            <CardDescription>How the agent decides to hand off tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="delegation-mode">Mode</Label>
              <Select value={state.delegation.mode} onValueChange={v => updateDelegation(v as any)}>
                <SelectTrigger id="delegation-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Autonomous routing)</SelectItem>
                  <SelectItem value="manual">Manual (Explicit triggers)</SelectItem>
                  <SelectItem value="none">None (Single agent only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Sub-Agents</h3>
            </div>
            {!showAddAgent && (
              <Button size="sm" onClick={() => setShowAddAgent(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Agent
              </Button>
            )}
          </div>

          {showAddAgent && (
            <SubAgentMiniWizard 
              onSave={addAgent} 
              onCancel={() => setShowAddAgent(false)} 
            />
          )}

          <div className="grid gap-4">
            {state.subAgentsList.map((agent, i) => (
              <Card key={i}>
                <CardContent className="pt-6 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{agent.name}</span>
                      <Badge variant="secondary">{agent.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                    <div className="flex gap-1 mt-2">
                      {agent.permissions.map(p => (
                        <Badge key={p} variant="outline" className="text-[10px] uppercase">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAgent(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">External A2A Servers</h3>
            </div>
            <Button size="sm" variant="outline" onClick={addA2A}>
              <Plus className="mr-2 h-4 w-4" /> Add A2A Server
            </Button>
          </div>

          <div className="grid gap-4">
            {state.a2aServers.map((server, i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid gap-2 flex-1">
                      <Label>Server URL</Label>
                      <Input 
                        placeholder="https://api.agent-network.com/v1" 
                        value={server.url}
                        onChange={e => updateA2A(i, { url: e.target.value })}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="mt-8" onClick={() => removeA2A(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label>Capabilities (comma-separated)</Label>
                    <Input 
                      placeholder="search, analysis, code-execution" 
                      value={server.capabilities.join(', ')}
                      onChange={e => updateA2A(i, { capabilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
