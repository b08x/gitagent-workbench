import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AgentProvider } from '../app/context/AgentContext';
import { SettingsProvider, useSettings } from '../app/context/SettingsContext';
import { WizardShell } from '../app/wizard/WizardShell';
import { GenerationDashboard } from '../app/generation/GenerationDashboard';
import { FileEditor } from '../app/editor/FileEditor';
import { ExportView } from '../app/export/ExportView';
import { Button } from '../components/ui/button';
import { Settings, Github, Package, X } from 'lucide-react';
import { SettingsPanel } from '../app/components/SettingsPanel';

function Header() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container h-full mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Package className="h-6 w-6 text-primary" />
          <span>GitAgent <span className="text-primary">Workbench</span></span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Button>
        </div>
      </div>

      {showSettings && (
        <>
          <div 
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40" 
            onClick={() => setShowSettings(false)} 
          />
          <div className="absolute top-16 right-4 w-80 bg-card border rounded-xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold">Settings</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SettingsPanel />
          </div>
        </>
      )}
    </header>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AgentProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground font-sans antialiased">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Navigate to="/wizard" replace />} />
                <Route path="/wizard" element={<WizardShell />} />
                <Route path="/generating" element={<GenerationDashboard />} />
                <Route path="/editor" element={<FileEditor />} />
                <Route path="/export" element={<ExportView />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AgentProvider>
    </SettingsProvider>
  );
}
