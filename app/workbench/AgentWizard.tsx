import React, { useState, useRef, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isInitializing?: boolean;
  timestamp?: string;
}

export function AgentWizard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: "Hello! I am your AI Architect. Describe your agent's purpose, target workflows, domain guidelines, or upload spec documents (Markdown, TXT, JSON). I will configure the manifest, soul, rules, and skills in real time.",
      isInitializing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setContextFiles([...contextFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setContextFiles(contextFiles.filter((_, i) => i !== index));
  };

  const handleSend = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt || input;
    if (!promptToSend.trim() && contextFiles.length === 0) return;
    if (isProcessing) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = { role: 'user', content: promptToSend, timestamp: userTime };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const { providerId, modelId, parameters } = settings.taskModels.architect;
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: "Analyzing parameters and compiling agent specification...",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);

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
          options: parameters,
          prompt: encodedPrompt
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
          const text = await response.text();
          console.error('Non-JSON error response:', text);
          throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
        }
      }

      const data = await response.json();
      const result = data.object;

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
          role: 'assistant', 
          content: result.explanation || "I've configured your agent workspace with the requested manifest, soul, rules, and skill definitions.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      setContextFiles([]);
    } catch (err: any) {
      console.error(err);
      const errorText = err?.message || "Sorry, I had trouble processing that request.";
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          role: 'assistant', 
          content: `Error: ${errorText}\n\nTip: You can switch providers or update your API key in the Model / Settings step, or use Gemini.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const starterPrompts = [
    "Design a senior TypeScript & React code reviewer with strict linter rules and automated git-diff inspections.",
    "Build a technical research agent that ingests PDFs, performs web queries, and writes executive summaries with citations.",
    "Create a DevOps reliability bot for monitoring alerts, parsing logs, and safely triggering rollbacks with approval gates."
  ];

  return (
    <div className="flex flex-col h-full bg-card/60 border border-border/80 rounded-md overflow-hidden shadow-xs">
      {/* Sub-Header */}
      <div className="px-5 py-3 border-b border-border/80 bg-muted/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-sm bg-primary/15 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs tracking-tight text-foreground">AI Architect Studio</h3>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded-sm">
                COMPUTE
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Natural language synthesis & automated configuration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="xs" 
            onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'AI Architect Sync' })}
            className="text-[10px] font-mono uppercase tracking-wider"
          >
            <Save className="size-3 mr-1" /> Snapshot
          </Button>
        </div>
      </div>

      {/* Messages Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4"
      >
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={cn(
              "flex gap-3 max-w-[88%]",
              m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "size-7 rounded-sm flex items-center justify-center shrink-0 border border-border/80 font-mono text-xs",
              m.role === 'user' ? "bg-primary text-primary-foreground font-bold terracotta-glow-sm" : "bg-muted text-muted-foreground"
            )}>
              {m.role === 'user' ? <User className="size-4" /> : <Bot className="size-4 text-primary" />}
            </div>

            <div className="space-y-1">
              <div className={cn(
                "p-3.5 rounded-sm text-xs leading-relaxed border shadow-xs",
                m.role === 'user' 
                  ? "bg-primary text-primary-foreground border-primary/50 font-medium" 
                  : "bg-card border-border/80 text-foreground"
              )}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>

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
                  className="text-left text-xs p-2.5 rounded-sm bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-between group"
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
            <div key={i} className="flex items-center gap-1.5 bg-background border border-border/80 rounded-sm px-2 py-0.5 text-[11px] font-mono">
              <FileText className="size-3 text-primary" />
              <span className="truncate max-w-[140px] text-foreground">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Composer */}
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
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-primary transition-colors p-1"
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
          <Button 
            className="h-auto px-4 rounded-sm bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium transition-all shadow-xs" 
            onClick={() => handleSend()}
            disabled={(!input.trim() && contextFiles.length === 0) || isProcessing}
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
