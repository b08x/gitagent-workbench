import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { parseCLAUDEmd } from '../../lib/gitagent/parseCLAUDEmd';
import { parseGeminiSettings } from '../../lib/gitagent/parseGeminiSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileUp, Clipboard, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

type MergeStrategy = 'overwrite' | 'keep' | 'merge';

export function ImportView() {
  const { state, dispatch } = useAgentWorkspace();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseCLAUDEmd> | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [strategies, setStrategies] = useState<Record<string, MergeStrategy>>({});
  const [importSuccess, setImportSuccess] = useState(false);

  // Gemini specific state
  const [geminiMd, setGeminiMd] = useState('');
  const [geminiSettings, setGeminiSettings] = useState('');

  const handleParse = () => {
    if (!content.trim()) return;
    const result = parseCLAUDEmd(content);
    setParsed(result);
    
    // Default selections
    const initialSelected: Record<string, boolean> = {};
    const initialStrategies: Record<string, MergeStrategy> = {};
    
    if (result.partial.manifest) initialSelected.manifest = true;
    if (result.partial.soul) initialSelected.soul = true;
    if (result.partial.rules) initialSelected.rules = true;
    if (Object.keys(result.partial.skills || {}).length > 0) initialSelected.skills = true;
    if (Object.keys(result.partial.tools || {}).length > 0) initialSelected.tools = true;
    if (result.partial.memoryBootstrap) initialSelected.memory = true;

    Object.keys(initialSelected).forEach(key => {
      initialStrategies[key] = 'overwrite';
    });

    setSelectedFields(initialSelected);
    setStrategies(initialStrategies);
    setImportSuccess(false);
  };

  const handleGeminiParse = () => {
    if (!geminiMd.trim()) return;
    
    const mdResult = parseCLAUDEmd(geminiMd);
    const settingsResult = parseGeminiSettings(geminiSettings);
    
    const combinedPartial = { ...mdResult.partial };
    const combinedWarnings = [...mdResult.warnings, ...settingsResult.warnings];

    if (settingsResult.modelPreferred || settingsResult.tools || settingsResult.humanInTheLoop) {
      combinedPartial.manifest = {
        ...combinedPartial.manifest,
        name: combinedPartial.manifest?.name || 'agent',
        version: combinedPartial.manifest?.version || '0.1.0',
        description: combinedPartial.manifest?.description || '',
        model: settingsResult.modelPreferred ? { preferred: settingsResult.modelPreferred } : combinedPartial.manifest?.model,
        tools: settingsResult.tools || combinedPartial.manifest?.tools,
        compliance: settingsResult.humanInTheLoop ? {
          ...combinedPartial.manifest?.compliance,
          risk_tier: combinedPartial.manifest?.compliance?.risk_tier || 'low',
          supervision: { human_in_the_loop: settingsResult.humanInTheLoop }
        } : combinedPartial.manifest?.compliance
      };
    }

    setParsed({ partial: combinedPartial, warnings: combinedWarnings });

    // Default selections
    const initialSelected: Record<string, boolean> = {};
    const initialStrategies: Record<string, MergeStrategy> = {};
    
    if (combinedPartial.manifest) initialSelected.manifest = true;
    if (combinedPartial.soul) initialSelected.soul = true;
    if (combinedPartial.rules) initialSelected.rules = true;
    if (Object.keys(combinedPartial.skills || {}).length > 0) initialSelected.skills = true;
    if (Object.keys(combinedPartial.tools || {}).length > 0) initialSelected.tools = true;
    if (combinedPartial.memoryBootstrap) initialSelected.memory = true;

    Object.keys(initialSelected).forEach(key => {
      initialStrategies[key] = 'overwrite';
    });

    setSelectedFields(initialSelected);
    setStrategies(initialStrategies);
    setImportSuccess(false);
  };

  const handleImport = () => {
    if (!parsed) return;

    const { partial } = parsed;
    let newWorkspace = { ...state };

    const applyField = (key: string, value: any) => {
      if (!selectedFields[key]) return;
      
      const strategy = strategies[key];
      const existing = (newWorkspace as any)[key];

      if (strategy === 'keep' && existing) return;
      
      if (strategy === 'merge' && existing && typeof existing === 'string' && typeof value === 'string') {
        (newWorkspace as any)[key] = existing + '\n\n---\n\n' + value;
      } else if (strategy === 'merge' && existing && typeof existing === 'object' && typeof value === 'object') {
        (newWorkspace as any)[key] = { ...existing, ...value };
      } else {
        (newWorkspace as any)[key] = value;
      }
    };

    if (selectedFields.manifest && partial.manifest) {
      const strategy = strategies.manifest;
      if (strategy === 'merge' && state.manifest) {
        newWorkspace.manifest = { ...state.manifest, ...partial.manifest };
      } else if (strategy === 'overwrite' || !state.manifest) {
        newWorkspace.manifest = { ...state.manifest, ...partial.manifest };
      }
    }

    applyField('soul', partial.soul);
    applyField('rules', partial.rules);
    applyField('skills', partial.skills);
    applyField('tools', partial.tools);
    applyField('memoryBootstrap', partial.memoryBootstrap);

    dispatch({ type: 'SET_WORKSPACE', payload: newWorkspace });
    setImportSuccess(true);
    setTimeout(() => navigate('/editor'), 1500);
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Import Workspace</h1>
        <p className="text-muted-foreground mt-2">
          Bootstrap your agent from existing documentation or other platforms.
        </p>
      </div>

      <Tabs defaultValue="claude" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="claude">Claude Code</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
        </TabsList>

        <TabsContent value="claude" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from CLAUDE.md</CardTitle>
              <CardDescription>
                Paste the content of your CLAUDE.md file below to parse and import its sections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="# agent-name\n\n## Soul\n..."
                  className="min-h-[300px] font-mono text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setContent('')}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={handleParse}>
                    Parse Content
                  </Button>
                </div>
              </div>

              {parsed && (
                <div className="space-y-6 pt-6 border-t animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Detected Sections</h3>
                    <div className="flex gap-2">
                      {parsed.warnings.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Warning
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {parsed.warnings.length > 0 && (
                    <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Parsing Notes</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-xs">
                          {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4">
                    {Object.keys(selectedFields).map((field) => (
                      <div key={field} className="flex flex-col gap-3 p-4 border rounded-lg bg-accent/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id={`select-${field}`} 
                              checked={selectedFields[field]}
                              onCheckedChange={(checked) => setSelectedFields(prev => ({ ...prev, [field]: !!checked }))}
                            />
                            <Label htmlFor={`select-${field}`} className="font-bold capitalize">{field}</Label>
                          </div>
                          <Badge variant="secondary">
                            {field === 'skills' ? Object.keys(parsed.partial.skills || {}).length : 
                             field === 'tools' ? Object.keys(parsed.partial.tools || {}).length : 1} items
                          </Badge>
                        </div>

                        {selectedFields[field] && (
                          <RadioGroup 
                            value={strategies[field]} 
                            onValueChange={(val) => setStrategies(prev => ({ ...prev, [field]: val as MergeStrategy }))}
                            className="flex gap-4 ml-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="overwrite" id={`${field}-overwrite`} />
                              <Label htmlFor={`${field}-overwrite`} className="text-xs">Overwrite</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="keep" id={`${field}-keep`} />
                              <Label htmlFor={`${field}-keep`} className="text-xs">Keep Existing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="merge" id={`${field}-merge`} />
                              <Label htmlFor={`${field}-merge`} className="text-xs">Merge</Label>
                            </div>
                          </RadioGroup>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      size="lg" 
                      onClick={handleImport}
                      disabled={importSuccess || !Object.values(selectedFields).some(v => v)}
                      className={importSuccess ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {importSuccess ? (
                        <><CheckCircle2 className="mr-2 h-5 w-5" /> Imported Successfully</>
                      ) : (
                        <><ArrowRight className="mr-2 h-5 w-5" /> Import into Workspace</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gemini">
          <Card>
            <CardHeader>
              <CardTitle>Gemini Import</CardTitle>
              <CardDescription>
                Import from GEMINI.md and optionally .gemini/settings.json.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="gemini-md" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gemini-md">GEMINI.md</TabsTrigger>
                  <TabsTrigger value="settings-json">settings.json (optional)</TabsTrigger>
                </TabsList>
                <TabsContent value="gemini-md" className="mt-4">
                  <Textarea
                    placeholder="# agent-name\n\n## Soul\n..."
                    className="min-h-[250px] font-mono text-sm"
                    value={geminiMd}
                    onChange={(e) => setGeminiMd(e.target.value)}
                  />
                </TabsContent>
                <TabsContent value="settings-json" className="mt-4">
                  <Textarea
                    placeholder='{\n  "model": { "id": "gemini-2.0-flash-exp" },\n  "allowedTools": ["bash", "edit"]\n}'
                    className="min-h-[250px] font-mono text-sm"
                    value={geminiSettings}
                    onChange={(e) => setGeminiSettings(e.target.value)}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setGeminiMd(''); setGeminiSettings(''); }}>
                  Clear
                </Button>
                <Button size="sm" onClick={handleGeminiParse}>
                  Parse Gemini Project
                </Button>
              </div>

              {parsed && (
                <div className="space-y-6 pt-6 border-t animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Detected Sections</h3>
                    <div className="flex gap-2">
                      {parsed.warnings.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Warning
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {parsed.warnings.length > 0 && (
                    <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Parsing Notes</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-xs">
                          {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4">
                    {Object.keys(selectedFields).map((field) => (
                      <div key={field} className="flex flex-col gap-3 p-4 border rounded-lg bg-accent/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id={`gemini-select-${field}`} 
                              checked={selectedFields[field]}
                              onCheckedChange={(checked) => setSelectedFields(prev => ({ ...prev, [field]: !!checked }))}
                            />
                            <Label htmlFor={`gemini-select-${field}`} className="font-bold capitalize">{field}</Label>
                          </div>
                          <Badge variant="secondary">
                            {field === 'skills' ? Object.keys(parsed.partial.skills || {}).length : 
                             field === 'tools' ? Object.keys(parsed.partial.tools || {}).length : 1} items
                          </Badge>
                        </div>

                        {selectedFields[field] && (
                          <RadioGroup 
                            value={strategies[field]} 
                            onValueChange={(val) => setStrategies(prev => ({ ...prev, [field]: val as MergeStrategy }))}
                            className="flex gap-4 ml-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="overwrite" id={`gemini-${field}-overwrite`} />
                              <Label htmlFor={`gemini-${field}-overwrite`} className="text-xs">Overwrite</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="keep" id={`gemini-${field}-keep`} />
                              <Label htmlFor={`gemini-${field}-keep`} className="text-xs">Keep Existing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="merge" id={`gemini-${field}-merge`} />
                              <Label htmlFor={`gemini-${field}-merge`} className="text-xs">Merge</Label>
                            </div>
                          </RadioGroup>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      size="lg" 
                      onClick={handleImport}
                      disabled={importSuccess || !Object.values(selectedFields).some(v => v)}
                      className={importSuccess ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {importSuccess ? (
                        <><CheckCircle2 className="mr-2 h-5 w-5" /> Imported Successfully</>
                      ) : (
                        <><ArrowRight className="mr-2 h-5 w-5" /> Import into Workspace</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
