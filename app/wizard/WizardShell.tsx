import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgentWorkspace } from '../context/AgentContext';
import { TemplateSelectStep } from './steps/TemplateSelectStep';
import { StructureStep } from './steps/StructureStep';
import { IdentityStep } from './steps/IdentityStep';
import { ModelStep } from './steps/ModelStep';
import { ModelConfigStep } from './steps/ModelConfigStep';
import { SkillsToolsStep } from './steps/SkillsToolsStep';
import { CapabilitiesStep } from './steps/CapabilitiesStep';
import { ComplianceStep } from './steps/ComplianceStep';
import { ReviewStep } from './steps/ReviewStep';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const steps = [
  { id: 'template', title: 'Template', component: TemplateSelectStep },
  { id: 'structure', title: 'Structure', component: StructureStep },
  { id: 'identity', title: 'Identity', component: IdentityStep },
  { id: 'model', title: 'Model', component: ModelStep },
  { id: 'config', title: 'Config', component: ModelConfigStep },
  { id: 'skills', title: 'Skills', component: SkillsToolsStep },
  { id: 'capabilities', title: 'Capabilities', component: CapabilitiesStep },
  { id: 'compliance', title: 'Compliance', component: ComplianceStep },
  { id: 'review', title: 'Review', component: ReviewStep },
];

export function WizardShell() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { state } = useAgentWorkspace();

  // Skip steps that are not applicable to the selected template
  const filteredSteps = steps.filter(s => {
    if (s.id === 'config' && state.selectedTemplate === 'minimal') return false;
    if (s.id === 'skills' && state.selectedTemplate === 'minimal') return false;
    if (s.id === 'compliance' && state.selectedTemplate === 'minimal') return false;
    return true;
  });

  const next = () => setCurrentStepIndex(i => Math.min(i + 1, filteredSteps.length - 1));
  const prev = () => setCurrentStepIndex(i => Math.max(i - 1, 0));

  const CurrentStep = filteredSteps[currentStepIndex].component;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {filteredSteps.map((step, i) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className="text-xs mt-2 hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / filteredSteps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl p-8 shadow-sm min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CurrentStep />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={prev} disabled={currentStepIndex === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {currentStepIndex < filteredSteps.length - 1 && (
          <Button onClick={next}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
