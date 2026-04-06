import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export function ComplianceStep() {
  const { state, dispatch } = useAgentWorkspace();

  const updateCompliance = (field: string, value: any) => {
    dispatch({ 
      type: 'UPDATE_MANIFEST', 
      payload: { 
        compliance: { 
          ...(state.manifest.compliance || { risk_tier: 'low' }),
          [field]: value 
        } 
      } 
    });
  };

  const updateSupervision = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_MANIFEST',
      payload: {
        compliance: {
          ...(state.manifest.compliance || { risk_tier: 'low' }),
          supervision: {
            ...(state.manifest.compliance?.supervision || { human_in_the_loop: 'none' }),
            [field]: value
          }
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Compliance & Risk</h2>
        <p className="text-muted-foreground">Configure safety and supervision parameters.</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Risk Tier</Label>
          <Select 
            value={state.manifest.compliance?.risk_tier || 'low'} 
            onValueChange={v => updateCompliance('risk_tier', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Human in the Loop</Label>
          <Select 
            value={state.manifest.compliance?.supervision?.human_in_the_loop || 'none'} 
            onValueChange={v => updateSupervision('human_in_the_loop', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always</SelectItem>
              <SelectItem value="conditional">Conditional</SelectItem>
              <SelectItem value="advisory">Advisory</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="recordkeeping">Recordkeeping</Label>
          <Switch 
            id="recordkeeping"
            checked={state.manifest.compliance?.supervision?.recordkeeping || false}
            onCheckedChange={v => updateSupervision('recordkeeping', v)}
          />
        </div>
      </div>
    </div>
  );
}
