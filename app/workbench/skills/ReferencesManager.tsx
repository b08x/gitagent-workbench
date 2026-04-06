import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ReferencesManagerProps {
  skill: SkillDefinition;
}

export function ReferencesManager({ skill }: ReferencesManagerProps) {
  const { updateSkill } = useSkillWorkbench();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const references = skill.references || [];

  const addReference = () => {
    const newRef = { name: `reference-${references.length + 1}.md`, content: '' };
    updateSkill(skill.id, { references: [...references, newRef] });
    setExpandedId(references.length);
  };

  const updateReference = (index: number, updates: Partial<{ name: string; content: string }>) => {
    const newReferences = [...references];
    newReferences[index] = { ...newReferences[index], ...updates };
    updateSkill(skill.id, { references: newReferences });
  };

  const removeReference = (index: number) => {
    const newReferences = references.filter((_, i) => i !== index);
    updateSkill(skill.id, { references: newReferences });
    if (expandedId === index) setExpandedId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            References
          </CardTitle>
          <CardDescription>Supporting documentation for the skill.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={addReference}>
          <Plus className="h-4 w-4 mr-2" /> Add Reference
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {references.map((ref, index) => (
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
                <span className="font-medium text-sm">{ref.name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeReference(index);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {expandedId === index && (
              <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid gap-2">
                  <Label>Filename</Label>
                  <Input 
                    value={ref.name}
                    onChange={(e) => updateReference(index, { name: e.target.value })}
                    placeholder="e.g., technical-spec.md"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Content (Markdown)</Label>
                  <Textarea 
                    value={ref.content}
                    onChange={(e) => updateReference(index, { content: e.target.value })}
                    placeholder="Paste reference content here..."
                    className="h-48 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        {references.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm italic">
            No references added yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
