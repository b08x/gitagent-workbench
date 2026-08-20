import React, { useState, useRef, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Send, 
  Upload, 
  X, 
  Bot, 
  User, 
  Sparkles, 
  Loader2,
  FileText,
  Save,
  RotateCcw,
  Square,
  AlertCircle,
  Settings as SettingsIcon,
  Lightbulb,
  ArrowRight,
  Check
} from 'lucide-react';
import { cn, formatErrorMessage } from '../../lib/utils';
import { providers } from '../../lib/providers';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isInitializing?: boolean;
  timestamp?: string;
  isError?: boolean;
  isCancelled?: boolean;
  failedPrompt?: string;
  failedFiles?: File[];
}

export function AgentWizard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { state, dispatch } = useAgentWorkspace();
  const { settings, updateTaskModel } = useSettings();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init-1',
      role: 'assistant', 
      content: "Hello! I am your AI Architect. Describe your agent's purpose, target workflows, domain guidelines, or upload spec documents (Markdown, TXT, JSON). I will configure the manifest, soul, rules, and skills in real time.",
      isInitializing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentProviderId = settings.taskModels.architect?.providerId || 'google';
  const currentModelId = settings.taskModels.architect?.modelId || 'gemini-3.7-flash';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setContextFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && !last.isError && last.content.includes('Analyzing')) {
        return [
          ...prev.slice(0, -1),
          {
            id: `cancel-${Date.now()}`,
            role: 'assistant',
            content: 'Generation cancelled by user.',
            isCancelled: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }
      return prev;
    });
  };

  const handleSend = async (overridePrompt?: string, overrideFiles?: File[]) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : input;
    const filesToSend = overrideFiles !== undefined ? overrideFiles : contextFiles;

    if (!promptToSend.trim() && filesToSend.length === 0) return;
    if (isProcessing) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = { 
      id: userMessageId,
      role: 'user', 
      content: promptToSend, 
      timestamp: userTime 
    };

    setMessages(prev => [...prev, userMessage]);
    if (overridePrompt === undefined) setInput('');
    setIsProcessing(true);

    abortControllerRef.current = new AbortController();

    try {
      const { providerId, modelId, parameters } = settings.taskModels.architect;
      const apiKey = settings.apiKeys[providerId];

      const assistantMsgId = `asst-${Date.now()}`;
      const assistantMessage: ChatMessage = { 
        id: assistantMsgId,
        role: 'assistant', 
        content: "Analyzing parameters and compiling agent specification...",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);

      const fileParts = await Promise.all(filesToSend.map(async (file) => {
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
              resolve({ type: 'text', text: `\n\n--- Attachment: ${file.name} ---\n${textContent}\n--- End of Attachment ---\n` });
            };
            reader.readAsText(file);
          }
        });
      }));
      
      const systemInstruction = `You are an expert AI Architect. Your goal is to design an agent based on user requests and provided context documents.
      You must respond in JSON format with the following schema:
      {
        "manifest": {
          "name": "string (kebab-case)",
          "description": "string (one sentence)"
        },
        "soul": "Markdown string with ## sections (Core Identity, Communication Style, Values & Principles, Domain Expertise, Collaboration Style)",
        "rules": "Markdown string with ## sections (Must Always, Must Never, Output Constraints, Interaction Boundaries)",
        "skills": "Markdown string with ## Skill: Name sections",
        "explanation": "Brief explanation of what was updated"
      }
      
      Guidelines:
      - Core Identity should strictly reflect the agent purpose.
      - Skills should be detailed and include allowed tools if applicable.
      - INTEGRATE ALL RELEVANT INFORMATION from any provided documents into the Soul and Rules.
      - The agent name MUST be kebab-case.`;

      const promptObj = {
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `User Prompt: ${promptToSend}` },
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId,
          modelId,
          apiKey: apiKey && apiKey !== '********' ? apiKey : undefined,
          options: parameters,
          prompt: encodedPrompt
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errMessage = errorData.error || errMessage;
        } catch {
          const text = await response.text();
          if (text) errMessage = text;
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      const result = data.object;

      if (!result || !result.manifest) {
        throw new Error("Invalid format received from model. Please try regenerating.");
      }

      // Update workspace
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

      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          id: assistantMsgId,
          role: 'assistant', 
          content: result.explanation || "I've configured your agent workspace with the requested manifest, soul, rules, and skill definitions.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      setContextFiles([]);
    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }
      console.error('AI Architect generation error:', err);
      const cleanError = formatErrorMessage(err);

      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          id: `error-${Date.now()}`,
          role: 'assistant', 
          content: cleanError,
          isError: true,
          failedPrompt: promptToSend,
          failedFiles: filesToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const starterPrompts = [
    "Design a senior TypeScript & React code reviewer with strict linter rules and automated git-diff inspections.",
    "Build a technical research agent that ingests PDFs, performs web queries, and writes executive summaries with citations.",
    "Create a DevOps reliability bot for monitoring alerts, parsing logs, and safely triggering rollbacks with approval gates."
  ];

  return (
    <div className="flex flex-col h-full bg-card/60 border border-border/80 rounded-md overflow-hidden shadow-xs">
      {/* Sub-Header Bar with Model Switcher & Snapshot */}
      <div className="px-4 py-2.5 border-b border-border/80 bg-muted/40 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-sm bg-primary/15 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs tracking-tight text-foreground truncate">AI Architect Studio</h3>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded-sm shrink-0">
                COMPUTE
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground truncate hidden sm:block">Natural language synthesis & automated configuration</p>
          </div>
        </div>

        {/* Quick Model Selector & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-sm px-1.5 py-0.5 text-xs font-mono">
            <Select 
              value={currentProviderId} 
              onValueChange={(val) => {
                const defaultModel = val === 'google' ? 'gemini-3.7-flash' : val === 'openai' ? 'gpt-4o-mini' : val === 'anthropic' ? 'claude-3-5-haiku-20241022' : 'llama-3.3-70b-versatile';
                updateTaskModel('architect', { providerId: val, modelId: defaultModel });
              }}
            >
              <SelectTrigger className="h-6 text-[11px] font-mono border-none shadow-none bg-transparent w-[95px] px-1 focus:ring-0">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(providers).map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-mono">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground/50">/</span>

            <span className="text-[11px] text-foreground font-mono truncate max-w-[130px] px-1 font-medium">
              {currentModelId.replace(/^.*\//, '')}
            </span>
          </div>

          {isProcessing ? (
            <Button 
              variant="destructive" 
              size="xs" 
              onClick={handleCancel}
              className="text-[10px] font-mono uppercase tracking-wider h-7 px-2.5 gap-1 shadow-xs"
            >
              <Square className="size-3 fill-current" /> Cancel
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="xs" 
              onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'AI Architect Sync' })}
              className="text-[10px] font-mono uppercase tracking-wider h-7 px-2.5"
            >
              <Save className="size-3 mr-1" /> Snapshot
            </Button>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4"
      >
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={cn(
              "flex gap-3 max-w-[90%]",
              m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "size-7 rounded-sm flex items-center justify-center shrink-0 border font-mono text-xs shadow-xs",
              m.role === 'user' 
                ? "bg-primary text-primary-foreground font-bold border-primary/50 terracotta-glow-sm" 
                : m.isError 
                  ? "bg-destructive/10 text-destructive border-destructive/30" 
                  : "bg-muted text-muted-foreground border-border/80"
            )}>
              {m.role === 'user' ? <User className="size-4" /> : m.isError ? <AlertCircle className="size-4 text-destructive" /> : <Bot className="size-4 text-primary" />}
            </div>

            <div className="space-y-1.5 max-w-[calc(100%-2.5rem)]">
              {m.isError ? (
                /* Enhanced Actionable Error Card with Retry Button */
                <div className="p-4 rounded-sm text-xs leading-relaxed bg-destructive/5 border border-destructive/30 text-foreground space-y-3 shadow-xs">
                  <div className="flex items-start gap-2 text-destructive font-medium">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs tracking-tight">Generation Error</p>
                      <p className="text-xs text-foreground/90 font-normal">{m.content}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-destructive/20">
                    {m.failedPrompt && (
                      <Button
                        size="xs"
                        variant="default"
                        className="bg-primary hover:bg-[#d96b43] text-primary-foreground text-xs font-mono gap-1.5 h-7"
                        onClick={() => handleSend(m.failedPrompt, m.failedFiles)}
                        disabled={isProcessing}
                      >
                        <RotateCcw className="size-3" /> Retry Generation
                      </Button>
                    )}

                    <Button
                      size="xs"
                      variant="outline"
                      className="text-xs font-mono gap-1.5 h-7 border-border/80 hover:bg-muted"
                      onClick={() => onTabChange ? onTabChange('settings') : window.location.href = '/settings'}
                    >
                      <SettingsIcon className="size-3" /> Configure API Key
                    </Button>
                  </div>
                </div>
              ) : m.isCancelled ? (
                /* Cancelled State Card */
                <div className="p-3 rounded-sm text-xs bg-muted/40 border border-border/60 text-muted-foreground flex items-center gap-2 font-mono">
                  <Square className="size-3 text-warning fill-current" />
                  <span>{m.content}</span>
                </div>
              ) : (
                /* Standard Message Card */
                <div className={cn(
                  "p-3.5 rounded-sm text-xs leading-relaxed border shadow-xs",
                  m.role === 'user' 
                    ? "bg-primary text-primary-foreground border-primary/50 font-medium" 
                    : "bg-card border-border/80 text-foreground"
                )}>
                  {m.content.includes("Analyzing parameters") ? (
                    <div className="flex items-center gap-2.5 text-muted-foreground font-mono">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span>{m.content}</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              )}

              {m.timestamp && (
                <div className={cn(
                  "text-[9px] font-mono text-muted-foreground uppercase px-1",
                  m.role === 'user' ? "text-right" : "text-left"
                )}>
                  {m.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Starter suggestion chips if only initial message */}
        {messages.length === 1 && (
          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-1">
              <Lightbulb className="size-3 text-warning" />
              <span>Recommended Prompts</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {starterPrompts.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(starter)}
                  className="text-left text-xs p-2.5 rounded-sm bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="line-clamp-2">{starter}</span>
                  <ArrowRight className="size-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Context Attachment Chips */}
      {contextFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border/60 bg-muted/30 flex flex-wrap gap-1.5 shrink-0">
          {contextFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-background border border-border/80 rounded-sm px-2 py-0.5 text-[11px] font-mono shadow-xs">
              <FileText className="size-3 text-primary" />
              <span className="truncate max-w-[140px] text-foreground">{file.name}</span>
              <button 
                type="button"
                onClick={() => removeFile(i)} 
                className="text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Composer with Cancel / Send Controls */}
      <div className="p-3 border-t border-border/80 bg-card shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea 
              placeholder="Describe your agent requirements or prompt instructions..."
              className="min-h-[56px] max-h-[140px] resize-none pr-9 text-xs font-sans rounded-sm bg-background border-border/80 focus-visible:ring-primary/40 focus-visible:border-primary"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              type="button"
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
              title="Attach context file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
            </button>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {isProcessing ? (
              <Button 
                variant="destructive"
                className="h-full px-3.5 rounded-sm font-medium transition-all shadow-xs gap-1.5"
                onClick={handleCancel}
                title="Cancel Generation"
              >
                <Square className="size-4 fill-current" />
                <span className="text-xs font-mono uppercase">Stop</span>
              </Button>
            ) : (
              <Button 
                className="h-full px-4 rounded-sm bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium transition-all shadow-xs" 
                onClick={() => handleSend()}
                disabled={!input.trim() && contextFiles.length === 0}
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
