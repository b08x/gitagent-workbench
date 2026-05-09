import { useState, useRef, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Upload, 
  X, 
  Bot, 
  User, 
  Sparkles, 
  Loader2,
  FileText,
  Save
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isInitializing?: boolean;
}

export function AgentWizard() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: "Hello! I'm here to help you build your agent. Tell me what your agent should do, and feel free to upload any documents for context.",
      isInitializing: true 
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

  const handleSend = async () => {
    if (!input.trim() && contextFiles.length === 0) return;
    if (isProcessing) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const { providerId, modelId, parameters } = settings.taskModels.architect;
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: "I'm analyzing your request and context to configure your agent..." 
      };
      setMessages(prev => [...prev, assistantMessage]);

      const fileParts = await Promise.all(contextFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            // Format for Vercel AI SDK multimodal
            if (file.type.startsWith('image/')) {
              resolve({ type: 'image', image: base64Data, mimeType: file.type });
            } else {
              // For non-images, we'll try to pass as file if the provider supports it, 
              // or just provide it as text if it's a known text type
              resolve({ type: 'file', data: base64Data, mimeType: file.type || 'application/octet-stream' });
            }
          };
          reader.readAsDataURL(file);
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

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId,
          modelId,
          options: parameters,
          prompt: {
            system: systemInstruction,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: `User Prompt: ${input}` },
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
          }
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
          skills: result.skills // Note: AgentContext should parse this string
        }
      });

      setMessages(prev => [
        ...prev.slice(0, -1), 
        { 
          role: 'assistant', 
          content: result.explanation || "I've updated your agent configuration based on the provided input and context."
        }
      ]);

      setContextFiles([]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: "Sorry, I had trouble processing that request. Please ensure your prompt is clear and files are readable." }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-xl overflow-hidden shadow-lg mx-auto w-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">Agent Architect</h3>
            <p className="text-xs text-muted-foreground">AI-assisted configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'Wizard Update' })}>
                <Save className="h-4 w-4 mr-2" /> Save Progress
            </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={cn(
              "flex gap-4 max-w-[85%]",
              m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                m.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none"
            )}>
                {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* Context Chips */}
      {contextFiles.length > 0 && (
        <div className="px-6 py-2 border-t bg-muted/30 flex flex-wrap gap-2">
            {contextFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-background border rounded-full px-3 py-1 text-xs">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t bg-card">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Textarea 
              placeholder="Describe your agent, e.g., 'Build me a research agent named DeepSearch...'"
              className="min-h-[60px] max-h-[150px] resize-none pr-10"
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
                className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="h-5 w-5" />
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
            className="h-auto px-6" 
            onClick={handleSend}
            disabled={(!input.trim() && contextFiles.length === 0) || isProcessing}
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
