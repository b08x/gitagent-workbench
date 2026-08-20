import React, { useState } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Github, Terminal, Copy, Check, ExternalLink, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GitIntegration() {
  const { state } = useAgentWorkspace();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const repoName = state.manifest.name?.toLowerCase().replace(/\s+/g, '-') || 'my-gitagent';
  const cloneCommand = `git clone https://github.com/gitagent-org/template.git ${repoName} && cd ${repoName}`;
  const pushCommand = `git remote add origin git@github.com:my-org/${repoName}.git\ngit branch -M main\ngit push -u origin main`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-6 md:p-8 space-y-6 select-text">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm">
            <GitBranch className="size-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Git Repository Sync</h1>
            <p className="text-xs text-muted-foreground">Clone your agent repository or connect to remote GitHub / GitLab remotes</p>
          </div>
        </div>

        <Button 
          size="sm" 
          onClick={() => navigate('/export')}
          className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs"
        >
          <Download className="size-3.5" /> Download ZIP Package
        </Button>
      </div>

      {/* Grid of instructions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border/80 rounded-sm shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Terminal className="size-3.5 text-primary" />
              Local Development Setup
            </CardTitle>
            <CardDescription className="text-xs">Run these commands in terminal to initialize this agent locally.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="relative group bg-muted/50 border border-border/60 rounded-sm p-3">
              <pre className="text-xs font-mono overflow-x-auto pr-10 text-foreground">
                {cloneCommand}
              </pre>
              <Button 
                variant="ghost" 
                size="icon-xs" 
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(cloneCommand, 'clone')}
              >
                {copied === 'clone' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              * Clones the official GitAgent runtime structure and targets the directory.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 rounded-sm shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Github className="size-3.5 text-primary" />
              Remote Git Sync
            </CardTitle>
            <CardDescription className="text-xs">Publish your agent to an upstream git remote.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="relative group bg-muted/50 border border-border/60 rounded-sm p-3">
              <pre className="text-xs font-mono overflow-x-auto pr-10 text-foreground whitespace-pre-wrap">
                {pushCommand}
              </pre>
              <Button 
                variant="ghost" 
                size="icon-xs" 
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(pushCommand, 'push')}
              >
                {copied === 'push' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              * Creates the main branch and pushes the full schema to your repository.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
