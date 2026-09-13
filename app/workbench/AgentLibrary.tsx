import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { getLibrary, deleteFromLibrary, AgentLibraryEntry } from '../../lib/gitagent/agentLibrary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Library, Trash2, Edit2, Play, Plus, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AgentLibrary() {
  const navigate = useNavigate();
  const { dispatch } = useAgentWorkspace();
  const [agents, setAgents] = useState<AgentLibraryEntry[]>([]);

  useEffect(() => {
    setAgents(getLibrary());
  }, []);

  const handleLoad = (entry: AgentLibraryEntry) => {
    dispatch({ type: 'SET_WORKSPACE', payload: entry.workspace });
    navigate('/workbench/agent');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this agent from the library?')) {
      deleteFromLibrary(id);
      setAgents(getLibrary());
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Library className="size-6 text-primary" /> Agent Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your saved agents and switch contexts.
          </p>
        </div>
        <Button 
          onClick={() => {
            // Optional: reset workspace to blank
            navigate('/workbench/agent');
          }}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium gap-1.5"
        >
          <Plus className="size-4" /> New Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/80 rounded-md bg-muted/10">
          <Library className="size-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-sm font-semibold">Library is empty</h3>
          <p className="text-xs text-muted-foreground mt-1">Agents will appear here when you create snapshots.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <Card key={agent.id} className="bg-card border-border/80 p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-foreground truncate">{agent.name}</h3>
                  <Badge variant="outline" className="text-[9px] uppercase font-mono">
                    {agent.workspace?.manifest?.compliance?.risk_tier || 'T1'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                  {agent.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-1 mt-3 text-[10px] font-mono text-muted-foreground">
                  <Clock className="size-3" />
                  {new Date(agent.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleLoad(agent)}>
                  <Edit2 className="size-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(agent.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
