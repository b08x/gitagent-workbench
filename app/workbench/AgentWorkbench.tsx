import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  GitBranch, 
  Settings as SettingsIcon, 
  Terminal,
  Sparkles,
  ShieldCheck,
  Zap,
  Cpu,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';
import { AgentWizard } from './AgentWizard';
import { IdentityStep } from '../wizard/steps/IdentityStep';
import { CapabilitiesStep } from '../wizard/steps/CapabilitiesStep';
import { ModelStep } from '../wizard/steps/ModelStep';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AgentWorkbench() {
  const navigate = useNavigate();
  const { state } = useAgentWorkspace();
  
  return (
    <div className="flex flex-col h-full -m-4 md:-m-6 overflow-hidden bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-0.5">
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold tracking-tight"
            >
              Agent <span className="text-primary text-sm font-medium px-2 py-0.5 bg-primary/10 rounded ml-1">Builder</span>
            </motion.h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Configure, optimize and deploy your AI agents.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary font-mono text-[10px]">
            {state.manifest.name || "Untitled Agent"}
          </Badge>
          <div className="flex items-center gap-1 border-l pl-3 ml-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/workbench/history')} title="History">
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/workbench/git')} title="Git Sync">
              <GitBranch className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Settings">
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={45} minSize={30} className="bg-muted/10">
          <div className="h-full p-4 overflow-hidden">
            <AgentWizard />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={55}>
          <Tabs defaultValue="identity" className="h-full flex flex-col">
            <div className="px-6 border-b bg-muted/20 shrink-0">
              <TabsList className="bg-transparent h-12 p-0 gap-8 justify-start">
                <TabsTrigger 
                  value="identity"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-semibold uppercase tracking-wider transition-all gap-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <ShieldCheck className="h-4 w-4 text-blue-500" /> Identity
                </TabsTrigger>
                <TabsTrigger 
                  value="capabilities"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-semibold uppercase tracking-wider transition-all gap-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <Zap className="h-4 w-4 text-yellow-500" /> Capabilities
                </TabsTrigger>
                <TabsTrigger 
                  value="runtime"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-semibold uppercase tracking-wider transition-all gap-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <Cpu className="h-4 w-4 text-purple-500" /> Runtime
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden @container">
              <TabsContent value="identity" className="h-full mt-0 focus-visible:outline-none">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <IdentityStep />
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="capabilities" className="h-full mt-0 focus-visible:outline-none">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <CapabilitiesStep />
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="runtime" className="h-full mt-0 focus-visible:outline-none">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <ModelStep hideGeneration={true} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

