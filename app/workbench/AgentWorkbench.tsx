import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Database,
  Layers,
  Sparkles,
  Save,
  RotateCcw,
  Download,
  Share2,
  GitBranch,
  Play,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  FileCode,
  Terminal,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IdentityStep } from '../wizard/steps/IdentityStep';
import { CapabilitiesStep } from '../wizard/steps/CapabilitiesStep';
import { ModelStep } from '../wizard/steps/ModelStep';
import { KnowledgeWorkbench } from './KnowledgeWorkbench';
import { AgentFlowDiagram } from './components/AgentFlowDiagram';
import { AgentLivePreview } from './components/AgentLivePreview';
import { AgentArchitectPromptBar } from './components/AgentArchitectPromptBar';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

export function AgentWorkbench() {
  const navigate = useNavigate();
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  
  const [activeTab, setActiveTab] = useState('identity');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSnapshot = () => {
    dispatch({ type: 'SAVE_SNAPSHOT', payload: 'Manual Snapshot' });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset this agent to default template?")) {
      dispatch({ type: 'SET_TEMPLATE', payload: 'standard' });
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground select-none">
      {/* 1. Global Workbench Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-border/60 bg-card/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/20 shadow-sm">
            <Cpu className="h-4 w-4" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-foreground">
                {state.manifest.name || "untitled-agent"}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                v{state.manifest.version || "1.0.0"}
              </Badge>
              {isSaved && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium animate-fade-in">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[280px] sm:max-w-md">
              {state.manifest.description || "Configure identity, tools, model, and orchestration flow."}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSaveSnapshot}
            className="h-8 text-xs gap-1.5 bg-background/80 hover:bg-muted/80 border-border/70"
          >
            <Save className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Save Progress</span>
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate('/workbench/chat')}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Launch Lab</span>
          </Button>

          <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            title={isRightPanelOpen ? "Collapse Inspector" : "Expand Inspector"}
          >
            {isRightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* 2. Main Resizable Work Area (Center Builder + Right Inspector) */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* CENTER PANEL: Main Configuration & Design Workspace */}
          <ResizablePanel defaultSize={isRightPanelOpen ? 62 : 100} minSize={40} className="flex flex-col h-full bg-background overflow-hidden">
            {/* AI Architect Quick Prompt Bar */}
            <AgentArchitectPromptBar />

            {/* Step Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 border-b border-border/50 bg-muted/15 shrink-0">
                <TabsList className="bg-transparent h-11 p-0 gap-6 justify-start">
                  <TabsTrigger 
                    value="identity"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 text-xs font-semibold tracking-wide transition-all gap-1.5 text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Identity & Soul
                  </TabsTrigger>

                  <TabsTrigger 
                    value="capabilities"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 text-xs font-semibold tracking-wide transition-all gap-1.5 text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" /> Tools & Capabilities
                  </TabsTrigger>

                  <TabsTrigger 
                    value="runtime"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 text-xs font-semibold tracking-wide transition-all gap-1.5 text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <Cpu className="h-3.5 w-3.5 text-purple-400" /> Model & Runtime
                  </TabsTrigger>

                  <TabsTrigger 
                    value="graph"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 text-xs font-semibold tracking-wide transition-all gap-1.5 text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <Layers className="h-3.5 w-3.5 text-emerald-400" /> Workflow Graph
                  </TabsTrigger>

                  <TabsTrigger 
                    value="knowledge"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 text-xs font-semibold tracking-wide transition-all gap-1.5 text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <Database className="h-3.5 w-3.5 text-cyan-400" /> Knowledge & Context
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-hidden min-h-0 bg-background/50">
                <TabsContent value="identity" className="h-full m-0 p-0 focus-visible:outline-none">
                  <ScrollArea className="h-full">
                    <div className="p-6 max-w-4xl mx-auto space-y-6">
                      <IdentityStep />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="capabilities" className="h-full m-0 p-0 focus-visible:outline-none">
                  <ScrollArea className="h-full">
                    <div className="p-6 max-w-4xl mx-auto space-y-6">
                      <CapabilitiesStep />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="runtime" className="h-full m-0 p-0 focus-visible:outline-none">
                  <ScrollArea className="h-full">
                    <div className="p-6 max-w-4xl mx-auto space-y-6">
                      <ModelStep />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="graph" className="h-full m-0 p-4 focus-visible:outline-none overflow-hidden">
                  <AgentFlowDiagram />
                </TabsContent>

                <TabsContent value="knowledge" className="h-full m-0 p-0 focus-visible:outline-none">
                  <ScrollArea className="h-full">
                    <div className="p-6 max-w-4xl mx-auto space-y-6">
                      <KnowledgeWorkbench />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>

          {/* RIGHT PANEL: Live Inspector & Verification */}
          {isRightPanelOpen && (
            <>
              <ResizableHandle withHandle className="bg-border/60 hover:bg-primary transition-colors" />
              <ResizablePanel defaultSize={38} minSize={25} maxSize={60} className="h-full min-h-0">
                <AgentLivePreview onToggleCollapse={() => setIsRightPanelOpen(false)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
