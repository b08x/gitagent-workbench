import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { assembleSystemPrompt } from '../../lib/gitagent/assembleSystemPrompt';
import { fetchChatModels, ModelOption, CURATED_MODELS } from '../../lib/gitagent/fetchChatModels';
import { providers } from '../../lib/providers';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { 
  Send, 
  Square, 
  RotateCcw, 
  Download, 
  Copy, 
  AlertCircle, 
  MessageSquare,
  Bot,
  User,
  ShieldAlert,
  Terminal,
  Check,
  Sparkles
} from 'lucide-react';
import { cn, formatErrorMessage } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  flagged?: boolean;
  flagReason?: string;
  modelId?: string;
  isError?: boolean;
  failedPrompt?: string;
}

interface ChatModelState {
  providerId: string;
  modelId: string;
  availableModels: ModelOption[];
  fetchStatus: 'idle' | 'fetching' | 'success' | 'error';
  fetchError: string | null;
}

export function ChatWorkbench() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [chatModel, setChatModel] = useState<ChatModelState>(() => {
    const pId = settings.taskModels.chatTests?.providerId || 'google';
    const mId = settings.taskModels.chatTests?.modelId || 'gemini-3.7-flash';
    return {
      providerId: pId,
      modelId: mId,
      availableModels: CURATED_MODELS[pId] || [],
      fetchStatus: 'idle',
      fetchError: null
    };
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUserPromptRef = useRef<string>('');

  const assembledPrompt = useMemo(() => {
    return assembleSystemPrompt(state);
  }, [state]);

  const loadModelsForProvider = useCallback(async (providerId: string) => {
    setChatModel(prev => ({ ...prev, fetchStatus: 'fetching', fetchError: null }));
    try {
      const apiKey = settings.apiKeys[providerId];
      const models = await fetchChatModels(providerId, apiKey);
      setChatModel(prev => ({
        ...prev,
        availableModels: models,
        fetchStatus: 'success',
        modelId: models[0]?.id || prev.modelId
      }));
    } catch (err: any) {
      console.warn(`Failed to fetch models for ${providerId}:`, err);
      const fallback = CURATED_MODELS[providerId] || [];
      setChatModel(prev => ({
        ...prev,
        availableModels: fallback,
        fetchStatus: 'error',
        fetchError: formatErrorMessage(err)
      }));
    }
  }, [settings.apiKeys]);

  const handleProviderChange = (newProviderId: string) => {
    const curated = CURATED_MODELS[newProviderId] || [];
    const defaultModel = curated[0]?.id || '';
    setChatModel({
      providerId: newProviderId,
      modelId: defaultModel,
      availableModels: curated,
      fetchStatus: 'idle',
      fetchError: null
    });
    loadModelsForProvider(newProviderId);
  };

  const handleModelChange = (newModelId: string) => {
    setChatModel(prev => ({ ...prev, modelId: newModelId }));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    handleStop();
    setMessages([]);
  };

  const checkRuleViolations = (content: string): { flagged: boolean; reason?: string } => {
    const rules = state.rules || '';
    if (!rules) return { flagged: false };

    const lower = content.toLowerCase();
    if (rules.includes('MUST NEVER') && lower.includes('password') && lower.includes('reveal')) {
      return { flagged: true, reason: 'Potentially violated: MUST NEVER reveal secrets' };
    }
    return { flagged: false };
  };

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt !== undefined ? overridePrompt : input;
    if (!textToSend.trim() || !chatModel.modelId) return;
    if (isStreaming) return;

    lastUserPromptRef.current = textToSend;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (overridePrompt === undefined) setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      modelId: chatModel.modelId
    };

    setMessages(prev => [...prev, assistantMessage]);

    abortControllerRef.current = new AbortController();

    try {
      const conversationHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const promptPayload = {
        system: assembledPrompt,
        messages: conversationHistory
      };

      const encodedPrompt = btoa(unescape(encodeURIComponent(JSON.stringify(promptPayload))));
      const apiKey = settings.apiKeys[chatModel.providerId];

      const response = await fetch('/api/compute/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: chatModel.providerId,
          modelId: chatModel.modelId,
          apiKey: apiKey && apiKey !== '********' ? apiKey : undefined,
          options: {
            temperature: 0.7
          },
          prompt: encodedPrompt
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errStr = `HTTP error! status: ${response.status}`;
        try {
          const errJson = await response.json();
          errStr = errJson.error || errStr;
        } catch {
          const text = await response.text();
          if (text) errStr = text;
        }
        throw new Error(errStr);
      }

      const data = await response.json();
      const content = data.text || (typeof data.object === 'string' ? data.object : JSON.stringify(data.object, null, 2)) || 'No response content.';

      const violation = checkRuleViolations(content);

      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') {
          last.content = content;
          last.flagged = violation.flagged;
          last.flagReason = violation.reason;
          last.isError = false;
        }
        return next;
      });

    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) return;
      console.error(err);
      const cleanErr = formatErrorMessage(err);
      
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') {
          last.content = `Error: ${cleanErr}`;
          last.isError = true;
          last.failedPrompt = textToSend;
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleExportGoodOutput = (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant') return;

    const newGoodOutputs = [...(state.evals?.goodOutputs || []), msg.content];
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        evals: {
          ...state.evals,
          goodOutputs: newGoodOutputs
        }
      }
    });

    setToast('Added to evals/goodOutputs.md');
    setTimeout(() => setToast(null), 3000);
  };

  const suggestionChips = [
    "Tell me about your core objective and persona.",
    "What tools and permissions do you have access to?",
    "Run a diagnostic check on your rules and constraints."
  ];

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-background text-foreground select-text">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border/80 bg-card/60 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-20 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <MessageSquare className="size-4.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <h1 className="font-bold text-sm tracking-tight text-foreground">Agent Test Lab</h1>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary px-1.5 py-0.2 bg-primary/10 rounded-sm">
              LIVE RUNTIME
            </span>
          </div>
        </div>

        {/* Model Selector Strip */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 border border-border/60 rounded-sm">
            <Select value={chatModel.providerId} onValueChange={handleProviderChange}>
              <SelectTrigger className="h-7 text-xs font-mono border-none shadow-none bg-transparent w-[120px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(providers).map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-mono">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-border">/</span>

            <Select value={chatModel.modelId} onValueChange={handleModelChange}>
              <SelectTrigger className="h-7 text-xs font-mono border-none shadow-none bg-transparent w-[160px]">
                <SelectValue placeholder={chatModel.fetchStatus === 'fetching' ? 'Loading...' : 'Select Model'} />
              </SelectTrigger>
              <SelectContent>
                {chatModel.availableModels.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-xs font-mono">
                    <span className="truncate">{m.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            disabled={messages.length === 0}
            className="text-xs"
          >
            <RotateCcw className="size-3.5 mr-1" /> Reset
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className={cn("text-xs font-mono", showSystemPrompt && "bg-muted/80 text-foreground")}
          >
            <Terminal className="size-3.5 mr-1 text-primary" />
            Prompt ({Math.round(assembledPrompt.length / 4)} tok)
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Drawer: System Prompt Inspector */}
        {showSystemPrompt && (
          <div className="w-80 shrink-0 border-r border-border/80 bg-sidebar/50 flex flex-col overflow-hidden select-none animate-in slide-in-from-left duration-200">
            <div className="h-11 px-4 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Terminal className="size-3 text-primary" /> Active System Prompt
              </span>
              <Button 
                variant="ghost" 
                size="xs"
                onClick={() => {
                  navigator.clipboard.writeText(assembledPrompt);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                }}
                className="text-[10px] font-mono uppercase"
              >
                {copiedPrompt ? <Check className="size-3 text-emerald-500 mr-1" /> : <Copy className="size-3 mr-1" />}
                {copiedPrompt ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <pre className="font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap selection:bg-primary/20">
                {assembledPrompt}
              </pre>
            </div>
          </div>
        )}

        {/* Center: Chat Thread */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          {toast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
              <Badge className="px-3 py-1.5 shadow-md bg-primary text-primary-foreground font-mono text-xs">
                {toast}
              </Badge>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-12">
                <div className="size-14 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm">
                  <MessageSquare className="size-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold tracking-tight text-foreground">Interactive Agent Playground</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Test your agent's instructions, tone, and guardrails live with multi-turn conversations.
                  </p>
                </div>

                <div className="space-y-2 w-full">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    Try Asking:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {suggestionChips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(chip)}
                        className="text-left text-xs p-2.5 rounded-sm bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-muted-foreground uppercase">
                    {m.role === 'user' ? (
                      <>
                        <span>You</span>
                        <User className="size-3" />
                      </>
                    ) : (
                      <>
                        <Bot className="size-3 text-primary" />
                        <span className="text-primary font-bold">Agent</span>
                        {m.modelId && <span className="text-muted-foreground/60">• {m.modelId}</span>}
                      </>
                    )}
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-sm text-xs leading-relaxed border shadow-xs",
                    m.role === 'user' 
                      ? "bg-primary text-primary-foreground border-primary/50 font-medium" 
                      : m.isError
                        ? "bg-destructive/5 border-destructive/30 text-foreground"
                        : "bg-card border-border/80 text-foreground",
                    m.flagged && "border-l-4 border-l-amber-500 bg-amber-50/20"
                  )}>
                    {m.isError ? (
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2 text-destructive">
                          <AlertCircle className="size-4 shrink-0 mt-0.5" />
                          <span>{m.content}</span>
                        </div>
                        {m.failedPrompt && (
                          <div className="pt-2 border-t border-destructive/20">
                            <Button
                              size="xs"
                              variant="outline"
                              className="text-xs font-mono gap-1.5 h-6"
                              onClick={() => handleSend(m.failedPrompt)}
                              disabled={isStreaming}
                            >
                              <RotateCcw className="size-3" /> Retry Prompt
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}

                    {isStreaming && i === messages.length - 1 && (
                      <span className="inline-block size-2 bg-primary animate-pulse ml-1 align-middle" />
                    )}
                  </div>

                  {m.role === 'assistant' && !isStreaming && !m.isError && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleExportGoodOutput(i)}
                        className="text-[9px] font-mono text-muted-foreground hover:text-primary h-5 px-1 cursor-pointer"
                      >
                        <Download className="size-2.5 mr-1" /> Save to Evals
                      </Button>
                      {m.flagged && (
                        <span className="text-[9px] font-mono text-amber-600 flex items-center gap-1">
                          <ShieldAlert className="size-3" /> {m.flagReason}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-border/80 bg-card shrink-0">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Textarea 
                placeholder="Message your agent to test responses and adherence to rules..."
                className="min-h-[60px] max-h-[140px] resize-none text-xs font-sans rounded-sm bg-background border-border/80 focus-visible:ring-primary/40 focus-visible:border-primary"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!chatModel.modelId || isStreaming}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex flex-col justify-end">
                {isStreaming ? (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-10 px-4 rounded-sm gap-1 font-mono uppercase text-xs"
                    onClick={handleStop}
                    title="Stop Streaming"
                  >
                    <Square className="size-3.5 fill-current" /> Stop
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    className="h-10 px-4 rounded-sm bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium shadow-xs"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || !chatModel.modelId}
                  >
                    <Send className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
