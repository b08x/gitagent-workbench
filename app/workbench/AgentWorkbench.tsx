import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  History, 
  GitBranch, 
  Settings as SettingsIcon, 
  Package, 
  ArrowRight,
  Zap,
  Shield,
  Search,
  Code,
  Sparkles,
  LayoutDashboard,
  Terminal,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { motion } from 'motion/react';
import { AgentWizard } from './AgentWizard';
import { PromptWorkbench } from './PromptWorkbench';
import { IdentityStep } from '../wizard/steps/IdentityStep';
import { CapabilitiesStep } from '../wizard/steps/CapabilitiesStep';
import { ModelStep } from '../wizard/steps/ModelStep';

export function AgentWorkbench() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAgentWorkspace();
  
  // Use query param for tab if present
  const query = new URLSearchParams(location.search);
  const initialTab = query.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  const stats = [
    { label: 'Skills', value: state.manifest.skills?.length || 0, icon: Zap },
    { label: 'Tools', value: state.manifest.tools?.length || 0, icon: Code },
    { label: 'Risk Tier', value: state.manifest.compliance?.risk_tier || 'N/A', icon: Shield },
  ];

  const recentActions = [
    { title: 'AI Architect', description: 'Configure via natural language', icon: Sparkles, action: () => setActiveTab('architect'), color: 'bg-blue-500' },
    { title: 'Version History', description: 'Revert to previous states', icon: History, action: () => navigate('/workbench/history'), color: 'bg-purple-500' },
    { title: 'Git Sync', description: 'Clone to local environment', icon: GitBranch, action: () => navigate('/workbench/git'), color: 'bg-orange-500' },
    { title: 'Test Lab', description: 'Chat with your agent', icon: Terminal, action: () => navigate('/workbench/chat'), color: 'bg-green-500' },
  ];

  const templates = [
    { id: 'data-analyst', name: 'Data Analyst', description: 'Expert in CSV/JSON processing and visualization.', icon: Search },
    { id: 'web-scraper', name: 'Web Scraper', description: 'Optimized for headless browsing and extraction.', icon: Code },
    { id: 'researcher', name: 'Researcher', description: 'Deep synthesis and citation-heavy outputs.', icon: Package },
  ];

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold tracking-tight"
          >
            Agent <span className="text-primary">Workbench</span>
          </motion.h1>
          <p className="text-muted-foreground">
            Manage, evolve, and govern your agent architecture.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary">
            {state.manifest.name || "Untitled Agent"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b">
          <TabsList className="bg-transparent h-auto p-0 gap-6 flex whitespace-nowrap overflow-x-auto">
            <TabsTrigger 
              value="dashboard"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all gap-2"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="architect"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all gap-2"
            >
              <Sparkles className="h-4 w-4" /> AI Architect
            </TabsTrigger>
            <TabsTrigger 
              value="identity"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> Identity
            </TabsTrigger>
            <TabsTrigger 
              value="capabilities"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all gap-2"
            >
              <Zap className="h-4 w-4" /> Capabilities
            </TabsTrigger>
            <TabsTrigger 
              value="prompts"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all gap-2"
            >
              <Terminal className="h-4 w-4" /> Prompts
            </TabsTrigger>
            <TabsTrigger 
              value="runtime"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium transition-all gap-2"
            >
              <Cpu className="h-4 w-4" /> Runtime
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-12 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <Card key={i} className="bg-card/50 backdrop-blur">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentActions.map((action, i) => (
                  <Card 
                    key={i} 
                    className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
                    onClick={action.action}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={cn("p-3 rounded-lg text-white", action.color)}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold group-hover:text-primary transition-colors">{action.title}</h4>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Development Sync</CardTitle>
                    <Badge variant="outline" className="bg-background">
                      {state.meta.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Current build status and workspace health.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Button variant="secondary" size="sm" onClick={() => navigate('/editor')}>
                      View Files
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/workbench/chat')}>
                      Open Chat Lab
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">Templates</h3>
              <div className="space-y-4">
                {templates.map((t) => (
                  <Card key={t.id} className="hover:bg-muted/50 transition-colors cursor-pointer border-dashed">
                    <CardContent className="p-4 flex gap-4">
                      <div className="bg-muted p-2 rounded-md h-fit">
                        <t.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-sm font-bold">{t.name}</h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" className="w-full border-dashed" onClick={() => setActiveTab('architect')}>
                  AI Generation Wizard
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="architect" className="animate-in slide-in-from-bottom-2 duration-300">
           <AgentWizard />
        </TabsContent>

        <TabsContent value="identity" className="animate-in slide-in-from-bottom-2 duration-300">
           <div className="bg-card border rounded-xl p-8 max-w-4xl mx-auto shadow-sm">
              <IdentityStep />
           </div>
        </TabsContent>

        <TabsContent value="capabilities" className="animate-in slide-in-from-bottom-2 duration-300">
           <div className="bg-card border rounded-xl p-8 shadow-sm">
              <CapabilitiesStep />
           </div>
        </TabsContent>

        <TabsContent value="prompts" className="animate-in slide-in-from-bottom-2 duration-300">
           <PromptWorkbench />
        </TabsContent>

        <TabsContent value="runtime" className="animate-in slide-in-from-bottom-2 duration-300">
           <div className="bg-card border rounded-xl p-8 max-w-4xl mx-auto shadow-sm">
              <ModelStep hideGeneration={true} />
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

