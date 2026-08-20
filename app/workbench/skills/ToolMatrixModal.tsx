import React, { useState } from 'react';
import { AgentFramework } from '../../../lib/gitagent/types';
import { TOOL_MATRIX, AGENT_FRAMEWORK_OPTIONS } from '../../../lib/gitagent/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Wrench, Shield, CheckCircle2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolMatrixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFramework?: AgentFramework;
}

export function ToolMatrixModal({ open, onOpenChange, defaultFramework }: ToolMatrixModalProps) {
  const [selectedFramework, setSelectedFramework] = useState<AgentFramework | 'all'>(defaultFramework || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = TOOL_MATRIX.filter(tool => {
    if (selectedFramework !== 'all' && tool.framework !== selectedFramework) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.functionDesc.toLowerCase().includes(query) ||
      tool.permissions.toLowerCase().includes(query) ||
      tool.circumstances.toLowerCase().includes(query) ||
      tool.frameworkLabel.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wrench className="h-5 w-5 text-primary" />
              Agent Framework Tool Matrix
            </DialogTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredTools.length} tools available
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Canonical tool registry mapping functions, required permissions, and usage circumstances across agent runtimes.
          </DialogDescription>

          {/* Framework filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              <Button
                type="button"
                variant={selectedFramework === 'all' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSelectedFramework('all')}
                className="h-7 text-xs"
              >
                All Frameworks ({TOOL_MATRIX.length})
              </Button>
              {AGENT_FRAMEWORK_OPTIONS.map(f => {
                const count = TOOL_MATRIX.filter(t => t.framework === f.id).length;
                const isSelected = selectedFramework === f.id;
                return (
                  <Button
                    key={f.id}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => setSelectedFramework(f.id)}
                    className="h-7 text-xs gap-1"
                  >
                    <Cpu className="h-3 w-3" />
                    {f.shortLabel}
                    <span className="opacity-70">({count})</span>
                  </Button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tools, permissions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-7 text-xs"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No tools matching your search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTools.map((tool, idx) => (
                <div
                  key={`${tool.framework}-${tool.name}-${idx}`}
                  className="p-3.5 border rounded-lg bg-card/60 hover:bg-card transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">{tool.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono">
                        {tool.frameworkLabel}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/90 leading-snug">
                    {tool.functionDesc}
                  </p>

                  <div className="pt-2 border-t space-y-1 text-[11px]">
                    <div className="flex items-start gap-1.5 text-muted-foreground">
                      <Shield className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground/80 font-medium">Permissions:</strong> {tool.permissions}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground/80 font-medium">Circumstances:</strong> {tool.circumstances}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
