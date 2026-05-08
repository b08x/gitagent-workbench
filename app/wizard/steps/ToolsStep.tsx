import React from 'react';
import { useAgentWorkspace, ToolEntry } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Settings2 } from 'lucide-react';

export function ToolsStep() {
  const { state, dispatch } = useAgentWorkspace();

  const updateTools = (newTools: ToolEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { toolsList: newTools } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { tools: newTools.map(t => t.name).filter(Boolean) } });
  };

  const addTool = () => {
    updateTools([...state.toolsList, { name: '', description: '' }]);
  };

  const removeTool = (index: number) => {
    const newTools = [...state.toolsList];
    newTools.splice(index, 1);
    updateTools(newTools);
  };

  const handleToolChange = (index: number, field: keyof ToolEntry, value: string) => {
    const newTools = [...state.toolsList];
    newTools[index] = { ...newTools[index], [field]: value };
    updateTools(newTools);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
      </div>
      <p className="text-muted-foreground">Declare tools that the agent can use to interact with the world.</p>

      <div className="space-y-4">
        {state.toolsList.map((tool, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="pt-6 space-y-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                onClick={() => removeTool(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`tool-name-${index}`}>Tool Name (kebab-case)</Label>
                  <Input 
                    id={`tool-name-${index}`}
                    placeholder="web-search"
                    value={tool.name}
                    onChange={e => handleToolChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`tool-desc-${index}`}>Description</Label>
                  <Input 
                    id={`tool-desc-${index}`}
                    placeholder="Search the web for information..."
                    value={tool.description}
                    onChange={e => handleToolChange(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full border-dashed p-8" onClick={addTool}>
          <Plus className="mr-2 h-4 w-4" /> Add Tool
        </Button>
      </div>
    </div>
  );
}
