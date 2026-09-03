import React, { useState, useRef, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  Check,
  Zap,
  KeyRound,
  Trash2,
  Cpu,
  Layers,
  CheckCircle2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { cn, formatErrorMessage } from '../../lib/utils';
import { providers } from '../../lib/providers';
import { synthesizeAgentSpec } from '../../lib/generation/agentSynthesizer';
import { assertHarnessMatch } from '../../lib/generation/harnessVerifier';
import { AGENT_FRAMEWORK_OPTIONS, AGENT_FRAMEWORK_TOOLS } from '../../lib/gitagent/constants';
import { AgentFramework } from '../../lib/gitagent/types';
import { inferFrameworkTools } from '../../lib/gitagent/contextToolInference';

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
  resolved?: boolean;
  resolvedVia?: string;
  retrying?: boolean;
  actionTaken?: string;
  isAuditLog?: boolean;
}

export function AgentWizard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { state, dispatch } = useAgentWorkspace();
  const { settings, updateTaskModel, setApiKey, clearApiKey } = useSettings();

  const activeFramework: AgentFramework = (state.targetFramework as AgentFramework) || 'hermes_agent';
  const activeFrameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework) || AGENT_FRAMEWORK_OPTIONS[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init-1',
      role: 'assistant', 
      content: `Hello! I am your AI Architect configured for the ${activeFrameworkMeta.label} runtime. Describe your agent's purpose, target workflows, or upload spec documents. I will configure the manifest, soul, rules, and skills in real time.`,
      isInitializing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [showInlineKeyInput, setShowInlineKeyInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentProviderId = settings.taskModels.architect?.providerId || 'google';
  const currentModelId = settings.taskModels.architect?.modelId || 'gemini-3.7-flash';

  useEffect(() => {
    if (isProcessing) {
      const startTime = Date.now();
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, elapsedSeconds]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setContextFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index));
  };

  const markErrorsResolved = (via: string) => {
    setMessages(prev => prev.map(msg => msg.isError ? { ...msg, resolved: true, resolvedVia: via, retrying: false } : msg));
  };

  const handleRetryLLM = (errorMsgId: string, promptText?: string, files?: File[]) => {
    if (isProcessing) return;
    const targetPrompt = promptText || '';
    const targetFiles = files || [];

    const { providerId, modelId } = settings.taskModels.architect;
    const actionDesc = `Retried LLM generation with ${providerId.toUpperCase()} (${modelId})`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Mark the original error message as retrying and add audit log entry to transcript
    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === errorMsgId ? { ...msg, retrying: true, actionTaken: 'Retry LLM' } : msg
      );
      const auditMsg: ChatMessage = {
        id: `audit-${Date.now()}`,
        role: 'user',
        content: `Recovery Action: ${actionDesc}`,
        isAuditLog: true,
        actionTaken: 'Retry LLM',
        timestamp
      };
      return [...updated, auditMsg];
    });

    handleSend(targetPrompt, targetFiles, { sourceErrorId: errorMsgId, recoveryAction: 'Retried successfully via Retry LLM' });
  };

  const handleSynthesizeLocally = (errorMsgId?: string, promptText?: string) => {
    setIsProcessing(true);
    const targetPrompt = promptText || 'Autonomous Specialist Agent';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionDesc = `Synthesized agent blueprint locally using built-in offline compiler`;

    try {
      const synth = synthesizeAgentSpec(targetPrompt, '', activeFramework);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          targetFramework: activeFramework,
          manifest: {
            ...state.manifest,
            name: synth.manifest.name,
            description: synth.manifest.description,
            metadata: {
              ...(state.manifest.metadata || {}),
              harness: activeFramework,
              targetFramework: activeFramework
            }
          },
          soul: synth.soul,
          rules: synth.rules,
          skills: synth.skills
        }
      });

      setMessages(prev => {
        // Mark all errors as resolved in place via built-in synthesizer
        const updated = prev.map(msg => 
          msg.isError ? { 
            ...msg, 
            resolved: true, 
            resolvedVia: 'Synthesized Locally (Built-in Compiler)', 
            retrying: false,
            actionTaken: (errorMsgId && msg.id === errorMsgId) ? 'Synthesize Locally' : (msg.actionTaken || 'Synthesize Locally')
          } : msg
        );

        const auditMsg: ChatMessage = {
          id: `audit-${Date.now()}`,
          role: 'user',
          content: `Recovery Action: ${actionDesc}`,
          isAuditLog: true,
          actionTaken: 'Synthesize Locally',
          timestamp
        };

        const synthMsg: ChatMessage = {
          id: `synth-${Date.now() + 1}`,
          role: 'assistant',
          content: synth.explanation,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        return [...updated, auditMsg, synthMsg];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveKeyAndRetry = (errorMsgId: string, promptText?: string, files?: File[]) => {
    if (!inlineKeyInput.trim()) return;
    setApiKey(currentProviderId, inlineKeyInput.trim());
    setShowInlineKeyInput(false);
    setInlineKeyInput('');

    const targetPrompt = promptText || '';
    const targetFiles = files || [];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionDesc = `Updated API key for ${currentProviderId.toUpperCase()} and retried LLM generation`;

    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === errorMsgId ? { ...msg, retrying: true, actionTaken: 'Updated API Key & Retried LLM' } : msg
      );
      const auditMsg: ChatMessage = {
        id: `audit-${Date.now()}`,
        role: 'user',
        content: `Recovery Action: ${actionDesc}`,
        isAuditLog: true,
        actionTaken: 'Update Key & Retry',
        timestamp
      };
      return [...updated, auditMsg];
    });

    handleSend(targetPrompt, targetFiles, { sourceErrorId: errorMsgId, recoveryAction: 'Retried successfully with updated API key' });
  };

  const handleClearKey = (errorMsgId: string) => {
    clearApiKey(currentProviderId);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionDesc = `Cleared saved API key for ${currentProviderId.toUpperCase()}`;

    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === errorMsgId ? { ...msg, actionTaken: 'Cleared API Key' } : msg
      );
      const auditMsg: ChatMessage = {
        id: `audit-${Date.now()}`,
        role: 'user',
        content: `Recovery Action: ${actionDesc}`,
        isAuditLog: true,
        actionTaken: 'Clear Key',
        timestamp
      };
      return [...updated, auditMsg];
    });
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && !last.isError && (last.content.includes('Analyzing') || last.content.includes('Generating'))) {
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

  const handleSend = async (
    overridePrompt?: string, 
    overrideFiles?: File[],
    recoveryOptions?: { sourceErrorId?: string; recoveryAction?: string }
  ) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : input;
    const filesToSend = overrideFiles !== undefined ? overrideFiles : contextFiles;

    if (!promptToSend.trim() && filesToSend.length === 0) return;
    if (isProcessing) return;

    if (!recoveryOptions?.recoveryAction) {
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
    }
    setIsProcessing(true);

    abortControllerRef.current = new AbortController();

    try {
      const { providerId, modelId, parameters } = settings.taskModels.architect;
      const apiKey = settings.apiKeys[providerId];

      const assistantMsgId = `asst-${Date.now()}`;
      const assistantMessage: ChatMessage = { 
        id: assistantMsgId,
        role: 'assistant', 
        content: `Analyzing parameters and compiling agent specification for ${activeFrameworkMeta.label}...`,
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
      
      const systemInstruction = `You are an expert AI Architect. Your goal is to design an agent specification specifically tailored for the target harness "${activeFramework}".
      
      CRITICAL TARGET RUNTIME CONSTRAINTS:
      - Target Execution Runtime / Harness: ${activeFramework} (${activeFrameworkMeta.label})
      - Inferred tools and skill definitions MUST align with the ${activeFramework} harness toolset.
      
      You must respond in JSON format with the following schema:
      {
        "manifest": {
          "name": "string (kebab-case)",
          "description": "string (one sentence)"
        },
        "soul": "Markdown string with ## sections (Core Identity, Communication Style, Values & Principles, Domain Expertise, Collaboration Style)",
        "rules": "Markdown string with ## sections (Must Always, Must Never, Output Constraints, Interaction Boundaries)",
        "skills": "Markdown string with ## Skill: Name sections",
        "explanation": "Brief explanation of what was configured, explicitly confirming target harness: ${activeFramework}"
      }
      
      Guidelines:
      - Core Identity should strictly reflect the agent purpose.
      - Skills should be detailed and include allowed tools aligned with ${activeFramework}.
      - INTEGRATE ALL RELEVANT INFORMATION from any provided documents into the Soul and Rules.
      - The agent name MUST be lowercase kebab-case.`;

      const promptObj = {
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Target Runtime: ${activeFramework} (${activeFrameworkMeta.label})\nUser Prompt: ${promptToSend}` },
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
          options: {
            ...parameters,
            targetFramework: activeFramework
          },
          targetFramework: activeFramework,
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

      // Assert that the generated specification strictly targets the active harness
      assertHarnessMatch({
        selectedHarnessId: activeFramework,
        modelResponse: result,
        stage: 'architect_synthesis'
      });

      // Update workspace with explicit framework binding
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          targetFramework: activeFramework,
          manifest: {
            ...state.manifest,
            name: result.manifest.name,
            description: result.manifest.description,
            metadata: {
              ...(state.manifest.metadata || {}),
              harness: activeFramework,
              targetFramework: activeFramework
            }
          },
          soul: result.soul,
          rules: result.rules,
          skills: result.skills
        }
      });

      let explanation = result.explanation;
      if (!explanation || !explanation.toLowerCase().includes(activeFrameworkMeta.label.toLowerCase())) {
        explanation = `Configured complete agent workspace "${result.manifest.name}" for harness "${activeFramework}". Allowed tools for all generated skills have been contextually aligned with the framework matrix.`;
      }

      setMessages(prev => {
        // Mark all previous error notices as resolved in place
        const resolved = prev.map(msg => {
          if (msg.isError) {
            const via = (recoveryOptions?.sourceErrorId && msg.id === recoveryOptions.sourceErrorId && recoveryOptions.recoveryAction)
              ? recoveryOptions.recoveryAction
              : (msg.actionTaken ? `Resolved via ${msg.actionTaken}` : (recoveryOptions?.recoveryAction || 'Retried successfully via LLM'));
            return {
              ...msg,
              resolved: true,
              resolvedVia: via,
              retrying: false
            };
          }
          return msg;
        });

        return [
          ...resolved.slice(0, -1), 
          { 
            id: assistantMsgId,
            role: 'assistant', 
            content: explanation,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });

      setContextFiles([]);
    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }
      console.error('AI Architect generation error:', err);
      const cleanError = formatErrorMessage(err);

      setMessages(prev => {
        const resetRetrying = prev.map(msg => msg.retrying ? { ...msg, retrying: false } : msg);
        return [
          ...resetRetrying.slice(0, -1),
          { 
            id: `error-${Date.now()}`,
            role: 'assistant', 
            content: cleanError,
            isError: true,
            failedPrompt: promptToSend,
            failedFiles: filesToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
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

  const selectFramework = (frameworkId: AgentFramework) => {
    dispatch({ 
      type: 'UPDATE_WORKSPACE', 
      payload: { targetFramework: frameworkId } 
    });

    dispatch({ 
      type: 'UPDATE_MANIFEST', 
      payload: { 
        metadata: { 
          ...(state.manifest.metadata || {}), 
          harness: frameworkId,
          targetFramework: frameworkId
        } 
      } 
    });
  };

  return (
    <div className="flex flex-col h-full bg-card/60 border border-border/80 rounded-md overflow-hidden shadow-xs">
      {/* Sub-Header Bar with Target Runtime Switcher & Model Switcher */}
      <div className="px-4 py-2 border-b border-border/80 bg-muted/40 flex flex-wrap items-center justify-between shrink-0 gap-2.5">
        {/* Target Runtime Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-sm px-2 py-1 shadow-xs">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
              <Layers className="size-3 text-primary" /> Target Runtime:
            </span>
            <div className="flex items-center gap-1">
              {AGENT_FRAMEWORK_OPTIONS.map(f => {
                const isSelected = activeFramework === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => selectFramework(f.id)}
                    className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-sm transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {f.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Model Selector & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-sm px-1.5 py-0.5 text-xs font-mono">
            <span className="text-[9px] uppercase font-bold text-muted-foreground px-1">Engine:</span>
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
              m.isAuditLog 
                ? "w-full max-w-full" 
                : m.role === 'user' 
                  ? "ml-auto flex-row-reverse" 
                  : "mr-auto"
            )}
          >
            <div className={cn(
              "size-7 rounded-sm flex items-center justify-center shrink-0 border font-mono text-xs shadow-xs",
              m.isAuditLog
                ? "bg-primary/10 text-primary border-primary/30"
                : m.role === 'user' 
                  ? "bg-primary text-primary-foreground font-bold border-primary/50 terracotta-glow-sm" 
                  : m.isError 
                    ? (m.resolved 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                        : m.retrying 
                          ? "bg-primary/10 text-primary border-primary/30 animate-pulse" 
                          : "bg-destructive/10 text-destructive border-destructive/30") 
                    : "bg-muted text-muted-foreground border-border/80"
            )}>
              {m.isAuditLog ? (
                <ShieldCheck className="size-4 text-primary" />
              ) : m.role === 'user' ? (
                <User className="size-4" />
              ) : m.isError ? (
                m.resolved ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : m.retrying ? (
                  <Loader2 className="size-4 text-primary animate-spin" />
                ) : (
                  <AlertCircle className="size-4 text-destructive" />
                )
              ) : (
                <Bot className="size-4 text-primary" />
              )}
            </div>

            <div className={cn("space-y-1.5", m.isAuditLog ? "w-full" : "max-w-[calc(100%-2.5rem)]")}>
              {m.isAuditLog ? (
                /* Recovery Audit Log Banner in Transcript */
                <div className="p-2.5 rounded-sm bg-muted/40 border border-primary/20 text-xs font-mono text-muted-foreground flex items-center justify-between gap-3 shadow-2xs w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="size-3.5 text-primary shrink-0" />
                    <span className="text-foreground text-xs font-sans">
                      <span className="font-bold text-primary font-mono text-[11px] mr-1.5">[AUDIT LOG]</span>
                      {m.content}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.actionTaken && (
                      <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30">
                        {m.actionTaken}
                      </Badge>
                    )}
                    {m.timestamp && (
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{m.timestamp}</span>
                    )}
                  </div>
                </div>
              ) : m.isError ? (
                m.resolved ? (
                  /* Resolved Error State - Collapsed in place, clean & auditable */
                  <div className="p-3 rounded-sm text-xs bg-muted/30 border border-emerald-500/30 text-foreground space-y-2 shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span className="font-semibold text-xs">Generation Notice Resolved</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 py-0">
                        {m.resolvedVia || 'Retried successfully'}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pl-6">
                      <span className="text-amber-500 font-semibold">⚠</span>
                      <span>
                        Original notice: <span className="font-mono text-[10px] bg-background/80 px-1 py-0.5 rounded border border-border/60 text-foreground/80">{m.content}</span>
                        {' '}— <span className="text-emerald-600 dark:text-emerald-400 font-medium">Resolved</span> ({m.resolvedVia || 'Retried successfully'}).
                      </span>
                    </div>
                    <details className="group pl-6 pt-0.5">
                      <summary className="cursor-pointer text-[10px] font-mono text-muted-foreground/70 hover:text-foreground list-none flex items-center gap-1 select-none">
                        <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                        <span>View resolution audit trail</span>
                      </summary>
                      <div className="mt-1.5 p-2 rounded bg-background/60 border border-border/50 text-[10px] font-mono text-muted-foreground space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Resolved & Superseded</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Resolution Path:</span>
                          <span className="text-foreground">{m.resolvedVia || 'Retried successfully'}</span>
                        </div>
                        {m.actionTaken && (
                          <div className="flex items-center justify-between">
                            <span>Action Taken:</span>
                            <span className="text-primary font-medium">{m.actionTaken}</span>
                          </div>
                        )}
                        {m.failedPrompt && (
                          <div className="pt-1 border-t border-border/40">
                            <span className="text-muted-foreground/70">Prompt: </span>
                            <span className="text-foreground/90">{m.failedPrompt.slice(0, 100)}{m.failedPrompt.length > 100 ? '...' : ''}</span>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ) : m.retrying ? (
                  /* In-progress Retry State */
                  <div className="p-3.5 rounded-sm text-xs leading-relaxed bg-primary/[0.04] border border-primary/30 text-foreground space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Loader2 className="size-4 animate-spin shrink-0" />
                        <span className="font-semibold text-xs">Recovery In Progress...</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30 py-0">
                        {m.actionTaken || 'Retrying LLM'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6">
                      Generation failed previously: <span className="font-mono text-[10px] text-foreground/80">{m.content}</span>. Retrying generation with active configuration...
                    </p>
                  </div>
                ) : (
                  /* Enhanced Actionable Error Card with Retry Button and Built-in Synthesizer */
                  <div className="p-4 rounded-sm text-xs leading-relaxed bg-destructive/5 border border-destructive/30 text-foreground space-y-3 shadow-xs">
                    <div className="flex items-start gap-2 text-destructive font-medium">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs tracking-tight">Generation Notice</p>
                          {m.actionTaken && (
                            <Badge variant="outline" className="text-[9px] font-mono bg-muted text-muted-foreground border-border/80">
                              Last Action: {m.actionTaken}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground/90 font-normal">{m.content}</p>
                      </div>
                    </div>

                    {/* Inline Key Configuration option */}
                    {showInlineKeyInput && (
                      <div className="p-2.5 bg-background/80 border border-border/80 rounded-sm space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <KeyRound className="size-3 text-primary" /> Enter {currentProviderId.toUpperCase()} API Key:
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            type="password"
                            placeholder="sk-..."
                            value={inlineKeyInput}
                            onChange={(e) => setInlineKeyInput(e.target.value)}
                            className="h-7 text-xs font-mono bg-background"
                          />
                          <Button
                            size="xs"
                            className="h-7 px-2.5 text-xs font-mono bg-primary text-primary-foreground cursor-pointer"
                            disabled={!inlineKeyInput.trim()}
                            onClick={() => handleSaveKeyAndRetry(m.id, m.failedPrompt, m.failedFiles)}
                          >
                            Save & Retry
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-destructive/20">
                      {m.failedPrompt && (
                        <Button
                          size="xs"
                          variant="default"
                          className="bg-primary hover:bg-[#d96b43] text-primary-foreground text-xs font-mono gap-1.5 h-7 shadow-xs cursor-pointer"
                          onClick={() => handleRetryLLM(m.id, m.failedPrompt, m.failedFiles)}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="size-3" /> Retry LLM
                        </Button>
                      )}

                      {m.failedPrompt && (
                        <Button
                          size="xs"
                          variant="secondary"
                          className="bg-muted hover:bg-muted/80 text-foreground text-xs font-mono gap-1.5 h-7 border border-border/80 cursor-pointer"
                          onClick={() => handleSynthesizeLocally(m.id, m.failedPrompt)}
                          disabled={isProcessing}
                        >
                          <Zap className="size-3 text-amber-500" /> Synthesize Locally
                        </Button>
                      )}

                      <Button
                        size="xs"
                        variant="outline"
                        className="text-xs font-mono gap-1.5 h-7 border-border/80 hover:bg-muted cursor-pointer"
                        onClick={() => setShowInlineKeyInput(!showInlineKeyInput)}
                      >
                        <KeyRound className="size-3 text-primary" /> {showInlineKeyInput ? 'Hide Key Input' : 'Update Key'}
                      </Button>

                      {settings.apiKeys[currentProviderId] && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-xs font-mono gap-1 h-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => handleClearKey(m.id)}
                          title="Clear saved key"
                        >
                          <Trash2 className="size-3" /> Clear Key
                        </Button>
                      )}
                    </div>
                  </div>
                )
              ) : m.isCancelled ? (
                /* Cancelled State Card */
                <div className="p-3 rounded-sm text-xs bg-muted/40 border border-border/60 text-muted-foreground flex items-center gap-2 font-mono">
                  <Square className="size-3 text-warning fill-current" />
                  <span>{m.content}</span>
                </div>
              ) : (
                /* Standard Message Card or Live Pipeline Card */
                <div className={cn(
                  "p-3.5 rounded-sm text-xs leading-relaxed border shadow-xs",
                  m.role === 'user' 
                    ? "bg-primary text-primary-foreground border-primary/50 font-medium" 
                    : "bg-card border-border/80 text-foreground"
                )}>
                  {m.content.includes("Analyzing parameters") || (isProcessing && m.id.startsWith('asst-')) ? (
                    <div className="space-y-3 font-mono">
                      {/* Live Header & Timer */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                          <span>Generating Agent Blueprint</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/30">
                            ⏱ {elapsedSeconds.toFixed(1)}s
                          </Badge>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={handleCancel}
                            className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10 uppercase tracking-wider"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 rounded-full terracotta-glow-sm"
                          style={{
                            width: `${elapsedSeconds < 1.8 ? 25 : elapsedSeconds < 4.0 ? 55 : elapsedSeconds < 6.5 ? 80 : 95}%`
                          }}
                        />
                      </div>

                      {/* Stage Pipeline Steps */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded transition-colors",
                          elapsedSeconds < 1.8 ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground bg-muted/30"
                        )}>
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>1. Intent & Runtime ({activeFrameworkMeta.shortLabel})</span>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded transition-colors",
                          elapsedSeconds >= 1.8 && elapsedSeconds < 4.0 ? "bg-primary/15 text-primary font-bold" : elapsedSeconds > 4.0 ? "text-emerald-500 bg-emerald-500/5" : "text-muted-foreground bg-muted/30"
                        )}>
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>2. Manifest, Soul & Persona</span>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded transition-colors",
                          elapsedSeconds >= 4.0 && elapsedSeconds < 6.5 ? "bg-primary/15 text-primary font-bold" : elapsedSeconds > 6.5 ? "text-emerald-500 bg-emerald-500/5" : "text-muted-foreground bg-muted/30"
                        )}>
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>3. Tools & Matrix Mapping</span>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded transition-colors",
                          elapsedSeconds >= 6.5 ? "bg-primary/15 text-primary font-bold animate-pulse" : "text-muted-foreground bg-muted/30"
                        )}>
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>4. Rules & Specification Health</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              )}

              {m.timestamp && !m.isAuditLog && (
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

        {/* Starter target runtime & prompt suggestion cards if initial message */}
        {messages.length === 1 && (
          <div className="pt-2 space-y-4">
            {/* Step 1: Select Target Runtime & Harness upfront */}
            <div className="p-3.5 rounded-md bg-muted/30 border border-border/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-foreground">
                  <Layers className="size-3.5 text-primary" />
                  <span>1. Choose Target Runtime / Harness</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Selected: <strong className="text-primary font-bold">{AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework)?.label}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {AGENT_FRAMEWORK_OPTIONS.map(f => {
                  const isSelected = activeFramework === f.id;
                  const tools = AGENT_FRAMEWORK_TOOLS[f.id] || [];
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => selectFramework(f.id)}
                      className={cn(
                        "text-left p-2.5 rounded-sm border transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                          : "bg-background/80 hover:bg-muted/60 border-border/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn("text-xs font-bold font-mono", isSelected ? "text-primary" : "text-foreground")}>
                          {f.label}
                        </span>
                        {isSelected && <CheckCircle2 className="size-3 text-primary shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                        {f.description}
                      </span>
                      <div className="pt-1 text-[9px] font-mono text-muted-foreground/80 flex items-center justify-between w-full border-t border-border/40">
                        <span>{tools.length} Tools</span>
                        <span className="text-primary/90 font-semibold">{f.shortLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Prompt / Intent */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-1">
                <Lightbulb className="size-3 text-warning" />
                <span>2. Recommended Starting Blueprints</span>
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
