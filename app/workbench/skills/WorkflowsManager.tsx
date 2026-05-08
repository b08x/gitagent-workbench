import React from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkflowsManagerProps {
  skill: SkillDefinition;
}

export function WorkflowsManager({ skill }: WorkflowsManagerProps) {
  const { updateSkill } = useSkillWorkbench();
  const workflows = skill.workflows || [];

  const removeWorkflow = (filename: string) => {
    updateSkill(skill.id, { workflows: workflows.filter(w => w.filename !== filename) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Workflows
        </CardTitle>
        <CardDescription>Step-by-step guides and procedure definitions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {workflows.map(workflow => (
            <div key={workflow.filename} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{workflow.filename}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Procedure Guide</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeWorkflow(workflow.filename)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm italic border-2 border-dashed rounded-xl">
              No workflows imported.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
