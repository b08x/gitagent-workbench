import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Folder, ChevronRight, ChevronDown, AlertTriangle, AlertCircle, ArrowRight, MessageSquare, X, Code2, Download } from 'lucide-react';
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
      return (state.skills as any)[name]?.instructions || '';
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
      const updatedSkills = { ...(state.skills as any) };
      if (updatedSkills[name]) {
        updatedSkills[name] = { ...updatedSkills[name], instructions: content };
        dispatch({ type: 'UPDATE_WORKSPACE', payload: { skills: updatedSkills } });
      }
    }
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-row bg-background text-foreground select-text">
      {/* File Tree Sidebar */}
      <div className="w-64 shrink-0 border-r border-border/80 bg-sidebar/50 flex flex-col overflow-hidden select-none">
        <div className="h-11 px-4 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Code2 className="size-3 text-primary" /> Repository Tree
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <FileTree selectedFile={selectedFile} onSelect={setSelectedFile} />
        </div>
      </div>

      {/* Editor & Validation Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-11 border-b border-border/80 bg-card/60 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-primary" />
            <span className="text-xs font-mono font-bold text-foreground">{selectedFile}</span>
          </div>
          <div className="flex gap-2 items-center">
            {state.validationResult?.errors.some(e => e.file === selectedFile) && (
              <Badge variant="destructive" className="h-6 text-[10px] font-mono">Syntax Error</Badge>
            )}
            <Button 
              variant="ghost"
              size="xs"
              className={cn("text-xs font-mono", showChat && "bg-muted/80 text-foreground")}
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="mr-1 size-3 text-primary" />
              {showChat ? 'Hide AI Assistant' : 'AI Assistant'}
            </Button>
            <Button 
              size="xs" 
              className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs rounded-sm shadow-xs" 
              onClick={() => navigate('/export')}
            >
              <Download className="mr-1 size-3" /> Export ZIP
            </Button>
          </div>
        </div>

        <textarea
          className="flex-1 p-5 font-mono text-xs leading-relaxed resize-none focus:outline-none bg-background text-foreground selection:bg-primary/20"
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
        "flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-sm cursor-pointer transition-colors",
        selectedFile === path ? "bg-muted/90 text-foreground font-bold border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      )}
      onClick={() => onSelect(path)}
    >
      <FileText className="size-3.5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <div className="space-y-0.5">
      <FileItem path="agent.yaml" label="agent.yaml" />
      <FileItem path="SOUL.md" label="SOUL.md" />
      {state.rules && <FileItem path="RULES.md" label="RULES.md" />}
      {state.prompt_md && <FileItem path="PROMPT.md" label="PROMPT.md" />}
      {state.duties && <FileItem path="DUTIES.md" label="DUTIES.md" />}

      {Object.keys(state.skills || {}).length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono cursor-pointer hover:bg-muted/40 rounded-sm" onClick={() => toggle('skills')}>
            {expanded.skills ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
            <Folder className="size-3.5 text-warning" />
            <span className="font-semibold text-foreground">skills</span>
          </div>
          {expanded.skills && Object.keys(state.skills).map(s => (
            <div key={s} className="pl-4">
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
    <div className="h-44 border-t border-border/80 bg-muted/40 overflow-y-auto p-3 space-y-2">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Diagnostics</span>
      {errors.map((err, i) => (
        <div key={i} className="flex gap-2 text-xs font-mono text-destructive">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <span className="font-bold shrink-0">{err.file}:</span>
          <span>{err.message}</span>
        </div>
      ))}
      {warnings.map((warn, i) => (
        <div key={i} className="flex gap-2 text-xs font-mono text-warning">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span className="font-bold shrink-0">{warn.file}:</span>
          <span>{warn.message}</span>
        </div>
      ))}
    </div>
  );
}
