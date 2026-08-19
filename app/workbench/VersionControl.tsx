import React, { useState } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { History, Save, RotateCcw, Trash2, Clock, Check, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function VersionControl() {
  const { state, dispatch } = useAgentWorkspace();
  const [label, setLabel] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!label.trim()) return;
    dispatch({ type: 'SAVE_SNAPSHOT', payload: label });
    setLabel('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRestore = (timestamp: number) => {
    if (confirm('Are you sure you want to restore this version? Current unsaved changes will be lost.')) {
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: timestamp });
    }
  };

  const handleDelete = (timestamp: number) => {
    dispatch({ type: 'DELETE_SNAPSHOT', payload: timestamp });
  };

  const snapshots = state.history?.snapshots || [];

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-6 md:p-8 space-y-6 select-text">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm">
            <History className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Version Control & Snapshots</h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase text-primary border-primary/30">
                {snapshots.length} Snapshots
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Capture point-in-time states of your agent repository and roll back on demand</p>
          </div>
        </div>
      </div>

      {/* Create Snapshot Card */}
      <Card className="border-border/80 bg-card rounded-sm shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Save className="size-3 text-primary" /> Capture Point-in-Time Snapshot
          </CardTitle>
          <CardDescription className="text-xs">
            Saves all current prompts, skills, workflows, and settings into workspace history.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex gap-2">
            <Input 
              placeholder="e.g., v1.1 - Added data cleaning workflow & guardrails" 
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="h-8.5 text-xs font-sans rounded-sm bg-background border-border/80"
            />
            <Button 
              onClick={handleSave} 
              disabled={!label.trim()} 
              className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs shrink-0"
            >
              {saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
              {saved ? 'Saved!' : 'Save Snapshot'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot History Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3 text-primary" /> Repository History Log
          </span>
        </div>
        
        <div className="grid gap-2.5">
          {snapshots.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-sm bg-card/40">
              <Clock className="size-8 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground italic">No manual snapshots recorded yet. Click "Save Snapshot" above to create one.</p>
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div 
                key={snapshot.timestamp} 
                className="p-3.5 bg-card border border-border/80 hover:border-primary/50 rounded-sm shadow-xs flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-sm bg-muted/60 flex items-center justify-center text-primary shrink-0">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-foreground truncate">{snapshot.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {formatDistanceToNow(snapshot.timestamp)} ago • {new Date(snapshot.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    size="xs" 
                    className="text-[10px] font-mono gap-1"
                    onClick={() => handleRestore(snapshot.timestamp)}
                  >
                    <RotateCcw className="size-3" /> Revert
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon-xs" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(snapshot.timestamp)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
