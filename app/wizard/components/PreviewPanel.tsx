import React, { useState, useEffect } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { assembleSystemPrompt } from '../../../lib/gitagent/assembleSystemPrompt';
import yaml from 'js-yaml';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PreviewPanel() {
  const { state } = useAgentWorkspace();
  const [isExpanded, setIsExpanded] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [manifestYaml, setManifestYaml] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSystemPrompt(assembleSystemPrompt(state));
      try {
        setManifestYaml(yaml.dump(state.manifest, { indent: 2, skipInvalid: true }));
      } catch (e) {
        console.error('YAML serialization failed', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [state]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div 
      className={cn(
        "border-l bg-muted/10 transition-all duration-300 flex flex-col relative",
        isExpanded ? "w-[400px]" : "w-12"
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border bg-background shadow-sm z-10"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {!isExpanded ? (
        <div className="flex flex-col items-center pt-8 gap-8 text-muted-foreground">
          <div className="[writing-mode:vertical-lr] rotate-180 font-medium tracking-widest text-xs uppercase">
            Preview Output
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b bg-background/50">
            <h3 className="font-semibold text-sm">Output Preview</h3>
          </div>
          
          <Tabs defaultValue="system" className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-2 border-b bg-background/50">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="system" className="text-xs">System Prompt</TabsTrigger>
                <TabsTrigger value="yaml" className="text-xs">agent.yaml</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="system" className="flex-1 p-0 m-0 relative min-h-0">
              <div className="absolute top-2 right-4 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 bg-background/80 backdrop-blur"
                  onClick={() => handleCopy(systemPrompt, 'system')}
                >
                  {copied === 'system' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="h-full overflow-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-background/30">
                {systemPrompt || <span className="text-muted-foreground italic">No prompt generated yet...</span>}
              </div>
            </TabsContent>

            <TabsContent value="yaml" className="flex-1 p-0 m-0 relative min-h-0">
              <div className="absolute top-2 right-4 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 bg-background/80 backdrop-blur"
                  onClick={() => handleCopy(manifestYaml, 'yaml')}
                >
                  {copied === 'yaml' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="h-full overflow-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre bg-background/30">
                {manifestYaml || <span className="text-muted-foreground italic">No manifest data...</span>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
