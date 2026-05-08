import * as React from 'react';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AgentProvider, useAgentWorkspace } from '../app/context/AgentContext';
import { SettingsProvider, useSettings } from '../app/context/SettingsContext';
import { SkillWorkbenchProvider } from '../app/context/SkillWorkbenchContext';
import { WizardShell } from '../app/wizard/WizardShell';
import { GenerationDashboard } from '../app/generation/GenerationDashboard';
import { FileEditor } from '../app/editor/FileEditor';
import { ExportView } from '../app/export/ExportView';
import { ImportView } from '../app/import/ImportView';
import { SkillWorkbench } from '../app/workbench/skills/SkillWorkbench';
import { WorkflowWorkbench } from '../app/workbench/WorkflowWorkbench';
import { KnowledgeWorkbench } from '../app/workbench/KnowledgeWorkbench';
import { ChatWorkbench } from '../app/workbench/ChatWorkbench';
import { AgentWorkbench } from '../app/workbench/AgentWorkbench';
import { Dashboard } from '../app/workbench/Dashboard';
import { PromptWorkbench } from '../app/workbench/PromptWorkbench';
import { VersionControl } from '../app/workbench/VersionControl';
import { GitIntegration } from '../app/workbench/GitIntegration';
import { SettingsView } from '../app/settings/SettingsView';
import { Button } from '../components/ui/button';
import { Settings, Github, Package, X, Download, BookOpen, Workflow, Database, MessageSquare } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { SettingsPanel } from '../app/components/SettingsPanel';
import { cn } from '../lib/utils';

export default function App() {
  return (
    <SettingsProvider>
      <AgentProvider>
        <SkillWorkbenchProvider>
          <BrowserRouter>
             <AppContent />
          </BrowserRouter>
        </SkillWorkbenchProvider>
      </AgentProvider>
    </SettingsProvider>
  );
}

function AppContent() {
  const { settings } = useSettings();

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-300">
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workbench/agent" element={<AgentWorkbench />} />
          <Route path="/workbench/prompts" element={<PromptWorkbench />} />
          <Route path="/wizard" element={<Navigate to="/workbench/agent?tab=architect" replace />} />
          <Route path="/generating" element={<GenerationDashboard />} />
          <Route path="/editor" element={<FileEditor />} />
          <Route path="/export" element={<ExportView />} />
          <Route path="/import" element={<ImportView />} />
          <Route path="/workbench/skills" element={<SkillWorkbench />} />
          <Route path="/workbench/workflows" element={<WorkflowWorkbench />} />
          <Route path="/workbench/knowledge" element={<KnowledgeWorkbench />} />
          <Route path="/workbench/chat" element={<ChatWorkbench />} />
          <Route path="/workbench/history" element={<VersionControl />} />
          <Route path="/workbench/git" element={<GitIntegration />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </AppLayout>
    </div>
  );
}


