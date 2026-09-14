import React, { useState } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { StructureType, AgentFramework } from '../../../lib/gitagent/types';
import { AGENT_FRAMEWORK_OPTIONS } from '../../../lib/gitagent/constants';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  RefreshCw, 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  Save, 
  Check, 
  AlertTriangle, 
  Layers, 
  FileCode, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResetRestartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestartChat?: () => void;
  onCancelActiveGeneration?: () => void;
  isGenerating?: boolean;
}

const TEMPLATE_OPTIONS: Array<{
  id: StructureType;
  name: string;
  badge: string;
  description: string;
  files: number;
}> = [
  {
    id: 'standard',
    name: 'Standard Agent',
    badge: 'Recommended',
    description: 'agent.yaml, SOUL.md, RULES.md, skills, and tools.',
    files: 6
  },
  {
    id: 'minimal',
    name: 'Minimal Fast-Path',
    badge: 'Lean',
    description: 'Lightweight agent.yaml + SOUL.md only for low-latency tasks.',
    files: 2
  },
  {
    id: 'full',
    name: 'Autonomous Worker',
    badge: 'Full Suite',
    description: 'Autonomous multi-step execution with memory, duties, and compliance.',
    files: 12
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    badge: 'Specialist',
    description: 'Structured CSV/JSON schemas, visualization rules, and analysis skills.',
    files: 8
  },
  {
    id: 'web-scraper',
    name: 'Web Scraper & Miner',
    badge: 'Extraction',
    description: 'DOM parsing, rate limits, schema validation, and headless patterns.',
    files: 7
  },
  {
    id: 'researcher',
    name: 'Deep Researcher',
    badge: 'Synthesis',
    description: 'Multi-source citation, fact verification, and structured report synthesis.',
    files: 9
  }
];

export function ResetRestartDialog({
  open,
  onOpenChange,
  onRestartChat,
  onCancelActiveGeneration,
  isGenerating = false
}: ResetRestartDialogProps) {
  const { state, dispatch } = useAgentWorkspace();
  const [activeTab, setActiveTab] = useState<'chat' | 'full' | 'template'>(
    isGenerating ? 'chat' : 'full'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<StructureType>('standard');
  const [saveSnapshotBeforeReset, setSaveSnapshotBeforeReset] = useState(true);
  const [confirmedFullReset, setConfirmedFullReset] = useState(false);

  const frameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === state.targetFramework) || AGENT_FRAMEWORK_OPTIONS[0];
  const agentName = state.manifest.name || (state.manifest as any).agent?.name || 'Untitled Agent';
  const hasGeneratedFiles = Boolean(state.soul || state.rules || state.prompt_md || (state.manifest.skills?.length));

  const handleExecuteReset = () => {
    // Stop active generation if running
    if (isGenerating && onCancelActiveGeneration) {
      onCancelActiveGeneration();
    }

    // Optionally save a recovery snapshot before wiping
    if (saveSnapshotBeforeReset && hasGeneratedFiles) {
      dispatch({ 
        type: 'SAVE_SNAPSHOT', 
        payload: `Pre-Reset Backup (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` 
      });
    }

    if (activeTab === 'chat') {
      if (onRestartChat) onRestartChat();
      onOpenChange(false);
      return;
    }

    if (activeTab === 'full') {
      dispatch({
        type: 'RESET_WORKSPACE',
        payload: {
          template: 'standard',
          targetFramework: (state.targetFramework as AgentFramework) || 'hermes_agent',
          repoName: state.git?.repoName || 'my-gitagent',
          keepHistory: true
        }
      });
      if (onRestartChat) onRestartChat();
      onOpenChange(false);
      return;
    }

    if (activeTab === 'template') {
      dispatch({
        type: 'RESET_WORKSPACE',
        payload: {
          template: selectedTemplate,
          targetFramework: (state.targetFramework as AgentFramework) || 'hermes_agent',
          repoName: state.git?.repoName || 'my-gitagent',
          keepHistory: true
        }
      });
      if (onRestartChat) onRestartChat();
      onOpenChange(false);
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border border-border rounded-none shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-background border border-border text-foreground rounded-none">
                <RotateCcw className="size-4" />
              </span>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground font-mono">
                RESET // RESTART AGENT BUILDER
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-border">
              {frameworkMeta.label}
            </Badge>
          </div>
          <DialogDescription className="type-doc text-xs text-muted-foreground leading-relaxed">
            Select a reset mode. You can restart the conversational architect, revert to a clean slate, or re-initialize from a starter template.
          </DialogDescription>
        </div>

        {/* Current Workspace State Summary */}
        <div className="px-5 py-2.5 bg-background border-b border-border flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 truncate">
            <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold">ACTIVE AGENT:</span>
            <span className="text-foreground font-semibold truncate">{agentName}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground shrink-0 text-[11px]">
            <span>SOUL: <strong className={state.soul ? "text-[#1f6a38]" : "text-muted-foreground"}>{state.soul ? 'Configured' : 'Empty'}</strong></span>
            <span>RULES: <strong className={state.rules ? "text-[#1f6a38]" : "text-muted-foreground"}>{state.rules ? 'Configured' : 'Empty'}</strong></span>
            <span>Skills: <strong className="text-foreground">{state.manifest.skills?.length || 0}</strong></span>
          </div>
        </div>

        {/* Tabs Selection */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={cn(
                "p-3 text-left border rounded-none transition-none flex flex-col gap-1.5 cursor-pointer",
                activeTab === 'chat'
                  ? "border-primary bg-muted text-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <MessageSquare className="size-3.5 text-[#b45309]" />
                <span>Restart Chat</span>
              </div>
              <span className="type-doc text-[11px] leading-snug opacity-80">
                Clear chat thread & suggestions. Keeps all files intact.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('full')}
              className={cn(
                "p-3 text-left border rounded-none transition-none flex flex-col gap-1.5 cursor-pointer",
                activeTab === 'full'
                  ? "border-destructive bg-destructive/10 text-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <RefreshCw className="size-3.5 text-destructive" />
                <span>Clean Slate</span>
              </div>
              <span className="type-doc text-[11px] leading-snug opacity-80">
                Wipe all files and start a brand new blank agent.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={cn(
                "p-3 text-left border rounded-none transition-none flex flex-col gap-1.5 cursor-pointer",
                activeTab === 'template'
                  ? "border-[#b45309] bg-[#b45309]/10 text-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <Sparkles className="size-3.5 text-[#b45309]" />
                <span>From Template</span>
              </div>
              <span className="type-doc text-[11px] leading-snug opacity-80">
                Reset and populate from a proven agent archetype.
              </span>
            </button>
          </div>

          {/* Tab 1: Restart Chat Detail */}
          {activeTab === 'chat' && (
            <div className="p-3.5 bg-muted border border-border space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-[#1f6a38]/10 border border-[#1f6a38]/30 text-[#1f6a38] mt-0.5">
                  <Check className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-foreground">SAFE CONVERSATION REFRESH</h4>
                  <p className="type-doc text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    This clears the prompt history and re-arms the AI Architect with initial suggestions. Your current agent configuration, files, and repository state will <strong>not</strong> be modified.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Full Reset Detail (DESTRUCTIVE - strictly red) */}
          {activeTab === 'full' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-destructive/10 border border-destructive/30 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-mono text-destructive">DESTRUCTIVE ACTION: CLEAN SLATE</h4>
                    <p className="type-doc text-[11px] text-muted-foreground leading-relaxed">
                      This action completely clears the current agent draft (SOUL.md, RULES.md, PROMPT.md, manifests, and skills), returning the builder to a blank starting state.
                    </p>
                  </div>
                </div>
              </div>

              {/* Safety snapshot checkbox */}
              {hasGeneratedFiles && (
                <label className="flex items-center gap-2 text-xs font-mono text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveSnapshotBeforeReset}
                    onChange={(e) => setSaveSnapshotBeforeReset(e.target.checked)}
                    className="size-3.5 rounded-none accent-destructive"
                  />
                  <span>Save snapshot backup to Git history before resetting (recommended)</span>
                </label>
              )}
            </div>
          )}

          {/* Tab 3: Template Picker Detail */}
          {activeTab === 'template' && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted-foreground">
                SELECT STARTER BLUEPRINT ARCHETYPE:
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {TEMPLATE_OPTIONS.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={cn(
                        "p-2.5 text-left border rounded-none transition-none flex flex-col gap-1 cursor-pointer",
                        isSelected
                          ? "border-primary bg-muted text-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-foreground">{tmpl.name}</span>
                        <Badge variant={isSelected ? "amber" : "outline"} className="text-[9px]">
                          {tmpl.badge}
                        </Badge>
                      </div>
                      <p className="type-doc text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {tmpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-mono border-border text-foreground hover:border-primary"
          >
            Cancel & Keep Working
          </Button>

          <Button
            variant={activeTab === 'full' ? "destructive" : activeTab === 'template' ? "amber" : "default"}
            size="sm"
            onClick={handleExecuteReset}
            className="text-xs font-semibold gap-1.5 shadow-xs font-sans"
          >
            {activeTab === 'chat' && (
              <>
                <RotateCcw className="size-3.5" />
                <span>Restart Conversation</span>
              </>
            )}
            {activeTab === 'full' && (
              <>
                <Trash2 className="size-3.5" />
                <span>Confirm Full Reset</span>
              </>
            )}
            {activeTab === 'template' && (
              <>
                <Sparkles className="size-3.5" />
                <span>Reset & Apply Template</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
