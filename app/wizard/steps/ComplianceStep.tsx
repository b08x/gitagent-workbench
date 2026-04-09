import React from 'react';
import { useAgentWorkspace, ComplianceConfig } from '../../context/AgentContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export function ComplianceStep() {
  const { state, dispatch } = useAgentWorkspace();
  const config = state.complianceConfig;

  if (state.selectedTemplate !== 'full') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Compliance configuration is only available for the Full template.</p>
      </div>
    );
  }

  const updateConfig = (updates: Partial<ComplianceConfig>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        complianceConfig: { ...config, ...updates }
      }
    });
  };

  const handleRiskTierChange = (tier: ComplianceConfig['risk_tier']) => {
    const updates: Partial<ComplianceConfig> = { risk_tier: tier };
    
    if (tier === 'high' || tier === 'critical') {
      updates.supervision = {
        ...config.supervision,
        human_in_the_loop: 'always'
      };
      updates.recordkeeping = {
        ...config.recordkeeping,
        audit_logging: true
      };
    }
    
    updateConfig(updates);
  };

  const isHighRisk = config.risk_tier === 'high' || config.risk_tier === 'critical';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Compliance & Risk Management</h2>
        <p className="text-muted-foreground">Configure safety, supervision, and recordkeeping parameters.</p>
      </div>

      {isHighRisk && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>High Risk Tier Enforced</AlertTitle>
          <AlertDescription>
            For High and Critical risk tiers, <strong>Human in the Loop</strong> is set to <strong>Always</strong> and <strong>Audit Logging</strong> is enabled to meet safety standards.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="risk-tier">Risk Tier</Label>
              <Select value={config.risk_tier} onValueChange={handleRiskTierChange}>
                <SelectTrigger id="risk-tier">
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Supervision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="hitl">Human in the Loop</Label>
                <Select 
                  value={config.supervision.human_in_the_loop} 
                  onValueChange={v => updateConfig({ supervision: { ...config.supervision, human_in_the_loop: v as any } })}
                  disabled={isHighRisk}
                >
                  <SelectTrigger id="hitl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="kill-switch">Kill Switch</Label>
                  <p className="text-xs text-muted-foreground">Allow immediate termination of agent process.</p>
                </div>
                <Switch 
                  id="kill-switch" 
                  checked={config.supervision.kill_switch} 
                  onCheckedChange={v => updateConfig({ supervision: { ...config.supervision, kill_switch: v } })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="override">Override Capability</Label>
                  <p className="text-xs text-muted-foreground">Humans can manually override agent decisions.</p>
                </div>
                <Switch 
                  id="override" 
                  checked={config.supervision.override_capability} 
                  onCheckedChange={v => updateConfig({ supervision: { ...config.supervision, override_capability: v } })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recordkeeping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="audit-logging">Audit Logging</Label>
                  <p className="text-xs text-muted-foreground">Maintain immutable logs of all actions.</p>
                </div>
                <Switch 
                  id="audit-logging" 
                  checked={config.recordkeeping.audit_logging} 
                  onCheckedChange={v => updateConfig({ recordkeeping: { ...config.recordkeeping, audit_logging: v } })}
                  disabled={isHighRisk}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="retention">Retention Period</Label>
                <Input 
                  id="retention" 
                  value={config.recordkeeping.retention_period} 
                  onChange={e => updateConfig({ recordkeeping: { ...config.recordkeeping, retention_period: e.target.value } })}
                  placeholder="6y"
                />
              </div>

              <div className="grid gap-2">
                <Label>Log Format</Label>
                <Badge variant="outline" className="w-fit">structured_json</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Model Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="monitoring" className="text-xs">Ongoing Monitoring</Label>
                <Switch 
                  id="monitoring" 
                  checked={config.model_risk.ongoing_monitoring} 
                  onCheckedChange={v => updateConfig({ model_risk: { ...config.model_risk, ongoing_monitoring: v } })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Data Governance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="pii" className="text-xs">PII Handling</Label>
                <Select 
                  value={config.data_governance.pii_handling} 
                  onValueChange={v => updateConfig({ data_governance: { ...config.data_governance, pii_handling: v as any } })}
                >
                  <SelectTrigger id="pii" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redact">Redact</SelectItem>
                    <SelectItem value="anonymize">Anonymize</SelectItem>
                    <SelectItem value="passthrough">Passthrough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="fair" className="text-xs">Fair & Balanced</Label>
                <Switch 
                  id="fair" 
                  checked={config.communications.fair_balanced} 
                  onCheckedChange={v => updateConfig({ communications: { ...config.communications, fair_balanced: v } })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
