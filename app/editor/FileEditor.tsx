import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Folder, ChevronRight, ChevronDown, AlertTriangle, AlertCircle, ArrowRight, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatEditorSidebar } from './ChatEditorSidebar';

export function FileEditor() {
  const { state, dispatch } = useAgentWorkspace();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<string | null>('agent.yaml');
  const [showChat, setShowChat] = useState(false);

  const getFileContent = (path: string) => {
    if (path === 'agent.yaml') return JSON.stringify(state.manifest, null, 2);
    if (path === 'SOUL.md') return state.soul || '';
    if (path === 'RULES.md') return state.rules || '';
    if (path === 'PROMPT.md') return state.prompt_md || '';
    if (path === 'DUTIES.md') return state.duties || '';
    if (path.startsWith('skills/')) {
      const name = path.split('/')[1];
      return state.skills[name]?.instructions || '';
    }
    return '';
  };

  const updateFileContent = (content: string) => {
    if (!selectedFile) return;
    if (selectedFile === 'agent.yaml') {
      try {
        const manifest = JSON.parse(content);
        dispatch({ type: 'UPDATE_MANIFEST', payload: manifest });
      } catch (e) {}
    } else if (selectedFile === 'SOUL.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { soul: content } });
    } else if (selectedFile === 'RULES.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { rules: content } });
    } else if (selectedFile === 'PROMPT.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { prompt_md: content } });
    } else if (selectedFile === 'DUTIES.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { duties: content } });
    } else if (selectedFile.startsWith('skills/')) {
      const name = selectedFile.split('/')[1];
      const updatedSkills = { ...state.skills };
      if (updatedSkills[name]) {
        updatedSkills[name] = { ...updatedSkills[name], instructions: content };
        dispatch({ type: 'UPDATE_WORKSPACE', payload: { skills: updatedSkills } });
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden border-t">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 overflow-y-auto">
        <div className="p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Files</div>
        <FileTree selectedFile={selectedFile} onSelect={setSelectedFile} />
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-10 border-b bg-background flex items-center px-4 justify-between">
          <span className="text-sm font-mono text-muted-foreground">{selectedFile}</span>
          <div className="flex gap-2 items-center">
            {state.validationResult?.errors.some(e => e.file === selectedFile) && (
              <Badge variant="destructive" className="h-6">Error</Badge>
            )}
            <Button 
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-xs", showChat && "bg-accent")}
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              {showChat ? 'Hide Assistant' : 'AI Assistant'}
            </Button>
            <Button 
              size="sm" 
              className="h-7 px-2 text-xs" 
              onClick={() => navigate('/export')}
            >
              Continue to Export <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
        <textarea
          className="flex-1 p-6 font-mono text-sm resize-none focus:outline-none bg-background"
          value={selectedFile ? getFileContent(selectedFile) : ''}
          onChange={e => updateFileContent(e.target.value)}
          spellCheck={false}
        />
        
        {/* Validation Panel */}
        <ValidationPanel />
      </div>

      {/* AI Chat Sidebar */}
      {showChat && <ChatEditorSidebar />}
    </div>
  );
}

function FileTree({ selectedFile, onSelect }: { selectedFile: string | null, onSelect: (f: string) => void }) {
  const { state } = useAgentWorkspace();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ skills: true, tools: true });

  const toggle = (dir: string) => setExpanded(prev => ({ ...prev, [dir]: !prev[dir] }));

  const FileItem = ({ path, label }: { path: string, label: string }) => (
    <div 
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors",
        selectedFile === path ? "bg-accent text-accent-foreground border-r-2 border-primary" : "text-muted-foreground"
      )}
      onClick={() => onSelect(path)}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <div className="py-2">
      <FileItem path="agent.yaml" label="agent.yaml" />
      <FileItem path="SOUL.md" label="SOUL.md" />
      {state.rules && <FileItem path="RULES.md" label="RULES.md" />}
      {state.prompt_md && <FileItem path="PROMPT.md" label="PROMPT.md" />}
      {state.duties && <FileItem path="DUTIES.md" label="DUTIES.md" />}

      {Object.keys(state.skills).length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-accent" onClick={() => toggle('skills')}>
            {expanded.skills ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Folder className="h-4 w-4" />
            <span>skills</span>
          </div>
          {expanded.skills && Object.keys(state.skills).map(s => (
            <div key={s} className="pl-6">
              <FileItem path={`skills/${s}`} label={`${s}/SKILL.md`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationPanel() {
  const { state } = useAgentWorkspace();
  if (!state.validationResult) return null;

  const { errors, warnings } = state.validationResult;
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="h-48 border-t bg-muted/50 overflow-y-auto">
      <div className="p-4 space-y-2">
        {errors.map((err, i) => (
          <div key={i} className="flex gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold shrink-0">{err.file}:</span>
            <span>{err.message}</span>
          </div>
        ))}
        {warnings.map((warn, i) => (
          <div key={i} className="flex gap-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold shrink-0">{warn.file}:</span>
            <span>{warn.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
