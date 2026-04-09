import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubAgentEntry } from '../../context/AgentContext';

interface Props {
  onSave: (agent: SubAgentEntry) => void;
  onCancel: () => void;
  initialData?: SubAgentEntry;
}

const PERMISSIONS = ['create', 'submit', 'review', 'approve', 'audit'];

const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function SubAgentMiniWizard({ onSave, onCancel, initialData }: Props) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [permissions, setPermissions] = useState<string[]>(initialData?.permissions || []);

  const handleSave = () => {
    onSave({ name, description, role, permissions });
  };

  const togglePermission = (perm: string) => {
    setPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleNameBlur = () => {
    setName(toKebabCase(name));
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {initialData ? 'Edit Sub-Agent' : 'New Sub-Agent'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="sub-name">Name (kebab-case)</Label>
          <Input 
            id="sub-name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="fact-checker"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub-role">Role</Label>
          <Input 
            id="sub-role" 
            value={role} 
            onChange={e => setRole(e.target.value)}
            placeholder="reviewer"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub-desc">Description</Label>
          <Textarea 
            id="sub-desc" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            placeholder="Responsible for verifying all claims against source documents."
          />
        </div>
        <div className="space-y-2">
          <Label>Permissions</Label>
          <div className="flex flex-wrap gap-4">
            {PERMISSIONS.map(perm => (
              <div key={perm} className="flex items-center space-x-2">
                <Checkbox 
                  id={`perm-${perm}`} 
                  checked={permissions.includes(perm)}
                  onCheckedChange={() => togglePermission(perm)}
                />
                <label htmlFor={`perm-${perm}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
                  {perm}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name || !role}>Save Agent</Button>
        </div>
      </CardContent>
    </Card>
  );
}
