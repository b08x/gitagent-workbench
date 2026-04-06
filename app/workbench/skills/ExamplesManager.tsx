import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { SkillDefinition, SkillExample } from '../../../lib/gitagent/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ListChecks, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ExamplesManagerProps {
  skill: SkillDefinition;
}

export function ExamplesManager({ skill }: ExamplesManagerProps) {
  const { updateSkill } = useSkillWorkbench();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const examples = skill.examples || [];

  const addExample = () => {
    const newExample: SkillExample = { input: '', output: '' };
    updateSkill(skill.id, { examples: [...examples, newExample] });
    setExpandedId(examples.length);
  };

  const updateExample = (index: number, updates: Partial<SkillExample>) => {
    const newExamples = [...examples];
    newExamples[index] = { ...newExamples[index], ...updates };
    updateSkill(skill.id, { examples: newExamples });
  };

  const removeExample = (index: number) => {
    const newExamples = examples.filter((_, i) => i !== index);
    updateSkill(skill.id, { examples: newExamples });
    if (expandedId === index) setExpandedId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Examples
          </CardTitle>
          <CardDescription>Define input/output pairs to demonstrate the skill.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={addExample}>
          <Plus className="h-4 w-4 mr-2" /> Add Example
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {examples.map((example, index) => (
          <div key={index} className="border rounded-lg overflow-hidden transition-all">
            <div 
              className={cn(
                "flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                expandedId === index ? "bg-accent/30 border-b" : ""
              )}
              onClick={() => setExpandedId(expandedId === index ? null : index)}
            >
              <div className="flex items-center gap-3">
                {expandedId === index ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">Example {index + 1}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeExample(index);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {expandedId === index && (
              <div className="p-4 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid gap-2">
                  <Label>Input</Label>
                  <Textarea 
                    value={example.input}
                    onChange={(e) => updateExample(index, { input: e.target.value })}
                    placeholder="Describe the input..."
                    className="h-48 font-mono text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Output</Label>
                  <Textarea 
                    value={example.output}
                    onChange={(e) => updateExample(index, { output: e.target.value })}
                    placeholder="Describe the expected output..."
                    className="h-48 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        {examples.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm italic">
            No examples added yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
