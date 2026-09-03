import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { AgentFramework } from '../../../lib/gitagent/types';
import { 
  AGENT_FRAMEWORK_OPTIONS, 
  AGENT_FRAMEWORK_TOOLS, 
  FRAMEWORK_TOOL_ENTRIES 
} from '../../../lib/gitagent/constants';
import { inferFrameworkTools } from '../../../lib/gitagent/contextToolInference';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  Cpu, 
  CheckCircle2, 
  Zap, 
  Terminal, 
  Sparkles, 
  Layers, 
  Check, 
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

export function RuntimeFrameworkStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const activeFramework: AgentFramework = (state.targetFramework as AgentFramework) || 'hermes_agent';

  const selectFramework = (frameworkId: AgentFramework) => {
    dispatch({ 
      type: 'UPDATE_WORKSPACE', 
      payload: { targetFramework: frameworkId } 
    });

    dispatch({ 
      type: 'UPDATE_MANIFEST', 
      payload: { 
        metadata: { 
          ...(state.manifest.metadata || {}), 
          harness: frameworkId,
          targetFramework: frameworkId
        } 
      } 
    });
  };

  const getFrameworkIcon = (id: AgentFramework) => {
    switch (id) {
      case 'hermes_agent':
        return <Layers className="size-5 text-primary" />;
      case 'claude_code':
        return <Terminal className="size-5 text-amber-500" />;
      case 'google_antigravity':
        return <Sparkles className="size-5 text-blue-500" />;
      case 'mistral_vibe':
        return <Zap className="size-5 text-purple-500" />;
      default:
        return <Cpu className="size-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm">
            <Cpu className="size-4.5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Target Runtime & Harness</h2>
            <p className="text-xs text-muted-foreground">
              Select the execution runtime first to enforce the correct tool taxonomy, permission boundaries, and system prompt format.
            </p>
          </div>
        </div>
      </div>

      {/* Harness Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENT_FRAMEWORK_OPTIONS.map((f) => {
          const isSelected = activeFramework === f.id;
          const tools = AGENT_FRAMEWORK_TOOLS[f.id] || [];
          const previewTools = tools.slice(0, 7);

          return (
            <Card
              key={f.id}
              onClick={() => selectFramework(f.id)}
              className={cn(
                "relative cursor-pointer transition-all border-2 overflow-hidden group hover:shadow-md",
                isSelected
                  ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40 shadow-xs"
                  : "border-border/80 hover:border-primary/50 bg-card/60"
              )}
            >
              {isSelected && (
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1 text-primary text-xs font-mono font-bold bg-primary/10 px-2 py-0.5 rounded-sm">
                  <CheckCircle2 className="size-3.5" /> Active Target
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-sm border shrink-0 transition-colors",
                    isSelected ? "bg-primary/15 border-primary/40" : "bg-muted/40 border-border/80 group-hover:border-border"
                  )}>
                    {getFrameworkIcon(f.id)}
                  </div>
                  <div className="space-y-1 min-w-0 pr-20">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      {f.label}
                    </CardTitle>
                    <Badge variant={isSelected ? "default" : "outline"} className="text-[10px] font-mono py-0 px-1.5 h-4">
                      {tools.length} Canonical Tools
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs leading-relaxed pt-2 text-muted-foreground">
                  {f.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold flex items-center justify-between">
                    <span>Tool Preview</span>
                    <span className="text-[9px] text-muted-foreground/70">{tools.length} total</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {previewTools.map((t) => (
                      <span
                        key={t}
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded-sm border",
                          isSelected
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/40 text-muted-foreground border-border/60"
                        )}
                      >
                        {t}
                      </span>
                    ))}
                    {tools.length > previewTools.length && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 text-muted-foreground/60">
                        +{tools.length - previewTools.length} more
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Harness Capabilities & Context Info */}
      <div className="p-4 bg-muted/30 border border-border/80 rounded-lg flex items-start gap-3 text-xs leading-relaxed">
        <Info className="size-4.5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-muted-foreground">
          <p className="font-semibold text-foreground">
            Current Target Runtime: <span className="text-primary font-bold">{AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework)?.label}</span>
          </p>
          <p>
            Downstream steps (Identity, Capabilities, Tools, Deployment, and Prompt Assembly) will automatically adapt their tool definitions, schemas, and instructions for this runtime harness.
          </p>
        </div>
      </div>
    </div>
  );
}
