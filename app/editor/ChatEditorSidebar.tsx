import React, { useState, useRef, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { providers } from '../../lib/providers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Mic, 
  MicOff, 
  Monitor, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  Bot,
  User,
  Check,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

interface Attachment {
  type: 'file' | 'image' | 'voice';
  name: string;
  content?: string; // For text files
  dataUrl?: string; // For images/voice
}

export function ChatEditorSidebar() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recognition
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          setAttachments(prev => [...prev, {
            type: 'image',
            name: file.name,
            dataUrl: e.target?.result as string
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          setAttachments(prev => [...prev, {
            type: 'file',
            name: file.name,
            content: e.target?.result as string
          }]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        
        setAttachments(prev => [...prev, {
          type: 'image',
          name: 'Screen Share',
          dataUrl
        }]);

        stream.getTracks().forEach(track => track.stop());
      };
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    try {
      const provider = providers[settings.providerId];
      const apiKey = settings.apiKeys[settings.providerId];

      if (!apiKey && settings.providerId !== 'ollama') {
        throw new Error('API Key missing');
      }

      // Prepare context from attachments
      let context = '';
      userMessage.attachments?.forEach(at => {
        if (at.type === 'file') {
          context += `\n\nFile: ${at.name}\nContent:\n${at.content}`;
        }
      });

      const systemPrompt = `You are an expert AI coding assistant. 
You help the user edit files in their GitAgent workspace.
Current Workspace Files:
- agent.yaml (Manifest)
- SOUL.md (Identity)
- RULES.md (Constraints)
- PROMPT.md (System Prompt Template)
- DUTIES.md (Task list)
- skills/*.md (Individual skills)

When suggesting edits, use the following format:
\`\`\`edit <filename>
<new content>
\`\`\`
Example:
\`\`\`edit SOUL.md
You are a helpful assistant...
\`\`\`

User context might include uploaded files or screenshots.
Analyze the user request and provide helpful guidance or direct file edits.`;

      const prompt = {
        system: systemPrompt,
        user: `${context}\n\nUser Request: ${userMessage.content}`
      };

      let fullResponse = '';
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      for await (const chunk of provider.stream(prompt, apiKey, settings.modelId)) {
        fullResponse += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: fullResponse }];
        });
      }

      // Parse and apply edits
      const editRegex = /```edit\s+([^\n]+)\n([\s\S]*?)```/g;
      let match;
      while ((match = editRegex.exec(fullResponse)) !== null) {
        const filename = match[1].trim();
        const content = match[2];
        applyEdit(filename, content);
      }

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const applyEdit = (filename: string, content: string) => {
    if (filename === 'agent.yaml') {
      try {
        const manifest = JSON.parse(content);
        dispatch({ type: 'UPDATE_MANIFEST', payload: manifest });
      } catch (e) {
        console.error('Failed to parse manifest edit', e);
      }
    } else if (filename === 'SOUL.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { soul: content } });
    } else if (filename === 'RULES.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { rules: content } });
    } else if (filename === 'PROMPT.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { prompt_md: content } });
    } else if (filename === 'DUTIES.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { duties: content } });
    } else if (filename.startsWith('skills/')) {
      const name = filename.split('/')[1].replace('.md', '');
      const updatedSkills = { ...state.skills };
      if (updatedSkills[name]) {
        updatedSkills[name] = { ...updatedSkills[name], instructions: content };
        dispatch({ type: 'UPDATE_WORKSPACE', payload: { skills: updatedSkills } });
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full border-l bg-card w-80 shrink-0">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Editor Assistant
        </h3>
        <Badge variant="outline" className="text-[10px]">v1.0</Badge>
      </div>

      <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-muted-foreground">Ask me to help you edit your agent's files.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" size="xs" className="text-[10px]" onClick={() => setInput("Refactor my SOUL.md to be more professional")}>Refactor SOUL</Button>
                <Button variant="outline" size="xs" className="text-[10px]" onClick={() => setInput("Add a new skill for data analysis")}>Add Skill</Button>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "flex flex-col gap-1",
              m.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "max-w-[90%] p-3 rounded-lg text-sm",
                m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {m.content}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.attachments.map((at, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px] gap-1">
                        {at.type === 'file' ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                        {at.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t space-y-4 bg-muted/20">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((at, i) => (
              <div key={i} className="relative group">
                <Badge variant="secondary" className="pr-6">
                  {at.type === 'file' ? <FileText className="h-3 w-3 mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                  {at.name}
                </Badge>
                <button 
                  onClick={() => removeAttachment(i)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Textarea 
            placeholder="Describe your changes..."
            className="min-h-[80px] pr-12 resize-none text-sm"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            size="icon" 
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
            onClick={handleSend}
            disabled={isStreaming || (!input.trim() && attachments.length === 0)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", isRecording && "text-red-500 bg-red-50")}
              onClick={toggleRecording}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleScreenShare}>
              <Monitor className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileUpload}
            />
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {isRecording ? 'Listening...' : 'Context-aware edits'}
          </p>
        </div>
      </div>
    </div>
  );
}
