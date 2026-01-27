import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCharacterTemplates, CharacterTemplate } from '@/hooks/useCharacterTemplates';

interface CharacterTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateData: CharacterTemplate['default_data']) => void;
}

export function CharacterTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate
}: CharacterTemplateSelectorProps) {
  const { templates, loading, error } = useCharacterTemplates();

  const handleTemplateClick = (template: CharacterTemplate) => {
    onSelectTemplate(template.default_data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Choose Template</DialogTitle>
          <DialogDescription className="text-xs">
            Start with a pre-filled character archetype
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No templates available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
            {templates.map(template => (
              <Card
                key={template.id}
                className={cn(
                  'cursor-pointer hover:border-primary transition-colors',
                  'hover:bg-accent/50'
                )}
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start gap-2">
                    {template.icon_emoji && (
                      <span className="text-xl shrink-0">{template.icon_emoji}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm mb-0.5">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="text-[10px] line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                      {template.category && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
