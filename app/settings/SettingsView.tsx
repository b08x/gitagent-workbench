import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsPanel } from '../components/SettingsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, X } from 'lucide-react';

export function SettingsView() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-12 right-4 h-10 w-10 rounded-full hover:bg-muted"
        onClick={() => navigate(-1)}
      >
        <X className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences and API keys.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsPanel />
        </CardContent>
      </Card>
    </div>
  );
}
