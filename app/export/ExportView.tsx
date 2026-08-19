import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { serializeWorkspace, downloadZip } from '../../lib/gitagent/serializer';
import { assembleCLAUDEmd } from '../../lib/gitagent/assembleCLAUDEmd';
import { exportGeminiZip } from '../../lib/gitagent/exportGemini';
import { exportToHermesPython } from '../../lib/gitagent/adapters/hermes-python';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, Terminal, Copy, Check, ArrowLeft, Wand2, AlertTriangle, Info, Package, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExportView() {
  const { state, dispatch } = useAgentWorkspace();
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState<string | null>(null);
  const [pythonExport, setPythonExport] = React.useState<{ source: string; filename: string } | null>(null);
  const [showFullPython, setShowFullPython] = React.useState(false);

  const handleDownload = async () => {
    const blob = await serializeWorkspace(state);
    const filename = `${state.manifest.name || 'agent'}-v${state.manifest.version || '1.0.0'}.zip`;
    downloadZip(blob, filename);
    dispatch({ type: 'UPDATE_META', payload: { lastDownloadedAt: new Date() } });
  };

  const handleExportClaude = () => {
    const content = assembleCLAUDEmd(state);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CLAUDE.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGemini = async () => {
    const blob = await exportGeminiZip(state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.manifest.name || 'agent'}-gemini-export.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePython = () => {
    const result = exportToHermesPython(state);
    setPythonExport(result);
  };

  const handleDownloadPython = () => {
    if (!pythonExport) return;
    const blob = new Blob([pythonExport.source], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pythonExport.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    count += Object.keys(state.skills || {}).length;
    count += Object.keys(state.tools || {}).length;
    count += Object.keys(state.workflows || {}).length;
    if (state.knowledge) count++;
    if (state.memory) count++;
    if (state.examples?.goodOutputs) count++;
    if (state.examples?.badOutputs) count++;
    if (state.config?.default) count++;
    if (state.config?.production) count++;
    return count;
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-6 md:p-8 select-text">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm">
              <Package className="size-4.5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Export & Target Adapters</h2>
              <p className="text-xs text-muted-foreground">Synthesize your agent into standalone packages or tool adapters</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/editor')} className="text-xs">
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to Editor
          </Button>
        </div>

        <Tabs defaultValue="zip" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="zip" className="text-xs font-mono">ZIP Package</TabsTrigger>
            <TabsTrigger value="claude" className="text-xs font-mono">Claude Code</TabsTrigger>
            <TabsTrigger value="gemini" className="text-xs font-mono">Gemini CLI</TabsTrigger>
            <TabsTrigger value="python" className="text-xs font-mono">Hermes Python</TabsTrigger>
          </TabsList>

          <TabsContent value="zip" className="space-y-4">
            <Card className="border-border/80 bg-card rounded-sm shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <CheckCircle className="size-4 text-emerald-500" />
                  Specification Compliant (v1.0.0)
                </CardTitle>
                <CardDescription className="text-xs">
                  All workspace files synthesized into a GitAgent compliant bundle.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <div className="p-3 bg-muted/40 rounded-sm border border-border/60 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">ZIP PACKAGE:</span>
                    <span className="font-mono font-bold text-foreground">
                      {state.manifest.name || 'agent'}-v{state.manifest.version || '1.0.0'}.zip
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">TOTAL FILES:</span>
                    <span className="font-mono font-bold text-primary">{calculateFileCount()} files</span>
                  </div>
                </div>

                <Button 
                  className="w-full h-10 bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs rounded-sm shadow-xs" 
                  onClick={handleDownload}
                >
                  <Download className="mr-2 size-4" /> Download Complete ZIP Bundle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claude" className="space-y-4">
            <Card className="border-border/80 bg-card rounded-sm shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold">Export for Claude Code (CLAUDE.md)</CardTitle>
                <CardDescription className="text-xs">
                  Flattens your soul, rules, duties, and skills into a standardized CLAUDE.md memory file.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <Button 
                  onClick={handleExportClaude} 
                  className="w-full h-10 bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs rounded-sm shadow-xs"
                >
                  <Download className="mr-2 size-4" /> Download CLAUDE.md
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gemini" className="space-y-4">
            <Card className="border-border/80 bg-card rounded-sm shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold">Export for Gemini CLI</CardTitle>
                <CardDescription className="text-xs">
                  Converts agent instructions into GEMINI.md and bundle configuration.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <Button 
                  onClick={handleExportGemini} 
                  className="w-full h-10 bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs rounded-sm shadow-xs"
                >
                  <Download className="mr-2 size-4" /> Download Gemini CLI Bundle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="python" className="space-y-4">
            <Card className="border-border/80 bg-card rounded-sm shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold">Hermes Python Adapter</CardTitle>
                <CardDescription className="text-xs">
                  Compile agent specification into runnable Python class code.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <Button 
                  onClick={handleGeneratePython} 
                  className="w-full h-10 bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs rounded-sm shadow-xs"
                >
                  <Wand2 className="mr-2 size-4" /> Generate Python Script
                </Button>

                {pythonExport && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-muted/40 border border-border/60 rounded-sm overflow-x-auto">
                      <pre className="text-xs font-mono text-foreground leading-relaxed max-h-60 overflow-y-auto">
                        {pythonExport.source}
                      </pre>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadPython}
                      className="w-full text-xs font-mono"
                    >
                      <Download className="mr-2 size-3.5" /> Download {pythonExport.filename}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
