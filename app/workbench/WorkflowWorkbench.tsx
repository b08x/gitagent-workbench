import React, { useState, useMemo, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { WorkflowSchema, WorkflowStep } from '../../lib/gitagent/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Play, 
  GitBranch, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUp, 
  ArrowDown,
  Search,
  Workflow,
  Settings2,
  ListTree,
  ShieldCheck,
  AlertCircle,
  Code2,
  Info,
  X as LucideX
} from 'lucide-react';
import yaml from 'js-yaml';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const TOOLTIP_CONTENT = {
  workflowName: "A unique identifier for the workflow. Must be kebab-case (e.g., 'data-processing').",
  version: "Semantic versioning (e.g., 1.0.0) to track changes to the workflow.",
  description: "A summary of the workflow's purpose and expected outcomes.",
  inputs: "Parameters required to initiate the workflow. Passed in at start.",
  outputs: "The final results produced by the workflow once completed.",
  onStepFailure: "Default strategy if a step fails: 'fail' (stop), 'retry', 'skip', or 'escalate'.",
  escalationTarget: "The role or user ID to notify when a step failure is escalated.",
  onFailureGlobal: "A global action to trigger if the workflow fails permanently.",
  notificationChannel: "Where failure alerts or status updates are sent (e.g., #channel).",
  actionDescription: "Natural language goal of this step. Used by agents to plan execution.",
  executor: "The worker for the action: Skills (logic), Agents (AI), or Tools (external).",
  dependsOn: "Prerequisite steps that must succeed before this step can execute.",
  stepOutputs: "Variables produced by this step that can be used later in the workflow.",
  inputsMapping: "Map results from previous steps to the parameters for this executor.",
  conditions: "Expressions that must be true for the step to run (e.g., ${{ steps.s1.status == 'ok' }}).",
  compliance: "Controls for security: 'Audit' logs detail, 'Approval' pauses for human review.",
};

function InfoTip({ content }: { content: string }) {
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-primary cursor-help transition-colors shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-[10px] leading-relaxed p-2">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const INPUT_TYPES = ['file', 'string', 'number', 'boolean', 'object'];
const ERROR_STRATEGIES = ['escalate', 'retry', 'skip', 'fail'];

const validateKebabCase = (str: string) => /^[a-z][a-z0-9-]*$/.test(str);

const createEmptyStep = (id: string): WorkflowStep => ({
  id,
  action: '',
  depends_on: [],
  inputs: {},
  outputs: [],
  conditions: [],
});

const createEmptyWorkflow = (): WorkflowSchema => ({
  name: 'new-workflow',
  description: '',
  version: '1.0.0',
  inputs: [],
  outputs: [],
  steps: [createEmptyStep('step-1')],
  error_handling: {
    on_step_failure: 'fail',
  },
});

// ─── Components ──────────────────────────────────────────────────────────────

export function WorkflowWorkbench() {
  const { state, dispatch } = useAgentWorkspace();
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowSchema | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Derived Data ───────────────────────────────────────────────────────────

  const workflows = state.workflows || {};
  const workflowList = Object.entries(workflows).map(([id, w]) => ({ id, ...w }));
  
  const filteredWorkflows = workflowList.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeWorkflow = useMemo(() => {
    if (activeWorkflowId && workflows[activeWorkflowId]) {
      return workflows[activeWorkflowId];
    }
    return null;
  }, [activeWorkflowId, workflows]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleNewWorkflow = () => {
    const newW = createEmptyWorkflow();
    setEditingWorkflow(newW);
    setActiveWorkflowId(null);
  };

  const handleSelectWorkflow = (id: string) => {
    setActiveWorkflowId(id);
    setEditingWorkflow(JSON.parse(JSON.stringify(workflows[id])));
  };

  const handleDeleteWorkflow = (id: string) => {
    const newWorkflows = { ...workflows };
    delete newWorkflows[id];
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { workflows: newWorkflows } });
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
      setEditingWorkflow(null);
    }
  };

  const handleSave = () => {
    if (!editingWorkflow || !validateKebabCase(editingWorkflow.name)) return;
    
    const newWorkflows = { ...workflows, [editingWorkflow.name]: editingWorkflow };
    // If name changed, delete the old one
    if (activeWorkflowId && activeWorkflowId !== editingWorkflow.name) {
      delete newWorkflows[activeWorkflowId];
    }
    
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { workflows: newWorkflows } });
    setActiveWorkflowId(editingWorkflow.name);
  };

  // ── Form Handlers ──────────────────────────────────────────────────────────

  const updateWorkflow = (updates: Partial<WorkflowSchema>) => {
    if (!editingWorkflow) return;
    setEditingWorkflow({ ...editingWorkflow, ...updates });
  };

  const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
    if (!editingWorkflow) return;
    const newSteps = [...editingWorkflow.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  const addStep = () => {
    if (!editingWorkflow) return;
    const nextId = `step-${editingWorkflow.steps.length + 1}`;
    setEditingWorkflow({
      ...editingWorkflow,
      steps: [...editingWorkflow.steps, createEmptyStep(nextId)]
    });
  };

  const removeStep = (index: number) => {
    if (!editingWorkflow) return;
    const newSteps = editingWorkflow.steps.filter((_, i) => i !== index);
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (!editingWorkflow) return;
    const newSteps = [...editingWorkflow.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const stepIdErrors = useMemo(() => {
    if (!editingWorkflow) return {};
    const errors: Record<string, string> = {};
    const ids = editingWorkflow.steps.map(s => s.id);
    
    editingWorkflow.steps.forEach((step, idx) => {
      if (!validateKebabCase(step.id)) {
        errors[idx] = 'Must be kebab-case (e.g., step-name)';
      } else if (ids.indexOf(step.id) !== idx) {
        errors[idx] = 'Must be unique within workflow';
      }
    });
    return errors;
  }, [editingWorkflow]);

  const dagAnalysis = useMemo(() => {
    if (!editingWorkflow) return { cycles: [], unresolved: {} };
    
    const steps = editingWorkflow.steps;
    const idToIndex = new Map(steps.map((s, i) => [s.id, i]));
    const unresolved: Record<number, string[]> = {};
    
    // Check unresolved
    steps.forEach((step, idx) => {
      const missing = step.depends_on?.filter(id => !idToIndex.has(id)) || [];
      if (missing.length > 0) unresolved[idx] = missing;
    });

    // Simple cycle detection (DFS)
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const findCycles = (u: string, path: string[]) => {
      visited.add(u);
      recStack.add(u);
      
      const step = steps.find(s => s.id === u);
      if (step?.depends_on) {
        for (const v of step.depends_on) {
          if (!visited.has(v)) {
            findCycles(v, [...path, v]);
          } else if (recStack.has(v)) {
            cycles.push([...path, v]);
          }
        }
      }
      recStack.delete(u);
    };

    steps.forEach(s => {
      if (!visited.has(s.id)) findCycles(s.id, [s.id]);
    });

    return { cycles, unresolved };
  }, [editingWorkflow]);

  const isValid = editingWorkflow && 
    validateKebabCase(editingWorkflow.name) && 
    editingWorkflow.steps.length > 0 &&
    Object.keys(stepIdErrors).length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden border-t">
      {/* Left Panel: Workflow List */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              Workflows
            </h2>
            <Button size="sm" variant="outline" onClick={handleNewWorkflow}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search workflows..." 
              className="pl-8 h-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredWorkflows.map(w => (
            <div 
              key={w.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent group relative",
                activeWorkflowId === w.id ? "bg-accent border-primary" : "bg-card"
              )}
              onClick={() => handleSelectWorkflow(w.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm truncate pr-6">{w.name}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {w.steps.length} steps
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{w.description || 'No description'}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkflow(w.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {filteredWorkflows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No workflows found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {editingWorkflow ? (
          <>
            <div className="h-14 border-b px-6 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Workflow className="h-5 w-5 text-primary" />
                <span className="font-semibold">{editingWorkflow.name || 'Untitled Workflow'}</span>
                {activeWorkflowId && activeWorkflowId !== editingWorkflow.name && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    Renaming...
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={!isValid}
                >
                  {activeWorkflowId ? 'Update Workflow' : 'Add to Agent'}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Section 1: Identity */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Identity</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="wf-name">Workflow Name</Label>
                        <InfoTip content={TOOLTIP_CONTENT.workflowName} />
                      </div>
                      <Input 
                        id="wf-name"
                        value={editingWorkflow.name}
                        onChange={e => updateWorkflow({ name: e.target.value })}
                        placeholder="e.g., data-processing-pipeline"
                        className={cn(!validateKebabCase(editingWorkflow.name) && "border-destructive focus-visible:ring-destructive")}
                      />
                      {!validateKebabCase(editingWorkflow.name) && (
                        <p className="text-[10px] text-destructive">Must be kebab-case (e.g., my-workflow)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="wf-version">Version</Label>
                        <InfoTip content={TOOLTIP_CONTENT.version} />
                      </div>
                      <Input 
                        id="wf-version"
                        value={editingWorkflow.version}
                        onChange={e => updateWorkflow({ version: e.target.value })}
                        placeholder="1.0.0"
                      />
                      <p className="text-[10px] text-muted-foreground italic">Use semver (e.g., 1.2.0)</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="wf-desc">Description</Label>
                      <InfoTip content={TOOLTIP_CONTENT.description} />
                    </div>
                    <Textarea 
                      id="wf-desc"
                      value={editingWorkflow.description}
                      onChange={e => updateWorkflow({ description: e.target.value })}
                      placeholder="Describe what this workflow accomplishes..."
                      className="min-h-[80px]"
                    />
                  </div>
                </section>

                <Separator />

                {/* Section 2: Inputs/Outputs */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ListTree className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Interface</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    {/* Inputs */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Inputs</Label>
                          <InfoTip content={TOOLTIP_CONTENT.inputs} />
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => {
                          const inputs = [...(editingWorkflow.inputs || []), { name: '', type: 'string', required: true, default: null }];
                          updateWorkflow({ inputs });
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Input
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {editingWorkflow.inputs?.map((input, idx) => (
                          <div key={idx} className="p-3 rounded-md border bg-muted/20 space-y-3 relative group">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-sm text-destructive"
                              onClick={() => {
                                const inputs = editingWorkflow.inputs?.filter((_, i) => i !== idx);
                                updateWorkflow({ inputs });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                              <Input 
                                placeholder="Name" 
                                value={input.name} 
                                onChange={e => {
                                  const inputs = [...(editingWorkflow.inputs || [])];
                                  inputs[idx] = { ...inputs[idx], name: e.target.value };
                                  updateWorkflow({ inputs });
                                }}
                                className="h-8 text-xs"
                              />
                              <Select 
                                value={input.type} 
                                onValueChange={val => {
                                  const inputs = [...(editingWorkflow.inputs || [])];
                                  inputs[idx] = { ...inputs[idx], type: val };
                                  updateWorkflow({ inputs });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {INPUT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Switch 
                                  id={`req-${idx}`}
                                  checked={input.required} 
                                  onCheckedChange={checked => {
                                    const inputs = [...(editingWorkflow.inputs || [])];
                                    inputs[idx] = { ...inputs[idx], required: checked };
                                    updateWorkflow({ inputs });
                                  }}
                                />
                                <Label htmlFor={`req-${idx}`} className="text-[10px]">Required</Label>
                              </div>
                              <Input 
                                placeholder="Default value" 
                                value={input.default as string || ''} 
                                onChange={e => {
                                  const inputs = [...(editingWorkflow.inputs || [])];
                                  inputs[idx] = { ...inputs[idx], default: e.target.value };
                                  updateWorkflow({ inputs });
                                }}
                                className="h-8 text-xs flex-1"
                              />
                            </div>
                          </div>
                        ))}
                        {(!editingWorkflow.inputs || editingWorkflow.inputs.length === 0) && (
                          <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded-md">No inputs defined</p>
                        )}
                      </div>
                    </div>

                    {/* Outputs */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Outputs</Label>
                          <InfoTip content={TOOLTIP_CONTENT.outputs} />
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => {
                          const outputs = [...(editingWorkflow.outputs || []), { name: '', type: 'string' }];
                          updateWorkflow({ outputs });
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Output
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {editingWorkflow.outputs?.map((output, idx) => (
                          <div key={idx} className="flex gap-2 items-center group">
                            <Input 
                              placeholder="Name" 
                              value={output.name} 
                              onChange={e => {
                                const outputs = [...(editingWorkflow.outputs || [])];
                                outputs[idx] = { ...outputs[idx], name: e.target.value };
                                updateWorkflow({ outputs });
                              }}
                              className="h-8 text-xs"
                            />
                            <Select 
                              value={output.type} 
                              onValueChange={val => {
                                const outputs = [...(editingWorkflow.outputs || [])];
                                outputs[idx] = { ...outputs[idx], type: val };
                                updateWorkflow({ outputs });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INPUT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                              onClick={() => {
                                const outputs = editingWorkflow.outputs?.filter((_, i) => i !== idx);
                                updateWorkflow({ outputs });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {(!editingWorkflow.outputs || editingWorkflow.outputs.length === 0) && (
                          <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded-md">No outputs defined</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Section 3: Steps */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Steps</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-1" /> Add Step
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {editingWorkflow.steps.map((step, idx) => (
                      <StepCard 
                        key={idx}
                        step={step}
                        index={idx}
                        totalSteps={editingWorkflow.steps.length}
                        onUpdate={updates => updateStep(idx, updates)}
                        onRemove={() => removeStep(idx)}
                        onMove={dir => moveStep(idx, dir)}
                        allStepIds={editingWorkflow.steps.map(s => s.id)}
                        error={stepIdErrors[idx]}
                        isUnresolved={!!dagAnalysis.unresolved[idx]}
                        unresolvedIds={dagAnalysis.unresolved[idx]}
                        workspace={state}
                      />
                    ))}
                  </div>
                </section>

                <Separator />

                {/* Section 4: Error Handling */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Error Handling</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label>On Step Failure</Label>
                          <InfoTip content={TOOLTIP_CONTENT.onStepFailure} />
                        </div>
                        <Select 
                          value={editingWorkflow.error_handling?.on_step_failure} 
                          onValueChange={val => updateWorkflow({ 
                            error_handling: { ...editingWorkflow.error_handling, on_step_failure: val } 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ERROR_STRATEGIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label>Escalation Target</Label>
                          <InfoTip content={TOOLTIP_CONTENT.escalationTarget} />
                        </div>
                        <Input 
                          placeholder="e.g., admin-role"
                          value={editingWorkflow.error_handling?.escalation_target || ''}
                          onChange={e => updateWorkflow({ 
                            error_handling: { ...editingWorkflow.error_handling, escalation_target: e.target.value } 
                          })}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label>On Failure (Global)</Label>
                          <InfoTip content={TOOLTIP_CONTENT.onFailureGlobal} />
                        </div>
                        <Input 
                          placeholder="e.g., notify"
                          value={(editingWorkflow.error_handling as any)?.on_failure || ''}
                          onChange={e => updateWorkflow({ 
                            error_handling: { ...editingWorkflow.error_handling, on_failure: e.target.value } as any
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label>Notification Channel</Label>
                          <InfoTip content={TOOLTIP_CONTENT.notificationChannel} />
                        </div>
                        <Input 
                          placeholder="e.g., #alerts"
                          value={(editingWorkflow.error_handling as any)?.channel || ''}
                          onChange={e => updateWorkflow({ 
                            error_handling: { ...editingWorkflow.error_handling, channel: e.target.value } as any
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* DAG & YAML Previews */}
                <div className="grid grid-cols-2 gap-6 pt-8">
                  <PreviewPanel 
                    title="DAG Visualization" 
                    icon={<GitBranch className="h-4 w-4" />}
                    defaultOpen={true}
                  >
                    <div className="font-mono text-xs space-y-1">
                      {editingWorkflow.steps.map((s, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-muted-foreground w-12 shrink-0">Step {i + 1}:</span>
                          <span className={cn(
                            "font-bold",
                            dagAnalysis.unresolved[i] ? "text-amber-600" : "text-primary"
                          )}>
                            {s.id}
                          </span>
                          {s.depends_on && s.depends_on.length > 0 && (
                            <span className="text-muted-foreground">
                              → depends on [{s.depends_on.join(', ')}]
                            </span>
                          )}
                        </div>
                      ))}
                      {dagAnalysis.cycles.length > 0 && (
                        <div className="mt-4 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Cycle Detected!</p>
                            {dagAnalysis.cycles.map((c, i) => (
                              <p key={i} className="text-[10px]">{c.join(' → ')}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </PreviewPanel>

                  <PreviewPanel 
                    title="YAML Preview" 
                    icon={<Code2 className="h-4 w-4" />}
                    defaultOpen={false}
                  >
                    <pre className="text-[10px] font-mono leading-tight whitespace-pre-wrap">
                      {yaml.dump(editingWorkflow, { indent: 2, lineWidth: 120 })}
                    </pre>
                  </PreviewPanel>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-6">
              <Workflow className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Workflow Workbench</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Build deterministic multi-step pipelines with dependency ordering and data flow mapping.
            </p>
            <Button onClick={handleNewWorkflow}>
              <Plus className="h-4 w-4 mr-2" /> Create Your First Workflow
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StepCard({ 
  step, 
  index, 
  totalSteps, 
  onUpdate, 
  onRemove, 
  onMove, 
  allStepIds,
  error,
  isUnresolved,
  unresolvedIds,
  workspace
}: { 
  step: WorkflowStep; 
  index: number; 
  totalSteps: number;
  onUpdate: (u: Partial<WorkflowStep>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
  allStepIds: string[];
  error?: string;
  isUnresolved?: boolean;
  unresolvedIds?: string[];
  workspace: any;
}) {
  const [showCompliance, setShowCompliance] = useState(!!step.compliance);
  const [showExpressionPicker, setShowExpressionPicker] = useState<string | null>(null);

  const executorType = step.skill ? 'skill' : step.agent ? 'agent' : step.tool ? 'tool' : 'skill';

  const availableSkills = Object.keys(workspace.skills || {});
  const availableAgents = Object.keys(workspace.manifest.agents || {});
  const availableTools = Object.keys(workspace.tools || {});

  const otherStepIds = allStepIds.filter(id => id !== step.id);

  const handleExecutorChange = (type: 'skill' | 'agent' | 'tool') => {
    const updates: Partial<WorkflowStep> = {
      skill: undefined,
      agent: undefined,
      tool: undefined
    };
    (updates as any)[type] = '';
    onUpdate(updates);
  };

  return (
    <Card className={cn("relative overflow-visible", isUnresolved && "border-amber-400 shadow-sm shadow-amber-100")}>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/10 border-b">
        <div className="flex items-center gap-3 flex-1">
          <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] font-bold">
            {index + 1}
          </Badge>
          <div className="flex-1 max-w-[200px]">
            <Input 
              value={step.id}
              onChange={e => onUpdate({ id: e.target.value })}
              className={cn("h-7 text-xs font-mono font-bold", error && "border-destructive focus-visible:ring-destructive")}
              placeholder="step-id"
            />
          </div>
          {error && <span className="text-[10px] text-destructive font-medium">{error}</span>}
          {isUnresolved && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1 h-5">
              <AlertTriangle className="h-3 w-3" /> Unresolved: {unresolvedIds?.join(', ')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove('up')} disabled={index === 0}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove('down')} disabled={index === totalSteps - 1}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Action & Executor */}
          <div className="col-span-7 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Action Description</Label>
                <InfoTip content={TOOLTIP_CONTENT.actionDescription} />
              </div>
              <Textarea 
                placeholder="Describe what this step does in natural language..."
                value={step.action}
                onChange={e => onUpdate({ action: e.target.value })}
                className="min-h-[60px] text-sm"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Executor</Label>
                <InfoTip content={TOOLTIP_CONTENT.executor} />
              </div>
              <RadioGroup 
                value={executorType} 
                onValueChange={(val: any) => handleExecutorChange(val)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skill" id={`skill-${index}`} />
                  <Label htmlFor={`skill-${index}`} className="text-xs">Skill</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agent" id={`agent-${index}`} />
                  <Label htmlFor={`agent-${index}`} className="text-xs">Agent</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tool" id={`tool-${index}`} />
                  <Label htmlFor={`tool-${index}`} className="text-xs">Tool</Label>
                </div>
              </RadioGroup>

              {executorType === 'skill' && (
                <Select value={step.skill} onValueChange={val => onUpdate({ skill: val })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a skill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSkills.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {executorType === 'agent' && (
                <Select value={step.agent} onValueChange={val => onUpdate({ agent: val })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {executorType === 'tool' && (
                <Select value={step.tool} onValueChange={val => onUpdate({ tool: val })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a tool..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTools.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Right Column: Dependencies & Config */}
          <div className="col-span-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Depends On</Label>
                <InfoTip content={TOOLTIP_CONTENT.dependsOn} />
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 border rounded-md p-2 bg-muted/10 max-h-[100px] overflow-y-auto">
                {otherStepIds.map(id => (
                  <div key={id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`dep-${index}-${id}`}
                      checked={step.depends_on?.includes(id)}
                      onCheckedChange={checked => {
                        const deps = step.depends_on || [];
                        const newDeps = checked ? [...deps, id] : deps.filter(d => d !== id);
                        onUpdate({ depends_on: newDeps });
                      }}
                    />
                    <Label htmlFor={`dep-${index}-${id}`} className="text-[10px] truncate">{id}</Label>
                  </div>
                ))}
                {otherStepIds.length === 0 && <p className="text-[10px] text-muted-foreground italic col-span-2">No other steps</p>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Outputs</Label>
                <InfoTip content={TOOLTIP_CONTENT.stepOutputs} />
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {step.outputs?.map((out, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                    {out}
                    < LucideX className="h-2 w-2 cursor-pointer hover:text-destructive" onClick={() => {
                      onUpdate({ outputs: step.outputs?.filter((_, idx) => idx !== i) });
                    }} />
                  </Badge>
                ))}
              </div>
              <Input 
                placeholder="Add output (press Enter)..."
                className="h-7 text-xs"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val && !step.outputs?.includes(val)) {
                      onUpdate({ outputs: [...(step.outputs || []), val] });
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="grid grid-cols-2 gap-8">
          {/* Inputs Mapping */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Inputs Mapping</Label>
                <InfoTip content={TOOLTIP_CONTENT.inputsMapping} />
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => {
                onUpdate({ inputs: { ...(step.inputs || {}), '': '' } });
              }}>
                <Plus className="h-3 w-3 mr-1" /> Add Mapping
              </Button>
            </div>
            <div className="space-y-2">
              {Object.entries(step.inputs || {}).map(([key, val], i) => (
                <div key={i} className="flex gap-2 items-center group">
                  <Input 
                    placeholder="Key"
                    value={key}
                    onChange={e => {
                      const newInputs = { ...step.inputs };
                      const newKey = e.target.value;
                      delete newInputs[key];
                      newInputs[newKey] = val;
                      onUpdate({ inputs: newInputs });
                    }}
                    className="h-7 text-xs w-1/3"
                  />
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Value or ${{ ... }}"
                      value={val as string}
                      onChange={e => {
                        const newInputs = { ...step.inputs };
                        newInputs[key] = e.target.value;
                        onUpdate({ inputs: newInputs });
                      }}
                      className="h-7 text-xs pr-7"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 absolute right-1 top-1 text-muted-foreground hover:text-primary"
                      onClick={() => setShowExpressionPicker(key)}
                    >
                      <Code2 className="h-3 w-3" />
                    </Button>
                    {(val as string)?.includes('${{') && (
                      <p className="absolute -bottom-4 left-0 text-[8px] font-mono text-primary animate-in fade-in">
                        steps.&lt;id&gt;.outputs.&lt;field&gt;
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      const newInputs = { ...step.inputs };
                      delete newInputs[key];
                      onUpdate({ inputs: newInputs });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions & Compliance */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Conditions</Label>
                  <InfoTip content={TOOLTIP_CONTENT.conditions} />
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => {
                  onUpdate({ conditions: [...(step.conditions || []), ''] });
                }}>
                  <Plus className="h-3 w-3 mr-1" /> Add Condition
                </Button>
              </div>
              <div className="space-y-2">
                {step.conditions?.map((cond, i) => (
                  <div key={i} className="flex gap-2 items-center group">
                    <Input 
                      placeholder="${{ expression }}"
                      value={cond}
                      onChange={e => {
                        const newConds = [...(step.conditions || [])];
                        newConds[i] = e.target.value;
                        onUpdate({ conditions: newConds });
                      }}
                      className="h-7 text-xs"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        onUpdate({ conditions: step.conditions?.filter((_, idx) => idx !== i) });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Compliance</Label>
                  <InfoTip content={TOOLTIP_CONTENT.compliance} />
                </div>
                <Switch 
                  checked={showCompliance} 
                  onCheckedChange={val => {
                    setShowCompliance(val);
                    if (!val) onUpdate({ compliance: undefined });
                    else onUpdate({ compliance: { audit_level: 'standard', requires_approval: false } });
                  }}
                />
              </div>
              {showCompliance && (
                <div className="p-3 rounded-md border bg-muted/20 space-y-3 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label className="text-[10px]">Audit Level</Label>
                    <Select 
                      value={step.compliance?.audit_level as string} 
                      onValueChange={val => onUpdate({ compliance: { ...step.compliance, audit_level: val } })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Requires Approval</Label>
                    <Switch 
                      checked={step.compliance?.requires_approval as boolean}
                      onCheckedChange={val => onUpdate({ compliance: { ...step.compliance, requires_approval: val } })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Expression Picker Modal (Simplified for prototype) */}
      {showExpressionPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-96 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Output Picker</CardTitle>
              <CardDescription className="text-xs">Select an output from a dependency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {step.depends_on?.map(depId => {
                  // This is a bit complex to get actual outputs from other steps in the local state
                  // For now, we'll just show the IDs
                  return (
                    <div key={depId} className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{depId}</p>
                      <div className="pl-2 border-l-2 border-primary/20 space-y-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-full justify-start text-[10px]"
                          onClick={() => {
                            const newInputs = { ...step.inputs };
                            newInputs[showExpressionPicker] = `\${{ steps.${depId}.outputs.value }}`;
                            onUpdate({ inputs: newInputs });
                            setShowExpressionPicker(null);
                          }}
                        >
                          .value
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-full justify-start text-[10px]"
                          onClick={() => {
                            const newInputs = { ...step.inputs };
                            newInputs[showExpressionPicker] = `\${{ steps.${depId}.outputs.status }}`;
                            onUpdate({ inputs: newInputs });
                            setShowExpressionPicker(null);
                          }}
                        >
                          .status
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {(!step.depends_on || step.depends_on.length === 0) && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No dependencies selected</p>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowExpressionPicker(null)}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}

function PreviewPanel({ 
  title, 
  icon, 
  children, 
  defaultOpen 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="flex flex-col">
      <div 
        className="px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
      {isOpen && (
        <CardContent className="p-4 flex-1 overflow-auto bg-muted/10">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
