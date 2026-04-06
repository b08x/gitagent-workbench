import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { StructureType } from '../../../lib/gitagent/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const structures: { type: StructureType; title: string; description: string; files: string[] }[] = [
  { 
    type: 'minimal', 
    title: 'Minimal', 
    description: 'Just the essentials.', 
    files: ['agent.yaml', 'SOUL.md'] 
  },
  { 
    type: 'standard', 
    title: 'Standard', 
    description: 'Recommended for most agents.', 
    files: ['agent.yaml', 'SOUL.md', 'RULES.md', 'PROMPT.md', 'AGENTS.md', 'skills/', 'tools/'] 
  },
  { 
    type: 'full', 
    title: 'Full', 
    description: 'Comprehensive architecture.', 
    files: ['agent.yaml', 'SOUL.md', 'RULES.md', 'PROMPT.md', 'DUTIES.md', 'workflows/', 'memory/', 'compliance/'] 
  },
];

export function StructureStep() {
  const { state, dispatch } = useAgentWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pick a Structure</h2>
        <p className="text-muted-foreground">Select the architectural complexity of your gitagent.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {structures.map((s) => (
          <Card 
            key={s.type}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              state.meta.structureType === s.type ? "border-primary ring-1 ring-primary" : ""
            )}
            onClick={() => dispatch({ type: 'UPDATE_META', payload: { structureType: s.type } })}
          >
            <CardHeader>
              <CardTitle className="text-lg">{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono text-muted-foreground space-y-1">
                {s.files.map(f => <div key={f}>📄 {f}</div>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
