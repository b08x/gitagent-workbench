import React from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { serializeWorkspace, downloadZip } from '../../lib/gitagent/serializer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, CheckCircle, Terminal } from 'lucide-react';

export function ExportView() {
  const { state, dispatch } = useAgentWorkspace();

  const handleDownload = async () => {
    const blob = await serializeWorkspace(state);
    const filename = `${state.manifest.name || 'agent'}-v${state.manifest.version || '1.0.0'}.zip`;
    downloadZip(blob, filename);
    dispatch({ type: 'UPDATE_META', payload: { lastDownloadedAt: new Date() } });
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Export Agent</h2>
        <p className="text-muted-foreground">Your gitagent is ready for deployment.</p>
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
              <span className="text-muted-foreground">Files Generated:</span>
              <span className="font-medium">
                {5 + Object.keys(state.skills).length + Object.keys(state.tools).length}
              </span>
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
            <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-3">
              <div>
                <p className="text-muted-foreground mb-1"># Validate your agent</p>
                <code className="text-primary">gitagent validate .</code>
              </div>
              <div>
                <p className="text-muted-foreground mb-1"># Export as system prompt</p>
                <code className="text-primary">gitagent export --format system-prompt</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
