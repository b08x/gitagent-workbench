import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, FileText, HelpCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const docs = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    path: '/docs/getting-started.md',
    category: 'Guides'
  },
  {
    id: 'agent-patterns',
    title: 'Agent Patterns',
    icon: FileText,
    path: '/docs/agent-patterns.md',
    category: 'Best Practices'
  },
  {
    id: 'custom-tools',
    title: 'Custom Tools',
    icon: HelpCircle,
    path: '/docs/custom-tools.md',
    category: 'How-to'
  }
];

export function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<typeof docs[0] | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      setLoading(true);
      fetch(selectedDoc.path)
        .then(res => res.text())
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setContent('# Error loading document');
          setLoading(false);
        });
    }
  }, [selectedDoc]);

  if (selectedDoc) {
    return (
      <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)} className="h-8 gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Docs
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-xl font-bold">{selectedDoc.title}</h1>
        </div>
        
        <Card className="flex-1 overflow-hidden border-none shadow-none bg-transparent">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto py-8 px-6 bg-card border rounded-xl shadow-sm">
              <div className="markdown-body">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 space-y-12 animate-in fade-in duration-500">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Learn how to master GitAgent and build powerful AI-driven workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {docs.map((doc) => (
          <motion.div
            key={doc.id}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card 
              className="group cursor-pointer h-full hover:border-primary transition-all shadow-sm hover:shadow-md"
              onClick={() => setSelectedDoc(doc)}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-2xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <doc.icon className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60">{doc.category}</p>
                  <h3 className="text-xl font-bold">{doc.title}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
