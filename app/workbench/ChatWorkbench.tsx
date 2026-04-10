import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { assembleSystemPrompt } from '../../lib/gitagent/assembleSystemPrompt';
import { fetchChatModels, ModelOption, CURATED_MODELS } from '../../lib/gitagent/fetchChatModels';
import { providers } from '../../lib/providers';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { 
  Send, 
  Square, 
  RefreshCw, 
  RotateCcw, 
  Download, 
  Copy, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Bot,
  User,
  ShieldAlert,
  Terminal
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  flagged?: boolean;
  flagReason?: string;
  modelId?: string;
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

  const [chatModel, setChatModel] = useState<ChatModelState>({
    providerId: settings.providerId ?? 'anthropic',
    modelId: '',
    availableModels: [],
    fetchStatus: 'idle',
    fetchError: null,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const assembledPrompt = useMemo(() => assembleSystemPrompt(state), [state]);

  const fetchModelsForProvider = useCallback(async (providerId: string) => {
    setChatModel(s => ({ ...s, fetchStatus: 'fetching', fetchError: null }));
    const apiKey = settings.apiKeys?.[providerId];
    try {
      const models = await fetchChatModels(providerId, apiKey);
      setChatModel(s => ({
        ...s,
        availableModels: models,
        modelId: s.modelId || models[0]?.id || '',
        fetchStatus: 'success',
      }));
    } catch (err) {
      const fallback = CURATED_MODELS[providerId] ?? [];
      setChatModel(s => ({
        ...s,
        availableModels: fallback,
        modelId: s.modelId || fallback[0]?.id || '',
        fetchStatus: 'error',
        fetchError: err instanceof Error ? err.message : 'Could not fetch model list',
      }));
    }
  }, [settings.apiKeys]);

  useEffect(() => {
    fetchModelsForProvider(chatModel.providerId);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleProviderChange = (newProviderId: string) => {
    setChatModel(s => ({
      ...s,
      providerId: newProviderId,
      modelId: '',
      availableModels: [],
      fetchStatus: 'idle',
      fetchError: null,
    }));
    fetchModelsForProvider(newProviderId);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  const handleExport = () => {
    const sessionMd = messages.map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      return `### ${role} (${m.timestamp.toISOString()})\n\n${m.content}`;
    }).join('\n\n---\n\n');

    const exportContent = `## Test Session - ${new Date().toLocaleDateString()}\n\n${sessionMd}`;
    
    dispatch({
      type: 'SET_FILE',
      payload: {
        path: 'examples/test-session.md',
        content: exportContent
      }
    });

    // Also append to goodOutputs as requested
    const currentGood = state.examples.goodOutputs || '';
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        examples: {
          ...state.examples,
          goodOutputs: currentGood + (currentGood ? '\n\n' : '') + exportContent
        }
      }
    });

    setToast('Session exported to workspace examples');
    setTimeout(() => setToast(null), 3000);
  };

  const checkRules = (content: string, rules: string | null): { flagged: boolean; reason?: string } => {
    if (!rules) return { flagged: false };
    
    const mustNeverStatements = rules.split('\n')
      .map(line => line.trim())
      .filter(line => {
        const lower = line.toLowerCase();
        return lower.includes('must not') || 
               lower.includes('never') || 
               lower.includes('do not') || 
               lower.includes("don't") || 
               lower.includes('prohibited');
      });

    for (const statement of mustNeverStatements) {
      // Very simple heuristic: if the assistant response contains keywords from a "must never" line
      // this is just a signal for the user to review.
      const keywords = statement.split(' ').filter(w => w.length > 4);
      if (keywords.some(k => content.includes(k))) {
        return { 
          flagged: true, 
          reason: `Possible constraint signal — review against RULES.md: "${statement}"` 
        };
      }
    }

    return { flagged: false };
  };

  const handleSend = async () => {
    if (!input.trim() || !chatModel.modelId || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      modelId: chatModel.modelId,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const provider = providers[chatModel.providerId];
      const apiKey = settings.apiKeys?.[chatModel.providerId];

      if (!apiKey) {
        throw new Error(`API key missing for ${provider.name}`);
      }

      const prompt = {
        system: assembledPrompt,
        user: input,
      };

      // Note: we don't pass the full history here because the provider.stream() 
      // implementation in this codebase currently only takes system + user prompt.
      // In a real app, we'd pass the full message history.
      // For this workbench, we'll stick to the existing provider interface.
      
      let fullResponse = '';
      for await (const chunk of provider.stream(prompt, apiKey, chatModel.modelId)) {
        fullResponse += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: fullResponse }];
        });
      }

      const { flagged, reason } = checkRules(fullResponse, state.rules);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, flagged, flagReason: reason }];
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Silent
      } else {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { 
            ...last, 
            content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` 
          }];
        });
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const suggestionChips = [
    "Who are you and what is your purpose?",
    "What are the core rules you must follow?",
    "Tell me about your available skills."
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Model Selector Bar */}
      <div className="h-14 border-b flex items-center px-4 gap-4 bg-card/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</span>
          <Select value={chatModel.providerId} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="mistral">Mistral</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</span>
          <Select 
            value={chatModel.modelId} 
            onValueChange={(val) => setChatModel(s => ({ ...s, modelId: val }))}
            disabled={chatModel.availableModels.length === 0 || chatModel.fetchStatus === 'fetching'}
          >
            <SelectTrigger className="w-64 h-8 text-xs">
              <SelectValue placeholder={chatModel.fetchStatus === 'fetching' ? "Fetching..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent>
              {chatModel.availableModels.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => fetchModelsForProvider(chatModel.providerId)}
            disabled={chatModel.fetchStatus === 'fetching'}
          >
            <RefreshCw className={cn("h-4 w-4", chatModel.fetchStatus === 'fetching' && "animate-spin")} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {chatModel.fetchStatus === 'success' && (
            <Badge variant="secondary" className="text-[10px] h-5">{chatModel.availableModels.length} models</Badge>
          )}
          {chatModel.fetchStatus === 'error' && (
            <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-200 bg-amber-50">Using defaults</Badge>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-2" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-2" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export Session
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - System Prompt Inspector */}
        <div className={cn(
          "border-r bg-muted/30 transition-all duration-300 flex flex-col",
          showSystemPrompt ? "w-[400px]" : "w-0 overflow-hidden border-r-0"
        )}>
          <div className="p-4 border-b flex items-center justify-between bg-card">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              System Prompt
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">
                ~{Math.round(assembledPrompt.length / 4).toLocaleString()} tokens
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => navigator.clipboard.writeText(assembledPrompt)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
            {!state.soul && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  <strong>SOUL.md missing.</strong> The agent identity will be weak. Consider generating a soul first.
                </p>
              </div>
            )}
            <div className="flex-1 border rounded-md bg-background p-3 overflow-auto">
              <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {assembledPrompt}
              </pre>
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <div className="relative">
          <Button 
            variant="secondary" 
            size="icon" 
            className="absolute top-4 -left-4 h-8 w-8 rounded-full shadow-md z-10 border"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          >
            {showSystemPrompt ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Right Column - Chat Thread */}
        <div className="flex-1 flex flex-col bg-background relative">
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
              <Badge className="px-4 py-2 shadow-lg bg-primary text-primary-foreground">
                {toast}
              </Badge>
            </div>
          )}

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                <div className="space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Agent Test Lab</h3>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm">
                    Test your agent's identity and constraints before exporting. 
                    The system prompt is live-assembled from your current workspace.
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {suggestionChips.map((chip, i) => (
                    <Button 
                      key={i} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full text-xs"
                      onClick={() => setInput(chip)}
                    >
                      {chip}
                    </Button>
                  ))}
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
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {m.role === 'user' ? (
                      <>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">You</span>
                        <User className="h-3 w-3 text-muted-foreground" />
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Agent</span>
                      </>
                    )}
                  </div>
                  
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                    m.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted rounded-tl-none border-l-4 border-transparent",
                    m.flagged && "border-l-amber-500 bg-amber-50/50"
                  )}>
                    {m.content || (isStreaming && i === messages.length - 1 ? (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle" />
                    ) : null)}
                    {m.content && isStreaming && i === messages.length - 1 && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle ml-1" />
                    )}
                  </div>

                  {m.role === 'assistant' && (
                    <div className="flex flex-col mt-1 px-1 gap-1">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {m.modelId}
                      </span>
                      {m.flagged && (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <ShieldAlert className="h-3 w-3" />
                          <span className="text-[10px] font-medium">{m.flagReason}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t bg-card">
            <div className="max-w-4xl mx-auto space-y-4">
              {!chatModel.modelId && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Select a model to start testing
                </p>
              )}
              <div className="relative">
                <Textarea 
                  placeholder="Message your agent..."
                  className="min-h-[100px] pr-24 resize-none shadow-inner"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!chatModel.modelId || isStreaming}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {isStreaming ? (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 w-8 rounded-full" 
                      onClick={handleStop}
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="h-8 w-8 rounded-full" 
                      onClick={handleSend}
                      disabled={!input.trim() || !chatModel.modelId}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground">
                Testing against current workspace. Changes in other tabs are reflected immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
