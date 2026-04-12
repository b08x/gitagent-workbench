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
import { Download, CheckCircle, Terminal, Copy, Check, ArrowLeft, Wand2, AlertTriangle, Info } from 'lucide-react';
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

      <Tabs defaultValue="zip" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="zip">ZIP Package</TabsTrigger>
          <TabsTrigger value="claude">Claude Code</TabsTrigger>
          <TabsTrigger value="gemini">Gemini CLI</TabsTrigger>
          <TabsTrigger value="python">Hermes Python</TabsTrigger>
        </TabsList>

        <TabsContent value="zip" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="claude">
          <Card>
            <CardHeader>
              <CardTitle>Claude Code Export</CardTitle>
              <CardDescription>
                Download a single CLAUDE.md file optimized for Claude Code and Cursor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This format uses progressive disclosure to keep the main file token-efficient while providing full instructions for each skill.
              </p>
              <Button onClick={handleExportClaude} className="w-full">
                <Download className="mr-2 h-4 w-4" /> Download CLAUDE.md
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gemini">
          <Card>
            <CardHeader>
              <CardTitle>Gemini CLI Export</CardTitle>
              <CardDescription>
                Download a ZIP containing GEMINI.md and .gemini/settings.json.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Compatible with the Google Gemini CLI. Includes model preferences and tool permissions.
              </p>
              <Button onClick={handleExportGemini} className="w-full">
                <Download className="mr-2 h-4 w-4" /> Download Gemini ZIP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="python" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Python Library Export</CardTitle>
              <CardDescription>
                Instantiate this agent via the Hermes Python library.
                Ideal for FastAPI, Discord bots, CI pipelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!state.soul && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Incomplete Agent</AlertTitle>
                  <AlertDescription>
                    SOUL.md not generated yet — run generation first for a complete export.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Installation</Label>
                <div className="bg-muted p-3 rounded-md font-mono text-xs flex items-center justify-between group">
                  <code>pip install git+https://github.com/NousResearch/hermes-agent.git</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard('pip install git+https://github.com/NousResearch/hermes-agent.git', 'pip')}
                  >
                    {copied === 'pip' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleGeneratePython} className="flex-1">
                  <Wand2 className="mr-2 h-4 w-4" /> Generate Python Bootstrap
                </Button>
                {pythonExport && (
                  <Button variant="outline" onClick={handleDownloadPython} className="flex-1">
                    <Download className="mr-2 h-4 w-4" /> Download {pythonExport.filename}
                  </Button>
                )}
              </div>

              {pythonExport && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Code Preview</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowFullPython(!showFullPython)}>
                      {showFullPython ? 'Show Less' : 'Show Full File'}
                    </Button>
                  </div>
                  <div className={cn(
                    "bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto relative",
                    !showFullPython && "max-h-[400px] overflow-hidden"
                  )}>
                    <pre><code>{pythonExport.source}</code></pre>
                    {!showFullPython && (
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
                    )}
                  </div>
                </div>
              )}

              <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  The <code>ephemeral_system_prompt</code> contains your full SOUL.md.
                  It is not saved to trajectory files, keeping training data clean.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
