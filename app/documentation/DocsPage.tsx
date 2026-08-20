import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, FileText, HelpCircle, ChevronLeft, ChevronRight, Terminal, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const docs = [
  {
    id: 'getting-started',
    title: 'Getting Started with GitAgent',
    icon: Book,
    category: 'Architecture',
    path: '/docs/getting-started.md',
    summary: 'Core concepts of GitAgent specification, directory structure, and agent runtime.'
  },
  {
    id: 'agent-patterns',
    title: 'Multi-Agent & Workflow Patterns',
    icon: FileText,
    category: 'Design Patterns',
    path: '/docs/agent-patterns.md',
    summary: 'DAG pipeline execution, DAG cyclic graph detection, and failover escalation policies.'
  },
  {
    id: 'custom-tools',
    title: 'Custom Tools & Sandboxed Skills',
    icon: HelpCircle,
    category: 'Extensibility',
    path: '/docs/custom-tools.md',
    summary: 'Authoring SKILL.md specs, sandboxing command permissions, and tool whitelists.'
  }
];

export function DocsPage() {
  const [selectedDocId, setSelectedDocId] = useState<string>('getting-started');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const selectedDoc = docs.find(d => d.id === selectedDocId) || docs[0];

  useEffect(() => {
    if (selectedDoc) {
      setLoading(true);
      fetch(selectedDoc.path)
        .then(res => {
          if (!res.ok) throw new Error('File not found');
          return res.text();
        })
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          // Provide fallback documentation content
          setContent(`# ${selectedDoc.title}\n\n## Overview\n${selectedDoc.summary}\n\n### Directory Layout\n\`\`\`text\nmy-agent/\n├── agent.yaml       # Root manifest\n├── SOUL.md          # Personality, identity, and tone\n├── RULES.md         # Must always / Must never constraints\n├── PROMPT.md        # Core system instructions\n├── DUTIES.md        # Primary responsibilities\n├── skills/          # Standalone modular capabilities\n│   └── web-search/\n│       └── SKILL.md\n└── workflows/       # Multi-step pipeline DAGs\n    └── review-code.yaml\n\`\`\`\n\n### Key Principles\n1. **Plain Text Versionable**: Everything is committed to Git.\n2. **Zero Vendor Lock-in**: Compatible with Claude Code, Gemini CLI, and Hermes Python.\n3. **Granular Guardrails**: Explicit MUST ALWAYS / MUST NEVER enforcement.`);
          setLoading(false);
        });
    }
  }, [selectedDoc]);

  return (
    <div className="h-full w-full overflow-hidden flex flex-row bg-background text-foreground select-text">
      {/* Left Pane: Documentation Navigation */}
      <div className="w-72 shrink-0 border-r border-border/80 bg-sidebar/50 flex flex-col overflow-hidden select-none">
        <div className="h-14 px-5 border-b border-border/80 bg-card/60 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h2 className="font-bold text-xs uppercase tracking-widest text-foreground">Documentation</h2>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono uppercase text-primary border-primary/30">
            v1.0.0
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
            Reference Guides
          </div>
          {docs.map((doc) => {
            const isActive = selectedDocId === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={cn(
                  "p-3 rounded-sm text-xs transition-all cursor-pointer border flex flex-col gap-1",
                  isActive 
                    ? "bg-card border-primary/50 text-foreground shadow-xs" 
                    : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{doc.title}</span>
                  <doc.icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {doc.summary}
                </p>
                <div className="text-[9px] font-mono uppercase text-primary/80 pt-1">
                  {doc.category}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Pane: Markdown Content Reader */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        <div className="h-14 px-6 border-b border-border/80 bg-card/40 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <h1 className="font-bold text-sm text-foreground">{selectedDoc.title}</h1>
            <p className="text-[11px] text-muted-foreground">{selectedDoc.category} • GitAgent Specification Standard</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert prose-headings:font-sans prose-pre:font-mono prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border/60 prose-sm leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
