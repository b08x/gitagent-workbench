import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgentWorkspace } from '../context/AgentContext';
import { validateWizardState, ValidationResult } from '../../lib/wizard/validate';
import { TemplateSelectStep } from './steps/TemplateSelectStep';
import { StructureStep } from './steps/StructureStep';
import { IdentityStep } from './steps/IdentityStep';
import { ModelStep } from './steps/ModelStep';
import { ModelConfigStep } from './steps/ModelConfigStep';
import { CapabilitiesStep } from './steps/CapabilitiesStep';
import { DeploymentStep } from './steps/DeploymentStep';
import { DelegationStep } from './steps/DelegationStep';
import { DutiesStep } from './steps/DutiesStep';
import { ComplianceStep } from './steps/ComplianceStep';
import { HooksStep } from './steps/HooksStep';
import { MemoryStep } from './steps/MemoryStep';
import { ReviewStep } from './steps/ReviewStep';
import { ContextStep } from './steps/ContextStep';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const steps = [
  { id: 'template', title: 'Template', component: TemplateSelectStep },
  { id: 'context', title: 'Context', component: ContextStep },
  { id: 'structure', title: 'Structure', component: StructureStep },
  { id: 'identity', title: 'Identity', component: IdentityStep },
  { id: 'model', title: 'Model', component: ModelStep },
  { id: 'config', title: 'Config', component: ModelConfigStep },
  { id: 'skills', title: 'Capabilities', component: CapabilitiesStep },
  { id: 'deployment', title: 'Deployment', component: DeploymentStep },
  { id: 'delegation', title: 'Delegation', component: DelegationStep },
  { id: 'duties', title: 'Duties', component: DutiesStep },
  { id: 'compliance', title: 'Compliance', component: ComplianceStep },
  { id: 'hooks', title: 'Hooks', component: HooksStep },
  { id: 'memory', title: 'Memory', component: MemoryStep },
  { id: 'review', title: 'Review', component: ReviewStep },
];

export function WizardShell() {
  const { state } = useAgentWorkspace();
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: {} });
  const [activeTab, setActiveTab] = useState('template');

  useEffect(() => {
    const timer = setTimeout(() => {
      setValidation(validateWizardState(state));
    }, 200);
    return () => clearTimeout(timer);
  }, [state]);

  // Skip steps that are not applicable to the selected template
  const filteredSteps = steps.filter(s => {
    if (s.id === 'config' && state.selectedTemplate === 'minimal') return false;
    if (s.id === 'skills' && state.selectedTemplate === 'minimal') return false;
    if (s.id === 'deployment' && state.selectedTemplate === 'minimal') return false;
    if (s.id === 'delegation' && state.selectedTemplate !== 'full') return false;
    if (s.id === 'duties' && state.selectedTemplate !== 'full') return false;
    if (s.id === 'compliance' && state.selectedTemplate !== 'full') return false;
    if (s.id === 'hooks' && state.selectedTemplate !== 'full') return false;
    if (s.id === 'memory' && state.selectedTemplate !== 'full') return false;
    return true;
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Agent Wizard</h1>
        <p className="text-muted-foreground">Configure your agent's identity, capabilities, and runtime parameters.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b pb-1 overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 gap-6 flex whitespace-nowrap">
            {filteredSteps.map((step) => (
                <TabsTrigger 
                  key={step.id} 
                  value={step.id}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all"
                >
                  {step.title}
                  {validation.errors[step.id] && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-destructive" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
        </div>

        {filteredSteps.map((step) => {
          const StepComponent = step.component;
          return (
            <TabsContent key={step.id} value={step.id} className="mt-0 focus-visible:outline-none">
              <div className="bg-card border rounded-xl p-8 shadow-sm min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <StepComponent fieldErrors={validation.errors} />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
