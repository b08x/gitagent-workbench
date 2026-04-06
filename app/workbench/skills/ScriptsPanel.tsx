import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Code2, FileCode } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ScriptsPanelProps {
  skill: SkillDefinition;
}

export function ScriptsPanel({ skill }: ScriptsPanelProps) {
  const { updateSkill } = useSkillWorkbench();
  const [newScript, setNewScript] = useState('');

  const scripts = skill.scripts || [];

  const addScript = () => {
    if (newScript && !scripts.includes(newScript)) {
      updateSkill(skill.id, { scripts: [...scripts, newScript] });
      setNewScript('');
    }
  };

  const removeScript = (scriptName: string) => {
    updateSkill(skill.id, { scripts: scripts.filter(s => s !== scriptName) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Scripts
          </CardTitle>
          <CardDescription>Declare executable helper scripts for this skill.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Declared Scripts</Label>
          <div className="grid gap-2">
            {scripts.map(script => (
              <div key={script} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{script}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeScript(script)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {scripts.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm italic border rounded-md border-dashed">
                No scripts declared.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label htmlFor="new-script">Add Script Filename</Label>
          <div className="flex gap-2">
            <Input 
              id="new-script"
              placeholder="e.g., process-data.py"
              value={newScript}
              onChange={(e) => setNewScript(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addScript()}
            />
            <Button variant="outline" onClick={addScript}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Note: In this prototype, we only record the filenames. The actual script content must be added to the scripts/ directory in the exported ZIP.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
