import React, { useState } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { History, Save, RotateCcw, Trash2, Clock, Check } from 'lucide-react';
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Version Control</h2>
        <p className="text-muted-foreground">Save snapshots of your agent configuration and revert to them anytime.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">Create Snapshot</CardTitle>
          <CardDescription>Capture the current state of all files, skills, and settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g., Before adding research skill" 
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <Button onClick={handleSave} disabled={!label.trim()} className="gap-2">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Saved' : 'Save Snapshot'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Snapshot History
        </h3>
        
        <div className="grid gap-3">
          {state.history.snapshots.length === 0 ? (
            <div className="text-center py-12 border rounded-xl border-dashed bg-muted/30">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground italic">No snapshots saved yet.</p>
            </div>
          ) : (
            state.history.snapshots.map((snapshot) => (
              <Card key={snapshot.timestamp} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-full">
                      <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{snapshot.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(snapshot.timestamp)} ago • {new Date(snapshot.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1.5"
                      onClick={() => handleRestore(snapshot.timestamp)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(snapshot.timestamp)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
