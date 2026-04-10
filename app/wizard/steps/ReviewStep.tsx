import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../../context/AgentContext';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket } from 'lucide-react';
import { ValidationSummary } from '../components/ValidationSummary';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ReviewStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleGenerate = () => {
    dispatch({ type: 'UPDATE_META', payload: { status: 'generating' } });
    navigate('/generating');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review & Generate</h2>
        <p className="text-muted-foreground">Verify your agent configuration before starting generation.</p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Identity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-mono">{state.manifest.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span>{state.manifest.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Structure:</span>
              <Badge variant="outline">{state.meta.structureType}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div>
              <span className="text-muted-foreground block mb-2">Skills:</span>
              <div className="flex flex-wrap gap-1">
                {(state.manifest.skills || []).map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block mb-2">Tools:</span>
              <div className="flex flex-wrap gap-1">
                {(state.manifest.tools || []).map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Generation Config</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider:</span>
              <span>{settings.providerId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Key:</span>
              <span>{settings.apiKeys[settings.providerId] ? '••••••••' : 'Not set'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <ValidationSummary errors={fieldErrors} />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="w-full">
                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={handleGenerate} 
                  disabled={!settings.apiKeys[settings.providerId] || Object.keys(fieldErrors).length > 0}
                >
                  <Rocket className="mr-2 h-5 w-5" /> Generate Agent
                </Button>
              </div>
            </TooltipTrigger>
            {Object.keys(fieldErrors).length > 0 && (
              <TooltipContent>
                <p>Fix validation errors to continue</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {!settings.apiKeys[settings.providerId] && (
          <p className="text-xs text-destructive mt-2 text-center">Please set an API key in the Model step to continue.</p>
        )}
      </div>
    </div>
  );
}
