import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { buildGenerationPrompt } from '@/lib/generation/strategy';
import { AgentWorkspace } from '@/lib/gitagent/types';
import { useSettings } from '@/app/context/SettingsContext';
import { providers } from '@/lib/providers';

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
  const { settings } = useSettings();

  const isDrafting = !fieldValue || fieldValue.trim() === '';
  const label = isDrafting ? '✦ Generate' : '✦ Improve';
  const phase = isDrafting ? 'drafting' : 'review';

  const handleAction = async () => {
    if (isLoading) return;

    const provider = providers[settings.providerId];
    const apiKey = settings.apiKeys[settings.providerId];

    if (!apiKey) {
      alert(`Please set the API key for ${provider?.name || settings.providerId} in Settings.`);
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const prompt = buildGenerationPrompt(fileType, phase, workspace, fieldName);
      let fullText = '';
      
      for await (const chunk of provider.stream(prompt, apiKey, settings.modelId)) {
        fullText += chunk;
        onResult(fullText);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please check your API key and connection.');
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 h-8 text-xs font-medium"
      onClick={handleAction}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {label}
    </Button>
  );
}
