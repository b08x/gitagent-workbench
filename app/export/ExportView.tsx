import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { serializeWorkspace, downloadZip } from '../../lib/gitagent/serializer';
import { assembleCLAUDEmd } from '../../lib/gitagent/assembleCLAUDEmd';
import { exportGeminiZip } from '../../lib/gitagent/exportGemini';
import { exportToHermesPython } from '../../lib/gitagent/adapters/hermes-python';
import { auditToolMappings } from '../../lib/gitagent/toolVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  CheckCircle, 
  Terminal, 
  Copy, 
  Check, 
  ArrowLeft, 
  Wand2, 
  AlertTriangle, 
  Info, 
  Package, 
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExportView() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState<string | null>(null);
  const [pythonExport, setPythonExport] = React.useState<{ source: string; filename: string } | null>(null);
  const [showFullPython, setShowFullPython] = React.useState(false);
  const [showAllToolClaims, setShowAllToolClaims] = React.useState(false);

  // Pre-flight audit of tool claims vs verified runtime access
  const toolAudit = useMemo(() => auditToolMappings(state), [state]);
  const globalSkillsCount = (state.skillsList || []).filter(s => s.scope !== 'task_scoped').length;
  const taskSkillsCount = (state.skillsList || []).filter(s => s.scope === 'task_scoped').length;

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

        {/* Pre-Flight Tool Mapping & Verification Audit Panel */}
        <div className="border border-border bg-card p-4 space-y-3 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                "p-1 border",
                toolAudit.unmappedCount === 0 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
              )}>
                {toolAudit.unmappedCount === 0 ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
                  Harness Tool Mapping & Access Audit ({toolAudit.frameworkLabel})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Verifying declared tool claims against executable capabilities in target runtime
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <Badge variant="green" className="text-[10px]">
                {toolAudit.verifiedCount} Verified Access
              </Badge>
              {toolAudit.unmappedCount > 0 ? (
                <Badge variant="amber" className="text-[10px]">
                  {toolAudit.unmappedCount} Unmapped Claims
                </Badge>
              ) : (
                <Badge variant="green" className="text-[10px]">
                  0 Unmapped
                </Badge>
              )}
            </div>
          </div>

          {/* Unavailable Tool Mappings Alert */}
          {toolAudit.unmappedCount > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs rounded-none space-y-1 font-sans">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Pre-Flight Notice: Unavailable Tool Mappings Detected</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                {toolAudit.warningNotice}
              </p>
            </div>
          )}

          {/* Claims vs Verified Access Breakdown Table */}
          {toolAudit.claims.length > 0 && (
            <div className="border border-border bg-background p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border pb-1.5">
                <span>Declared Tool Claims ({toolAudit.claims.length})</span>
                <button
                  type="button"
                  onClick={() => setShowAllToolClaims(!showAllToolClaims)}
                  className="text-primary hover:underline text-[10px] cursor-pointer flex items-center gap-1"
                >
                  {showAllToolClaims ? 'Show Compact' : 'Show All Details'}
                  {showAllToolClaims ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(showAllToolClaims ? toolAudit.claims : toolAudit.claims.slice(0, 4)).map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-muted/30 border border-border text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-foreground">`{item.claim}`</span>
                      <span className="text-muted-foreground text-[10px]">
                        ({item.sourceSkill || 'skill'}) • scope: <strong className="text-foreground">{item.scope || 'global'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'verified' ? (
                        <span className="flex items-center gap-1 text-[#1f6a38] text-[10px] font-bold">
                          <Check className="size-3 text-[#1f6a38]" /> VERIFIED ACCESS {item.mappedHarnessTool !== item.claim ? `→ ${item.mappedHarnessTool}` : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#b45309] text-[10px] font-bold">
                          <AlertTriangle className="size-3 text-[#b45309]" /> UNMAPPED CLAIM
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Explicit Model Roles & Skill Scopes Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border bg-card rounded-none p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sliders className="size-3.5 text-primary" /> Explicit Model Roles
              </span>
              <Badge variant="outline" className="text-[9px] border-border">
                Settings
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-muted/30 border border-border">
                <span className="text-muted-foreground">BUILDER MODEL:</span>
                <strong className="text-foreground truncate max-w-[170px]" title={settings.taskModels.architect?.modelId}>
                  {settings.taskModels.architect?.modelId || 'gemini-3.7-flash'}
                </strong>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/30 border border-border">
                <span className="text-muted-foreground">EXPORT TARGET MODEL:</span>
                <strong className="text-foreground truncate max-w-[170px]" title={state.modelConfig?.preferred}>
                  {state.modelConfig?.preferred || 'claude-sonnet-4-5'}
                </strong>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/30 border border-border">
                <span className="text-muted-foreground">TEST RUNNER MODEL:</span>
                <strong className="text-foreground truncate max-w-[170px]" title={settings.taskModels.chatTests?.modelId}>
                  {settings.taskModels.chatTests?.modelId || 'gemini-3.8-flash'}
                </strong>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card rounded-none p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Explicit Skill Scopes
              </span>
              <Badge variant="outline" className="text-[9px] border-border">
                {(state.skillsList || []).length} Total Skills
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/30 border border-border">
                <div className="text-muted-foreground text-[10px]">GLOBAL MANIFEST</div>
                <div className="text-base font-bold text-foreground">{globalSkillsCount}</div>
                <div className="text-[10px] text-muted-foreground">Active in all turns</div>
              </div>
              <div className="p-2 bg-muted/30 border border-border">
                <div className="text-muted-foreground text-[10px]">TASK-SCOPED</div>
                <div className="text-base font-bold text-foreground">{taskSkillsCount}</div>
                <div className="text-[10px] text-muted-foreground">Trigger-dependent</div>
              </div>
              <div className="p-2 bg-muted/30 border border-border">
                <div className="text-muted-foreground text-[10px]">MAX CONTEXT</div>
                <div className="text-base font-bold text-foreground">{state.manifest.memory?.max_tokens || 8192}</div>
                <div className="text-[10px] text-muted-foreground">tokens limit</div>
              </div>
              <div className="p-2 bg-muted/30 border border-border">
                <div className="text-muted-foreground text-[10px]">RISK TIER</div>
                <div className="text-base font-bold text-foreground">{state.manifest.compliance?.risk_tier || 'standard'}</div>
                <div className="text-[10px] text-muted-foreground">governance level</div>
              </div>
            </div>
          </Card>
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
