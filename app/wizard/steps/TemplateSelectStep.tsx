import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

const templates = [
  {
    id: 'minimal' as const,
    name: 'Minimal',
    description: 'agent.yaml + SOUL.md only',
    fileCount: 2,
    details: 'Perfect for simple task-oriented agents with minimal constraints.'
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    description: 'Adds RULES.md, skills, tools, and knowledge',
    fileCount: 6,
    details: 'The recommended starting point for most production-ready agents.',
    isDefault: true
  },
  {
    id: 'full' as const,
    name: 'Full',
    description: 'Complete suite including memory and compliance',
    fileCount: 12,
    details: 'Enterprise-grade architecture for complex, multi-agent systems.'
  }
];

export function TemplateSelectStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Choose your template</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Select a scaffold to start with. You can always add more components later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-md border-2",
              state.selectedTemplate === template.id 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            )}
            onClick={() => dispatch({ type: 'SET_TEMPLATE', payload: template.id })}
          >
            {state.selectedTemplate === template.id && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {template.isDefault && (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      Default
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {template.fileCount} files
                  </Badge>
                </div>
              </div>
              <CardDescription className="font-medium text-foreground/80">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {template.details}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
