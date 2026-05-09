import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  History, 
  GitBranch, 
  Package, 
  ArrowRight,
  Zap,
  Shield,
  Search,
  Code,
  Sparkles,
  Terminal,
  LayoutDashboard,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard() {
  const navigate = useNavigate();
  const { state } = useAgentWorkspace();

  const stats = [
    { label: 'Skills', value: state.manifest.skills?.length || 0, icon: Zap },
    { label: 'Tools', value: state.manifest.tools?.length || 0, icon: Code },
    { label: 'Risk Tier', value: state.manifest.compliance?.risk_tier || 'N/A', icon: Shield },
  ];

  const resourceCategories = [
    { 
      title: 'Documentation', 
      description: 'Core guides and system concepts.', 
      icon: BookOpen, 
      count: '12 Guides',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      action: () => navigate('/docs')
    },
    { 
      title: 'Examples', 
      description: 'Reference implementations of common tasks.', 
      icon: Code, 
      count: '8 Archetypes',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      action: () => navigate('/docs?tab=examples')
    },
    { 
      title: 'How-to Docs', 
      description: 'Step-by-step technical instructions.', 
      icon: Terminal, 
      count: '15 Tutorials',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      action: () => navigate('/docs?tab=tutorials')
    },
  ];

  const recentActions = [
    { title: 'AI Architect', description: 'Configure via natural language', icon: Sparkles, action: () => navigate('/workbench/agent?tab=architect'), color: 'bg-blue-500' },
    { title: 'Version History', description: 'Revert to previous states', icon: History, action: () => navigate('/workbench/history'), color: 'bg-purple-500' },
    { title: 'Git Sync', description: 'Clone to local environment', icon: GitBranch, action: () => navigate('/workbench/git'), color: 'bg-orange-500' },
    { title: 'Test Lab', description: 'Chat with your agent', icon: Terminal, action: () => navigate('/workbench/chat'), color: 'bg-green-500' },
  ];

  return (
    <div className="container max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-500">
      <div className="space-y-2">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-black tracking-tight"
        >
          Workbench <span className="text-primary tracking-tighter">OS</span>
        </motion.h1>
        <p className="text-muted-foreground text-lg">
          Master your environment through documentation and rapid development tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resourceCategories.map((resource, i) => (
          <Card 
            key={i} 
            className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
            onClick={resource.action}
          >
            <CardContent className="p-0">
              <div className="p-8 space-y-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors", resource.bgColor)}>
                  <resource.icon className={cn("h-7 w-7", resource.color)} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{resource.title}</h3>
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight">
                      {resource.count}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {resource.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary font-bold text-sm pt-2">
                  Explore Components
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight">Primary Modules</h3>
            <Button variant="ghost" size="sm" className="text-muted-foreground">View all logs</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentActions.map((action, i) => (
              <Card 
                key={i} 
                className="group cursor-pointer border-muted bg-muted/5 hover:bg-background hover:border-primary/50 transition-all"
                onClick={action.action}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={cn("p-3 rounded-lg text-white", action.color)}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold group-hover:text-primary transition-colors">{action.title}</h4>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold tracking-tight">System Health</h3>
          <Card className="border-primary/20 bg-primary/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <LayoutDashboard className="h-24 w-24" />
             </div>
            <CardHeader className="relative z-10">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Agent Core</CardTitle>
                <Badge variant="outline" className="bg-background border-primary/20 text-primary">
                  {state.meta.status}
                </Badge>
              </div>
              <CardDescription>
                Sync active with local environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="grid grid-cols-3 gap-2">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-background/50 rounded-lg p-3 border border-primary/5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{stat.label}</p>
                    <p className="text-lg font-black tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/workbench/agent?tab=architect')}>
                  AI Architect Wizard
                  <Sparkles className="h-4 w-4 text-primary" />
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/editor')}>
                  Open Source Editor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
