import React from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Trash2, FileImage, FileCode, FileQuestion } from 'lucide-react';

interface AssetsManagerProps {
  skill: SkillDefinition;
}

export function AssetsManager({ skill }: AssetsManagerProps) {
  const { updateSkill } = useSkillWorkbench();
  const assets = skill.assets || [];

  const removeAsset = (filename: string) => {
    updateSkill(skill.id, { assets: assets.filter(a => a.filename !== filename) });
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4 text-purple-500" />;
    if (type.startsWith('text/')) return <FileCode className="h-4 w-4 text-blue-500" />;
    return <FileQuestion className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Assets
        </CardTitle>
        <CardDescription>Visual assets, icons, and non-script resources.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {assets.map(asset => (
            <div key={asset.filename} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-3">
                {getIcon(asset.type)}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{asset.filename}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{asset.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {(asset.content.length * 0.75 / 1024).toFixed(1)} KB
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeAsset(asset.filename)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {assets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm italic border-2 border-dashed rounded-xl">
              No assets imported.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
