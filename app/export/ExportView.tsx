import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { serializeWorkspace, downloadZip } from '../../lib/gitagent/serializer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, CheckCircle, Terminal, Copy, Check, ArrowLeft } from 'lucide-react';

export function ExportView() {
  const { state, dispatch } = useAgentWorkspace();
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleDownload = async () => {
    const blob = await serializeWorkspace(state);
    const filename = `${state.manifest.name || 'agent'}-v${state.manifest.version || '1.0.0'}.zip`;
    downloadZip(blob, filename);
    dispatch({ type: 'UPDATE_META', payload: { lastDownloadedAt: new Date() } });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const calculateFileCount = () => {
    let count = 2; // agent.yaml, SOUL.md
    if (state.rules) count++;
    if (state.prompt_md) count++;
    if (state.duties) count++;
    if (state.agents_md) count++;
    count += Object.keys(state.skills).length;
    count += Object.keys(state.tools).length;
    count += Object.keys(state.workflows).length;
    if (state.knowledge) count++;
    if (state.memory) count++;
    if (state.examples.goodOutputs) count++;
    if (state.examples.badOutputs) count++;
    if (state.config.default) count++;
    if (state.config.production) count++;
    return count;
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Export Agent</h2>
          <p className="text-muted-foreground">Your gitagent is ready for deployment.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/editor')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Generation Complete
            </CardTitle>
            <CardDescription>
              All files have been synthesized and validated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ZIP Filename:</span>
              <span className="font-mono font-medium">
                {state.manifest.name || 'agent'}-v{state.manifest.version || '1.0.0'}.zip
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Files Generated:</span>
              <span className="font-medium">{calculateFileCount()}</span>
            </div>
            <Button className="w-full h-12" onClick={handleDownload}>
              <Download className="mr-2 h-5 w-5" /> Download ZIP
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-4">
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-muted-foreground mb-1"># Validate your agent</p>
                  <code className="text-primary">gitagent validate .</code>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard('gitagent validate .', 'val')}
                >
                  {copied === 'val' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-muted-foreground mb-1"># Export as system prompt</p>
                  <code className="text-primary">gitagent export --format system-prompt</code>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard('gitagent export --format system-prompt', 'exp')}
                >
                  {copied === 'exp' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
