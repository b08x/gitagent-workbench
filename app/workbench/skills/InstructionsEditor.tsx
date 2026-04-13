import React, { useState, useEffect } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { useSettings } from '../../context/SettingsContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { generateSkillInstructions } from '../../../lib/generation/skill-generator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Eye, Edit3, Loader2, AlertCircle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../../lib/utils';

interface InstructionsEditorProps {
  skill: SkillDefinition;
}

const TEMPLATE = `# \${NAME}

## Overview
Briefly describe the purpose and scope of this skill.

## Instructions
1. Step one
2. Step two
3. Step three

## Output Format
Describe the expected output format (e.g., JSON, Markdown, specific schema).

## Examples
Provide 1-2 clear examples of how this skill should be applied.
`;

export function InstructionsEditor({ skill }: InstructionsEditorProps) {
  const { updateSkill } = useSkillWorkbench();
  const { state: agentState } = useAgentWorkspace();
  const { settings } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const handleApplyTemplate = () => {
    const content = TEMPLATE.replace(/\${NAME}/g, skill.name || 'Skill Name');
    updateSkill(skill.id, { instructions: content });
  };

  const handleGenerate = async () => {
    if (!settings.apiKeys[settings.providerId]) {
      setError('API Key is required for generation. Please set it in Settings.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const generator = generateSkillInstructions(skill, agentState, {
        providerId: settings.providerId,
        apiKey: settings.apiKeys[settings.providerId],
        modelId: settings.modelId,
        fallbackModelIds: agentState.generationConfig.fallbackModelIds,
        apiKeys: settings.apiKeys
      });

      for await (const event of generator) {
        if (event.status === 'progress' || event.status === 'done') {
          updateSkill(skill.id, { instructions: event.content });
        } else if (event.status === 'error') {
          setError(event.content || 'An error occurred during generation.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Instructions Editor
          </CardTitle>
          <CardDescription>Author the behavioral logic for this skill.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            Generate with AI
          </Button>
          <Button variant="outline" size="sm" onClick={handleApplyTemplate}>
            Apply Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-[500px]">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full flex-1 flex flex-col">
          <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
            <TabsList className="h-8">
              <TabsTrigger value="write" className="text-xs h-7">
                <Edit3 className="h-3 w-3 mr-1" /> Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs h-7">
                <Eye className="h-3 w-3 mr-1" /> Preview
              </TabsTrigger>
            </TabsList>
            {error && (
              <div className="text-xs text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                <AlertCircle className="h-3 w-3" /> {error}
              </div>
            )}
          </div>

          <TabsContent value="write" className="flex-1 p-0 mt-0">
            <Textarea 
              value={skill.instructions}
              onChange={(e) => updateSkill(skill.id, { instructions: e.target.value })}
              placeholder="Write instructions in Markdown..."
              className="w-full h-full min-h-[450px] border-0 rounded-none focus-visible:ring-0 resize-none font-mono text-sm p-6"
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 p-0 mt-0 overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none p-8">
              {skill.instructions ? (
                <ReactMarkdown>{skill.instructions}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">No content to preview.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
