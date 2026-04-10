import React, { useState } from 'react';
import { useAgentWorkspace, DutyRole, ConflictMatrixEntry } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ShieldAlert, AlertCircle } from 'lucide-react';
import { GenerateImproveButton } from '../components/GenerateImproveButton';

const PERMISSIONS = ['create', 'submit', 'review', 'approve', 'audit'];

const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function DutiesStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});

  const setFieldLoading = (field: string, loading: boolean) => {
    setLoadingFields(prev => ({ ...prev, [field]: loading }));
  };

  if (state.selectedTemplate !== 'full') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Segregation of Duties is only available for the Full template.</p>
      </div>
    );
  }

  const updateDuties = (updates: Partial<typeof state.dutiesConfig>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        dutiesConfig: { ...state.dutiesConfig, ...updates }
      }
    });
  };

  const addRole = () => {
    updateDuties({
      roles: [...state.dutiesConfig.roles, { name: '', permissions: [] }]
    });
  };

  const updateRole = (index: number, updates: Partial<DutyRole>) => {
    const newRoles = [...state.dutiesConfig.roles];
    newRoles[index] = { ...newRoles[index], ...updates };
    updateDuties({ roles: newRoles });
  };

  const removeRole = (index: number) => {
    const newRoles = [...state.dutiesConfig.roles];
    newRoles.splice(index, 1);
    updateDuties({ roles: newRoles });
  };

  const togglePermission = (roleIndex: number, perm: string) => {
    const role = state.dutiesConfig.roles[roleIndex];
    const newPerms = role.permissions.includes(perm)
      ? role.permissions.filter(p => p !== perm)
      : [...role.permissions, perm];
    updateRole(roleIndex, { permissions: newPerms });
  };

  const addConflict = () => {
    updateDuties({
      conflictMatrix: [...state.dutiesConfig.conflictMatrix, { roles: ['', ''], reason: '' }]
    });
  };

  const updateConflict = (index: number, updates: Partial<ConflictMatrixEntry>) => {
    const newMatrix = [...state.dutiesConfig.conflictMatrix];
    newMatrix[index] = { ...newMatrix[index], ...updates };
    updateDuties({ conflictMatrix: newMatrix });
  };

  const removeConflict = (index: number) => {
    const newMatrix = [...state.dutiesConfig.conflictMatrix];
    newMatrix.splice(index, 1);
    updateDuties({ conflictMatrix: newMatrix });
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Segregation of Duties</h2>
          <p className="text-muted-foreground">Define roles and constraints to prevent conflicts of interest.</p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sod-purpose">Policy Purpose</Label>
              <GenerateImproveButton 
                fieldValue={state.dutiesConfig.purpose}
                fileType="duties-md"
                workspace={state}
                onLoadingChange={(loading) => setFieldLoading('purpose', loading)}
                onResult={(val) => updateDuties({ purpose: val })}
              />
            </div>
            <Textarea 
              id="sod-purpose"
              placeholder="Define the SOD policy for financial transactions..."
              value={state.dutiesConfig.purpose}
              disabled={loadingFields['purpose']}
              onChange={e => updateDuties({ purpose: e.target.value })}
              className="h-20"
            />
            <p className="text-xs text-muted-foreground">Maximum 2 sentences recommended.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Role Definitions</h3>
          <Button size="sm" variant="outline" onClick={addRole}>
            <Plus className="mr-2 h-4 w-4" /> Add Role
          </Button>
        </div>

        <div className="grid gap-4">
          {state.dutiesConfig.roles.map((role, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor={`role-name-${i}`}>Role Name (kebab-case)</Label>
                    <Input 
                      id={`role-name-${i}`}
                      placeholder="compliance-officer"
                      value={role.name}
                      onChange={e => updateRole(i, { name: e.target.value })}
                      onBlur={() => updateRole(i, { name: toKebabCase(role.name) })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="mt-8" onClick={() => removeRole(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="flex flex-wrap gap-4">
                    {PERMISSIONS.map(perm => (
                      <div key={perm} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`role-${i}-perm-${perm}`} 
                          checked={role.permissions.includes(perm)}
                          onCheckedChange={() => togglePermission(i, perm)}
                        />
                        <label htmlFor={`role-${i}-perm-${perm}`} className="text-sm font-medium leading-none capitalize">
                          {perm}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold">Conflict Matrix</h3>
          </div>
          <Button size="sm" variant="outline" onClick={addConflict}>
            <Plus className="mr-2 h-4 w-4" /> Add Conflict
          </Button>
        </div>

        <div className="grid gap-4">
          {state.dutiesConfig.conflictMatrix.map((conflict, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Role A</Label>
                    <Select 
                      value={conflict.roles[0]} 
                      onValueChange={v => updateConflict(i, { roles: [v, conflict.roles[1]] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.dutiesConfig.roles.map(r => (
                          <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Role B</Label>
                    <Select 
                      value={conflict.roles[1]} 
                      onValueChange={v => updateConflict(i, { roles: [conflict.roles[0], v] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.dutiesConfig.roles.map(r => (
                          <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {conflict.roles[0] && conflict.roles[1] && conflict.roles[0] === conflict.roles[1] && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Role A and Role B must be different.
                  </p>
                )}
                <div className="grid gap-2">
                  <Label>Conflict Reason</Label>
                  <Input 
                    placeholder="Cannot review own submissions..."
                    value={conflict.reason}
                    onChange={e => updateConflict(i, { reason: e.target.value })}
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeConflict(i)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Remove Conflict
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Handoff Procedures</h3>
          <GenerateImproveButton 
            fieldValue={state.dutiesConfig.handoffProcedures}
            fileType="duties-md"
            workspace={state}
            onLoadingChange={(loading) => setFieldLoading('handoffProcedures', loading)}
            onResult={(val) => updateDuties({ handoffProcedures: val })}
          />
        </div>
        <Textarea 
          placeholder="1. Submitter creates draft&#10;2. Submitter notifies Reviewer&#10;3. Reviewer approves or rejects..."
          value={state.dutiesConfig.handoffProcedures}
          disabled={loadingFields['handoffProcedures']}
          onChange={e => updateDuties({ handoffProcedures: e.target.value })}
          className="min-h-[150px]"
        />
      </section>
    </div>
  );
}
