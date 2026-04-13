import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Code
} from 'lucide-react';
import { motion } from 'motion/react';

export function AgentWorkbench() {
  const navigate = useNavigate();
  const { state } = useAgentWorkspace();

  const stats = [
    { label: 'Skills', value: state.manifest.skills?.length || 0, icon: Zap },
    { label: 'Tools', value: state.manifest.tools?.length || 0, icon: Code },
    { label: 'Risk Tier', value: state.manifest.compliance?.risk_tier || 'N/A', icon: Shield },
  ];

  const recentActions = [
    { title: 'New Agent', description: 'Start from scratch or template', icon: Plus, action: () => navigate('/wizard'), color: 'bg-blue-500' },
    { title: 'Version History', description: 'Revert to previous states', icon: History, action: () => navigate('/workbench/history'), color: 'bg-purple-500' },
    { title: 'Git Sync', description: 'Clone to local environment', icon: GitBranch, action: () => navigate('/workbench/git'), color: 'bg-orange-500' },
    { title: 'Preferences', description: 'Global app settings', icon: SettingsIcon, action: () => navigate('/settings'), color: 'bg-slate-500' },
  ];

  const templates = [
    { id: 'data-analyst', name: 'Data Analyst', description: 'Expert in CSV/JSON processing and visualization.', icon: Search },
    { id: 'web-scraper', name: 'Web Scraper', description: 'Optimized for headless browsing and extraction.', icon: Code },
    { id: 'researcher', name: 'Researcher', description: 'Deep synthesis and citation-heavy outputs.', icon: Package },
  ];

  return (
    <div className="container mx-auto py-12 px-4 space-y-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold tracking-tight lg:text-5xl"
          >
            Agent <span className="text-primary">Workbench</span>
          </motion.h1>
          <p className="text-xl text-muted-foreground">
            Orchestrate, refine, and deploy your GitAgent fleet.
          </p>
        </div>
        <Button size="lg" className="gap-2 shadow-lg" onClick={() => navigate('/wizard')}>
          <Plus className="h-5 w-5" /> Create New Agent
        </Button>
      </div>

      {/* Stats Grid */}
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
        {/* Quick Actions */}
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

          {/* Current Agent Status */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Current Workspace</CardTitle>
                <Badge variant="outline" className="bg-background">
                  {state.meta.status}
                </Badge>
              </div>
              <CardDescription>
                {state.manifest.name || 'Untitled Agent'} v{state.manifest.version || '0.1.0'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2 italic">
                "{state.manifest.description || 'No description provided yet.'}"
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={() => navigate('/editor')}>
                  Open Editor
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/workbench/chat')}>
                  Test in Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Sidebar */}
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
            <Button variant="outline" className="w-full border-dashed" onClick={() => navigate('/wizard')}>
              View All Templates
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
