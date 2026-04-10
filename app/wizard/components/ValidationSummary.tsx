import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ValidationSummaryProps {
  errors: Record<string, string>;
}

export function ValidationSummary({ errors }: ValidationSummaryProps) {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return null;

  const getFriendlyName = (path: string) => {
    if (path.startsWith('manifest.')) {
      const field = path.split('.')[1];
      return field.charAt(0).toUpperCase() + field.slice(1);
    }
    if (path.startsWith('skillsList.')) {
      const parts = path.split('.');
      const index = parseInt(parts[1]) + 1;
      const field = parts[2];
      return `Skill ${index} ${field.charAt(0).toUpperCase() + field.slice(1)}`;
    }
    if (path === 'core-identity') return 'Core Identity';
    if (path.includes('complianceConfig')) return 'Compliance Settings';
    return path;
  };

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
        <AlertCircle className="h-4 w-4" />
        <span>Validation Errors</span>
      </div>
      <ul className="text-xs text-destructive/80 space-y-1 ml-6 list-disc">
        {errorKeys.map((key) => (
          <li key={key}>
            <span className="font-medium text-destructive">{getFriendlyName(key)}</span>: {errors[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}
