import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { buildGenerationPrompt } from '@/lib/generation/strategy';
import { streamWithRetryAndFallback } from '@/lib/generation/orchestrator';
import { AgentWorkspace } from '@/lib/gitagent/types';
import { useSettings } from '@/app/context/SettingsContext';
import { providers } from '@/lib/providers';
import { formatErrorMessage } from '@/lib/utils';

type FileType = 'soul-md' | 'rules-md' | 'prompt-md' | 'duties-md' | 'skill-md';

interface GenerateImproveButtonProps {
  fieldValue: string;
  fileType: FileType;
  fieldName?: string;
  workspace: AgentWorkspace;
  onResult: (text: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  disabled?: boolean;
}

export function GenerateImproveButton({ 
  fieldValue, 
  fileType, 
  fieldName,
  workspace, 
  onResult,
  onLoadingChange,
  disabled 
}: GenerateImproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { settings } = useSettings();

  const isDrafting = !fieldValue || fieldValue.trim() === '';
  const label = isDrafting ? '✦ Generate' : '✦ Improve';
  const phase = isDrafting ? 'drafting' : 'review';

  const handleAction = async () => {
    if (isLoading) return;
    setErrorMessage(null);

    const apiKey = settings.apiKeys[settings.providerId];

    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const prompt = buildGenerationPrompt(fileType, phase, workspace, fieldName);
      let fullText = '';
      
      const config = {
        providerId: settings.providerId || 'google',
        apiKey: apiKey && apiKey !== '********' ? apiKey : '',
        modelId: settings.modelId || 'gemini-3.7-flash',
        fallbackModelIds: workspace.generationConfig?.fallbackModelIds,
        apiKeys: settings.apiKeys
      };

      for await (const chunk of streamWithRetryAndFallback(prompt, config)) {
        fullText += chunk;
        onResult(fullText);
      }
    } catch (error: any) {
      console.error('Generation failed:', error);
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {errorMessage && (
        <span className="text-[10px] text-destructive flex items-center gap-1 font-mono max-w-[200px] truncate" title={errorMessage}>
          <AlertCircle className="size-3 shrink-0" /> Failed
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 h-8 text-xs font-medium"
        onClick={handleAction}
        disabled={isLoading || disabled}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : errorMessage ? (
          <RotateCcw className="h-3 w-3 text-destructive" />
        ) : (
          <Sparkles className="h-3 w-3 text-primary" />
        )}
        {errorMessage ? 'Retry' : label}
      </Button>
    </div>
  );
}
