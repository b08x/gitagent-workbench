import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, Search, Database, Code, Sparkles } from 'lucide-react';
import { ParsedSkill, AgentFramework } from '../../../lib/gitagent/types';
import { useAgentWorkspace } from '../../context/AgentContext';
import { inferFrameworkTools } from '../../../lib/gitagent/contextToolInference';
import { AGENT_FRAMEWORK_OPTIONS } from '../../../lib/gitagent/constants';

interface BlueprintsGalleryProps {
  onSelectBlueprint: (blueprint: Partial<ParsedSkill>) => void;
}

const BLUEPRINTS: Array<{
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  instructions: string;
  tags: string[];
}> = [
  {
    id: 'github-reviewer',
    name: 'GitHub PR Reviewer',
    category: 'code',
    icon: Code,
    description: 'Inspects code diffs, enforces linting conventions, and leaves line-by-line review comments.',
    tags: ['git', 'code-review'],
    instructions: `# GitHub PR Reviewer Skill\n\n## Objective\nAnalyze pull request code changes for architecture soundness, test coverage, and security hazards.\n\n## Review Criteria\n1. Verify TypeScript types are strictly typed without 'any'.\n2. Check for race conditions in async operations.\n3. Validate unit test assertions.`
  },
  {
    id: 'artifact-removal',
    name: 'Artifact Removal & Sanitizer',
    category: 'code',
    icon: Shield,
    description: 'Detect and delete copy/paste artifacts such as "$1" and similar strings across code and documentation.',
    tags: ['cleanup', 'refactor', 'sanitization'],
    instructions: `# Artifact Removal Skill\n\n## Objective\nSearch for and remove copy/paste artifacts and erroneous escaped template variables across repository files.\n\n## Workflow\n1. Scan workspace files for artifacts like \\$1, \\$2, or placeholder garbage.\n2. Apply atomic patches to clean them up.\n3. Verify syntax integrity after deletion.`
  },
  {
    id: 'web-scraper',
    name: 'Structured Web Scraper',
    category: 'research',
    icon: Search,
    description: 'Extracts tabular and article data from online documentation and web sources into clean structured schemas.',
    tags: ['scraping', 'docs', 'research'],
    instructions: `# Structured Web Scraper\n\n## Instructions\nFetch web page contents using web extract tools, remove noisy navigation elements, and compile structured summary notes.`
  },
  {
    id: 'sql-query-analyzer',
    name: 'SQL Query & Schema Optimizer',
    category: 'code',
    icon: Database,
    description: 'Analyzes SQL query execution plans (EXPLAIN ANALYZE) and recommends optimal index strategies.',
    tags: ['sql', 'database', 'performance'],
    instructions: `# SQL Query Optimizer\n\n## Instructions\nParse query execution plans, identify sequential scans on large tables, and recommend composite or clustered indexes.`
  }
];

export function BlueprintsGallery({ onSelectBlueprint }: BlueprintsGalleryProps) {
  const { state: agentState } = useAgentWorkspace();
  const framework: AgentFramework = (agentState.targetFramework as AgentFramework) || 'hermes_agent';
  const frameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === framework) || AGENT_FRAMEWORK_OPTIONS[0];

  const handleSelect = (bp: typeof BLUEPRINTS[0]) => {
    const inferred = inferFrameworkTools({
      name: bp.name,
      description: bp.description,
      category: bp.category,
      instructions: bp.instructions,
      targetFramework: framework
    });

    onSelectBlueprint({
      name: bp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      description: bp.description,
      instructions: bp.instructions,
      allowedTools: inferred.tools,
      metadata: {
        category: bp.category,
        tags: bp.tags
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Skill Blueprints Library</h2>
          <p className="text-xs text-muted-foreground">
            Pre-configured agent capabilities with automatic tool inference for <span className="font-semibold text-primary">{frameworkMeta.label}</span>
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          Harness: {frameworkMeta.shortLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BLUEPRINTS.map((bp) => {
          const Icon = bp.icon;
          const inferred = inferFrameworkTools({
            name: bp.name,
            description: bp.description,
            category: bp.category,
            instructions: bp.instructions,
            targetFramework: framework
          });

          return (
            <Card key={bp.id} className="border-border/80 bg-card rounded-sm shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">{bp.name}</CardTitle>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{bp.category}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase text-primary border-primary/30">
                    {inferred.tools.length} Tools ({frameworkMeta.shortLabel})
                  </Badge>
                </div>
                <CardDescription className="text-xs pt-2 text-muted-foreground leading-relaxed">
                  {bp.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {inferred.tools.map(t => (
                    <Badge key={t} variant="secondary" className="text-[9px] font-mono px-1 py-0">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex gap-1">
                    {bp.tags.map(t => (
                      <span key={t} className="text-[9px] text-muted-foreground/80 font-mono">#{t}</span>
                    ))}
                  </div>
                  <Button 
                    size="xs" 
                    onClick={() => handleSelect(bp)} 
                    className="h-7 text-xs gap-1 shadow-xs"
                  >
                    <Plus className="size-3" /> Use Blueprint
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
