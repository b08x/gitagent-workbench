import React, { useState, useRef } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Send, 
  Upload, 
  X, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Lightbulb, 
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AgentArchitectPromptBar() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates = [
    { name: "🔬 Deep Research", prompt: "Build an autonomous Deep Research agent named deep-researcher that searches the web, analyzes papers, and produces executive summaries." },
    { name: "💻 Senior Engineer", prompt: "Create a software engineer agent named code-artisan specializing in TypeScript, React, clean architecture, and test generation." },
    { name: "🛡️ Security Auditor", prompt: "Design a security auditor agent named sentry-guard that scans code for OWASP top 10 vulnerabilities, leaked secrets, and strict access control." },
    { name: "📊 Data Analyst", prompt: "Configure a data analytics agent named data-prism that extracts insights, computes metrics, and writes SQL queries." }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setContextFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async (promptText?: string) => {
    const textToSend = (promptText || input).trim();
    if (!textToSend && contextFiles.length === 0) return;
    if (isProcessing) return;

    setIsProcessing(true);
    setLastMessage("Analyzing request and architecting agent persona, rules, and skills...");

    try {
      const fileParts = await Promise.all(contextFiles.map(async (file) => {
        return new Promise((resolve) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = (reader.result as string).split(',')[1];
              resolve({ type: 'image', image: base64Data, mimeType: file.type });
            };
            reader.readAsDataURL(file);
          } else {
            const reader = new FileReader();
            reader.onloadend = () => {
              const textContent = reader.result as string;
              resolve({ type: 'text', text: `\n\n--- Document: ${file.name} ---\n${textContent}\n--- End ---\n` });
            };
            reader.readAsText(file);
          }
        });
      }));

      const systemInstruction = `You are an expert AI Architect. Your goal is to design an agent based on user requests and provided context documents.
Respond in JSON matching the following schema:
{
  "manifest": {
    "name": "string (kebab-case)",
    "description": "string (one sentence)"
  },
  "soul": "Markdown string with ## sections (Core Identity, Communication Style, Values & Principles, Domain Expertise, Collaboration Style)",
  "rules": "Markdown string with ## sections (Must Always, Must Never, Output Constraints, Interaction Boundaries)",
  "skills": "Markdown string with ## Skill: Name sections",
  "explanation": "Brief summary of what was updated"
}`;

      const promptObj = {
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Agent Design Request: ${textToSend}` },
              ...fileParts
            ]
          }
        ],
        schema: {
          type: "object",
          properties: {
            manifest: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" }
              },
              required: ["name", "description"]
            },
            soul: { type: "string" },
            rules: { type: "string" },
            skills: { type: "string" },
            explanation: { type: "string" }
          },
          required: ["manifest", "soul", "rules", "skills", "explanation"]
        }
      };

      const encodedPrompt = btoa(unescape(encodeURIComponent(JSON.stringify(promptObj))));

      const response = await fetch('/api/compute/v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: settings.providerId || 'google',
          modelId: settings.modelId || 'gemini-3.7-flash',
          options: settings.parameters,
          prompt: encodedPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const result = data.object;

      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          manifest: {
            ...state.manifest,
            name: result.manifest.name,
            description: result.manifest.description
          },
          soul: result.soul,
          rules: result.rules,
          skills: result.skills
        }
      });

      setLastMessage(result.explanation || "Agent architected and updated successfully!");
      setInput('');
      setContextFiles([]);
      setIsExpanded(false);
    } catch (e: any) {
      setLastMessage(`Error: ${e.message || "Could not complete AI generation."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur border-b border-border/50 px-6 py-3 shrink-0">
      <div className="flex flex-col gap-2">
        {/* Main Prompt Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Describe your agent, e.g. 'Build a research agent named deep-search with arxiv tools...'"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              disabled={isProcessing}
              className="w-full h-9 pl-3 pr-10 text-xs rounded-lg border border-border/60 bg-background/80 focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/70"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach context document or image"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Button
            size="sm"
            onClick={() => handleGenerate()}
            disabled={(!input.trim() && contextFiles.length === 0) || isProcessing}
            className="h-9 px-4 text-xs font-semibold gap-1.5 shrink-0"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Architecting...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
            title="Toggle templates and options"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Context Files Chips */}
        {contextFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {contextFiles.map((file, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removeFile(i)} className="hover:text-red-400">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Expandable Templates and Quick Starters */}
        {isExpanded && (
          <div className="pt-2 pb-1 flex flex-wrap items-center gap-1.5 border-t border-border/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-500" /> Presets:
            </span>
            {templates.map((tpl, i) => (
              <button
                key={i}
                disabled={isProcessing}
                onClick={() => {
                  setInput(tpl.prompt);
                  handleGenerate(tpl.prompt);
                }}
                className="text-[11px] px-2.5 py-1 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/50 text-foreground transition-all"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        )}

        {/* Status notification banner */}
        {lastMessage && (
          <div className={cn(
            "text-[11px] px-3 py-1.5 rounded-md flex items-center justify-between transition-all",
            lastMessage.startsWith("Error")
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-primary/10 text-primary border border-primary/20"
          )}>
            <span className="truncate flex items-center gap-1.5">
              {lastMessage.startsWith("Error") ? null : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              {lastMessage}
            </span>
            <button onClick={() => setLastMessage(null)} className="text-muted-foreground hover:text-foreground text-[10px] ml-2">
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
