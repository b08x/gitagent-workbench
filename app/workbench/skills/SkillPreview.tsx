import React from 'react';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { serializeSkill, serializeSkillZip } from '../../../lib/gitagent/serializer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, FileText, Download, FileArchive } from 'lucide-react';

interface SkillPreviewProps {
  skill: SkillDefinition;
}

export function SkillPreview({ skill }: SkillPreviewProps) {
  const content = serializeSkill(skill);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBundle = async () => {
    const blob = await serializeSkillZip(skill);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name || 'skill'}.skill`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            SKILL.md Preview
          </CardTitle>
          <CardDescription>Final assembled skill document with frontmatter.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadMd} title="Download SKILL.md Only">
            <Download className="h-4 w-4 mr-2" /> MD
          </Button>
          <Button variant="default" size="sm" onClick={handleDownloadBundle} title="Download Full .skill Bundle">
            <FileArchive className="h-4 w-4 mr-2" /> Bundle (.skill)
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <pre className="p-6 text-xs font-mono bg-muted/30 h-full overflow-auto whitespace-pre-wrap">
          {content}
        </pre>
      </CardContent>
    </Card>
  );
}
