import React, { useRef } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Image as ImageIcon, Music, Video, File } from 'lucide-react';

export function ContextStep() {
  const { state, dispatch } = useAgentWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        reader.onload = (e) => {
          dispatch({
            type: 'ADD_SCAFFOLD_CONTEXT',
            payload: {
              name: file.name,
              type: file.type,
              dataUrl: e.target?.result as string
            }
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          dispatch({
            type: 'ADD_SCAFFOLD_CONTEXT',
            payload: {
              name: file.name,
              type: file.type,
              content: e.target?.result as string
            }
          });
        };
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (name: string) => {
    dispatch({ type: 'REMOVE_SCAFFOLD_CONTEXT', payload: name });
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.includes('pdf') || type.includes('word') || type.includes('text')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Context Upload</h2>
        <p className="text-muted-foreground">Upload documents, images, audio, or video to help scaffold your agent's identity and capabilities.</p>
      </div>

      <div 
        className="border-2 border-dashed rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/30"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg">Click to upload context files</h3>
        <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, TXT, Images, Audio, and Video</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          onChange={handleFileUpload}
        />
      </div>

      {state.scaffoldContext.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {state.scaffoldContext.map((file) => (
            <Card key={file.name} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                    {getIcon(file.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{file.type.split('/')[1]}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFile(file.name)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex gap-3">
        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-primary/80 leading-relaxed">
          The uploaded context will be analyzed during the generation phase to automatically populate your agent's Soul, Rules, and Duties.
        </p>
      </div>
    </div>
  );
}
