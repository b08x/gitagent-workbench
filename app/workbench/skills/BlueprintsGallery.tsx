import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Zap, Shield, Search, Terminal, Database, Code, Check } from 'lucide-react';
import { ParsedSkill } from '../../../lib/gitagent/types';

interface BlueprintsGalleryProps {
  onSelectBlueprint: (blueprint: Partial<ParsedSkill>) => void;
}

const BLUEPRINTS: Array<{
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  allowedTools: string[];
  instructions: string;
  tags: string[];
}> = [
  {
    id: 'github-reviewer',
    name: 'GitHub PR Reviewer',
    category: 'development',
    icon: Code,
    description: 'Inspects code diffs, enforces linting conventions, and leaves line-by-line review comments.',
    allowedTools: ['git_diff', 'fetch_pr', 'post_review_comment'],
    tags: ['git', 'code-review'],
    instructions: `# GitHub PR Reviewer Skill\n\n## Objective\nAnalyze pull request code changes for architecture soundness, test coverage, and security hazards.\n\n## Review Criteria\n1. Verify TypeScript types are strictly typed without 'any'.\n2. Check for race conditions in async operations.\n3. Validate unit test assertions.`
  },
  {
    id: 'data-sanitizer',
    name: 'PII & Data Sanitizer',
    category: 'security',
    icon: Shield,
    description: 'Scans text buffers and log outputs for credentials, API tokens, emails, and sensitive user data.',
    allowedTools: ['regex_match', 'mask_buffer'],
    tags: ['security', 'compliance'],
    instructions: `# PII & Data Sanitizer Skill\n\n## Core Rules\n- MUST ALWAYS replace social security numbers and phone numbers with [REDACTED].\n- MUST NEVER permit plaintext API keys (sk-..., ghp-...) to leak in console outputs.`
  },
  {
    id: 'web-scraper',
    name: 'Structured Web Scraper',
    category: 'data',
    icon: Search,
    description: 'Extracts tabular and article data from URLs into clean JSON schemas.',
    allowedTools: ['fetch_url', 'parse_html', 'json_transform'],
    tags: ['scraping', 'etl'],
    instructions: `# Structured Web Scraper\n\n## Instructions\nFetch web page contents using \`fetch_url\`, remove noisy navigation elements, and extract core text into standard markdown schema.`
  },
  {
    id: 'postgres-query-analyzer',
    name: 'SQL Query Optimizer',
    category: 'database',
    icon: Database,
    description: 'Analyzes SQL query execution plans (EXPLAIN ANALYZE) and recommends optimal index strategies.',
    allowedTools: ['explain_query', 'suggest_indexes'],
    tags: ['sql', 'postgres', 'performance'],
    instructions: `# SQL Query Optimizer\n\n## Instructions\nParse query execution plans, identify sequential scans on large tables, and recommend Composite B-Tree or GIN indexes.`
  }
];

export function BlueprintsGallery({ onSelectBlueprint }: BlueprintsGalleryProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Skill Blueprints Library</h2>
        <p className="text-xs text-muted-foreground">Pre-configured agent capabilities with verified tool whitelists and execution rules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BLUEPRINTS.map((bp) => {
          const Icon = bp.icon;
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
                    {bp.allowedTools.length} Tools
                  </Badge>
                </div>
                <CardDescription className="text-xs pt-2 text-muted-foreground leading-relaxed">
                  {bp.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {bp.allowedTools.map(t => (
                    <Badge key={t} variant="secondary" className="text-[9px] font-mono px-1 py-0">
                      {t}
                    </Badge>
                  ))}
                </div>

                <Button 
                  size="sm" 
                  onClick={() => onSelectBlueprint({
                    name: bp.name,
                    description: bp.description,
                    instructions: bp.instructions,
                    allowedTools: bp.allowedTools,
                    category: bp.category,
                    metadata: { version: '1.0.0', category: bp.category },
                    tags: bp.tags
                  })}
                  className="w-full h-8 bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs rounded-sm shadow-xs gap-1.5"
                >
                  <Plus className="size-3.5" /> Use Blueprint
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
