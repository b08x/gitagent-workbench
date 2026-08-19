import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsPanel } from '../components/SettingsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, X, ArrowLeft } from 'lucide-react';

export function SettingsView() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-6 md:p-8 select-text">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm">
              <Settings className="size-4.5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Workspace Preferences</h1>
              <p className="text-xs text-muted-foreground">Manage appearance, model endpoints, and MCP integrations</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-1.5 size-3.5" /> Back
          </Button>
        </div>

        <Card className="border-border/80 bg-card rounded-sm shadow-xs">
          <CardContent className="p-6">
            <SettingsPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
