import React, { useEffect } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, RotateCcw, Info, Rocket } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TOOL_GROUPS = [
  {
    name: 'Core',
    tools: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search']
  },
  {
    name: 'Execution',
    tools: ['terminal', 'process', 'execute_code', 'patch']
  },
  {
    name: 'Browser',
    tools: ['browser_navigate', 'browser_snapshot', 'browser_vision']
  },
  {
    name: 'Media',
    tools: ['vision_analyze', 'image_generate', 'text_to_speech']
  },
  {
    name: 'Orchestration',
    tools: ['todo', 'clarify', 'delegate_task', 'cronjob', 'send_message']
  }
];

const ALL_TOOLS = TOOL_GROUPS.flatMap(g => g.tools);

const DEFAULTS: Record<string, string[]> = {
  cli: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'terminal', 'process', 'execute_code', 'patch', 'todo', 'clarify'],
  telegram: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'browser_navigate', 'browser_snapshot', 'browser_vision', 'vision_analyze', 'image_generate', 'text_to_speech', 'send_message'],
  discord: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'browser_navigate', 'browser_snapshot', 'browser_vision', 'vision_analyze', 'image_generate', 'text_to_speech', 'send_message'],
  slack: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'send_message'],
  api: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'todo'],
  background: ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'terminal', 'process', 'execute_code', 'patch', 'browser_navigate', 'browser_snapshot', 'browser_vision', 'todo', 'clarify', 'delegate_task', 'cronjob', 'send_message'],
  'sub-agent': ['web_search', 'web_extract', 'read_file', 'memory', 'session_search', 'execute_code']
};

export function DeploymentStep() {
  const { state, dispatch } = useAgentWorkspace();
  const { deploymentTargets = ['cli'], subAgents = {}, toolPermissions, skillsList = [] } = state;
  const matrix = toolPermissions.matrix;

  const hasSubAgents = Object.keys(subAgents).length > 0;
  const activeColumns = [...deploymentTargets, ...(hasSubAgents ? ['sub-agent'] : [])];

  // Auto-populate defaults for newly added targets
  useEffect(() => {
    let changed = false;
    const newMatrix = { ...matrix };

    activeColumns.forEach(col => {
      if (!newMatrix[ALL_TOOLS[0]]?.[col] && newMatrix[ALL_TOOLS[0]]?.[col] !== false) {
        // Column doesn't exist, populate it
        changed = true;
        ALL_TOOLS.forEach(tool => {
          if (!newMatrix[tool]) newMatrix[tool] = {};
          newMatrix[tool][col] = DEFAULTS[col]?.includes(tool) || false;
        });
      }
    });

    if (changed) {
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          toolPermissions: { matrix: newMatrix }
        }
      });
    }
  }, [activeColumns, matrix, dispatch]);

  const togglePermission = (tool: string, column: string) => {
    const newMatrix = { ...matrix };
    if (!newMatrix[tool]) newMatrix[tool] = {};
    newMatrix[tool][column] = !newMatrix[tool][column];
    
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        toolPermissions: { matrix: newMatrix }
      }
    });
  };

  const resetColumn = (column: string) => {
    const newMatrix = { ...matrix };
    ALL_TOOLS.forEach(tool => {
      if (!newMatrix[tool]) newMatrix[tool] = {};
      newMatrix[tool][column] = DEFAULTS[column]?.includes(tool) || false;
    });

    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        toolPermissions: { matrix: newMatrix }
      }
    });
  };

  const resetAll = () => {
    const newMatrix = { ...matrix };
    activeColumns.forEach(col => {
      ALL_TOOLS.forEach(tool => {
        if (!newMatrix[tool]) newMatrix[tool] = {};
        newMatrix[tool][col] = DEFAULTS[col]?.includes(tool) || false;
      });
    });

    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        toolPermissions: { matrix: newMatrix }
      }
    });
  };

  const toggleDeploymentTarget = (target: any) => {
    const current = state.deploymentTargets || ['cli'];
    const next = current.includes(target)
      ? current.filter(t => t !== target)
      : [...current, target];
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { deploymentTargets: next } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { deployment_targets: next } });
  };

  const DEPLOYMENT_OPTIONS = [
    { id: 'cli', label: 'CLI', description: 'Terminal only, no gateway' },
    { id: 'telegram', label: 'Telegram', description: 'Gateway.telegram stub included' },
    { id: 'discord', label: 'Discord', description: 'Gateway.discord stub included' },
    { id: 'slack', label: 'Slack', description: 'Gateway.slack stub included' },
    { id: 'api', label: 'API/Embedded', description: 'Disables terminal toolset; sets skip_context_files hint', tooltip: 'Disables terminal toolset; sets skip_context_files hint' },
    { id: 'background', label: 'Background/Scheduled', description: 'Enables cronjob toolset and delegation toolset', tooltip: 'Enables cronjob toolset and delegation toolset' },
    { id: 'homeassistant', label: 'Home Assistant', description: 'Enables homeassistant toolset' },
  ];

  // Check for skill warnings
  const skillWarnings = skillsList.flatMap(skill => {
    const skillTools = (skill.allowedTools || '').split(' ').filter(Boolean);
    return skillTools.flatMap(tool => {
      const isEnabledAnywhere = activeColumns.some(col => matrix[tool]?.[col] === true);
      if (!isEnabledAnywhere && ALL_TOOLS.includes(tool)) {
        return [{ skillName: skill.name, tool }];
      }
      return [];
    });
  });

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Deployment Targets</h2>
        </div>
        <p className="text-muted-foreground">Select where your agent will be deployed to pre-configure the Hermes environment.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TooltipProvider>
            {DEPLOYMENT_OPTIONS.map((opt) => (
              <div key={opt.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id={`target-${opt.id}`} 
                  checked={(state.deploymentTargets || ['cli']).includes(opt.id as any)}
                  onCheckedChange={() => toggleDeploymentTarget(opt.id)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`target-${opt.id}`}
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {opt.label}
                    </label>
                    {opt.tooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">{opt.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>
      </section>

      <Separator className="my-8" />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tool Permissions</h2>
        <p className="text-muted-foreground">
          Control which tools are available in each deployment context.
          Sub-agents only receive tools explicitly granted in their column.
        </p>
      </div>

      {skillWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Skill Configuration Warning</AlertTitle>
          <AlertDescription className="space-y-1">
            {skillWarnings.map((w, i) => (
              <p key={i}>
                Skill '{w.skillName}' declares tool '{w.tool}' but it is not enabled in any deployment context.
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={resetAll}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset All to Defaults
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px] font-bold">Tool / Context</TableHead>
                {activeColumns.map(col => (
                  <TableHead key={col} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <span className="capitalize font-bold">{col}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                        onClick={() => resetColumn(col)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> Reset
                      </Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TOOL_GROUPS.map(group => (
                <React.Fragment key={group.name}>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={activeColumns.length + 1} className="py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      {group.name}
                    </TableCell>
                  </TableRow>
                  {group.tools.map(tool => (
                    <TableRow key={tool} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="font-medium text-sm py-3">
                        {tool}
                      </TableCell>
                      {activeColumns.map(col => (
                        <TableCell key={col} className="text-center py-3">
                          <Checkbox 
                            checked={matrix[tool]?.[col] || false}
                            onCheckedChange={() => togglePermission(tool, col)}
                            aria-label={`Enable ${tool} for ${col}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Inheritance:</strong> Sub-agents inherit the parent's constraints but are further restricted by the "Sub-agent" column.
          </p>
          <p>
            <strong className="text-foreground">Security:</strong> Disabling tools in a context prevents the agent from even seeing those tools in its toolset, reducing the attack surface.
          </p>
        </div>
      </div>
    </div>
  );
}
