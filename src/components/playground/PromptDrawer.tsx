import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Star } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlaygroundPrompt } from '@/hooks/usePlaygroundPrompts';

interface PromptDrawerProps {
  prompts: PlaygroundPrompt[];
  isLoading: boolean;
  onSelect: (promptText: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export const PromptDrawer: React.FC<PromptDrawerProps> = ({
  prompts, isLoading, onSelect, onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  if (prompts.length === 0 && !isLoading) return null;

  // Collect unique tags
  const allTags = Array.from(new Set(prompts.flatMap(p => p.tags))).sort();

  const filtered = activeTag
    ? prompts.filter(p => p.tags.includes(activeTag))
    : prompts;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 text-muted-foreground gap-1 px-2">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Saved Prompts ({prompts.length})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2 space-y-1.5">
        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <PillButton
              size="xs"
              variant={activeTag === null ? 'default' : 'ghost'}
              onClick={() => setActiveTag(null)}
            >
              All
            </PillButton>
            {allTags.map(tag => (
              <PillButton
                key={tag}
                size="xs"
                variant={activeTag === tag ? 'default' : 'ghost'}
                onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
              >
                {tag}
              </PillButton>
            ))}
          </div>
        )}

        {/* Prompt chips */}
        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
          {filtered.map(p => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <div className="group relative">
                  <PillButton
                    size="xs"
                    variant="outline"
                    onClick={() => onSelect(p.prompt_text)}
                    className="max-w-[180px] truncate pr-5"
                  >
                    {p.is_standard && <Star className="h-2.5 w-2.5 text-primary shrink-0" />}
                    {p.name}
                  </PillButton>
                  {!p.is_standard && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-destructive/20"
                    >
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                <p className="line-clamp-3">{p.prompt_text}</p>
                {p.tags.length > 0 && (
                  <p className="text-muted-foreground mt-1">{p.tags.join(', ')}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
