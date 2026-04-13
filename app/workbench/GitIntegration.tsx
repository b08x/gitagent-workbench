import React, { useState } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Github, Terminal, Copy, Check, ExternalLink, Download } from 'lucide-react';

export function GitIntegration() {
  const { state } = useAgentWorkspace();
  const [copied, setCopied] = useState<string | null>(null);

  const repoName = state.manifest.name?.toLowerCase().replace(/\s+/g, '-') || 'my-gitagent';
  const cloneCommand = `git clone https://github.com/gitagent-org/template.git ${repoName} && cd ${repoName}`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Git Integration</h2>
        <p className="text-muted-foreground">Clone your agent to your local environment or push to a remote repository.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Local Setup
            </CardTitle>
            <CardDescription>Run these commands to initialize your agent locally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative group">
              <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto pr-12">
                {cloneCommand}
              </pre>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopy(cloneCommand, 'clone')}
              >
                {copied === 'clone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              * This clones the official GitAgent template and prepares the directory.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Sync
            </CardTitle>
            <CardDescription>Connect your workspace to a GitHub repository.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-md border">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">Not Connected</p>
                  <p className="text-[10px] text-muted-foreground">Authorize GitHub to enable direct push.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-2">
                Connect <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            <Button className="w-full gap-2" disabled>
              <Github className="h-4 w-4" /> Create Repository
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Manual Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="flex-1 gap-2">
            <Download className="h-4 w-4" /> Download ZIP
          </Button>
          <Button variant="outline" className="flex-1 gap-2">
            <Copy className="h-4 w-4" /> Copy Manifest (YAML)
          </Button>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
        <Terminal className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-800">Pro Tip: CLI Integration</p>
          <p className="text-[10px] text-blue-700 leading-relaxed">
            You can also use the <code className="bg-blue-100 px-1 rounded">gitagent-cli</code> to pull this workspace directly: 
            <code className="ml-1 bg-blue-100 px-1 rounded">gitagent pull {state.manifest.name?.toLowerCase() || 'agent'}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
