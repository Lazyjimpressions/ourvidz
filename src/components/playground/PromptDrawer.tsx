import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Star } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlaygroundPrompt } from '@/hooks/usePlaygroundPrompts';

const TASK_TYPES = ['t2i', 'i2i', 'i2v', 't2v'] as const;

interface PromptDrawerProps {
  prompts: PlaygroundPrompt[];
  isLoading: boolean;
  onSelect: (promptText: string) => void;
  onDelete: (id: string) => Promise<void>;
  /** Currently active task type from the selected model */
  activeTaskType?: string | null;
  /** Currently active model family from the selected model */
  activeModelFamily?: string | null;
  /** Called when user overrides the task type filter */
  onTaskTypeChange?: (taskType: string | null) => void;
  /** Called when user overrides the model family filter */
  onModelFamilyChange?: (modelFamily: string | null) => void;
}

export const PromptDrawer: React.FC<PromptDrawerProps> = ({
  prompts, isLoading, onSelect, onDelete,
  activeTaskType, activeModelFamily,
  onTaskTypeChange, onModelFamilyChange,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  if (prompts.length === 0 && !isLoading) return null;

  // Collect unique model families from prompts
  const allFamilies = Array.from(
    new Set(prompts.map(p => p.model_family).filter(Boolean) as string[])
  ).sort();

  // Collect unique content tags
  const allTags = Array.from(new Set(prompts.flatMap(p => p.tags))).sort();

  // Apply task type filter
  let filtered = activeTaskType
    ? prompts.filter(p => p.task_type === activeTaskType)
    : prompts;

  // Apply model family filter
  if (activeModelFamily) {
    filtered = filtered.filter(p => p.model_family === activeModelFamily || !p.model_family);
  }

  // Apply content tag filter
  if (activeTag) {
    filtered = filtered.filter(p => p.tags.includes(activeTag));
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 text-muted-foreground gap-1 px-2">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Saved Prompts ({prompts.length})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2 space-y-1.5">
        {/* Row 1: Task type filter */}
        <div className="flex flex-wrap gap-1">
          <PillButton
            size="xs"
            variant={!activeTaskType ? 'default' : 'ghost'}
            onClick={() => onTaskTypeChange?.(null)}
          >
            All
          </PillButton>
          {TASK_TYPES.map(task => (
            <PillButton
              key={task}
              size="xs"
              variant={activeTaskType === task ? 'default' : 'ghost'}
              onClick={() => onTaskTypeChange?.(activeTaskType === task ? null : task)}
            >
              {task}
            </PillButton>
          ))}
        </div>

        {/* Row 2: Model family filter */}
        {allFamilies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <PillButton
              size="xs"
              variant={!activeModelFamily ? 'default' : 'ghost'}
              onClick={() => onModelFamilyChange?.(null)}
            >
              All families
            </PillButton>
            {allFamilies.map(family => (
              <PillButton
                key={family}
                size="xs"
                variant={activeModelFamily === family ? 'default' : 'ghost'}
                onClick={() => onModelFamilyChange?.(activeModelFamily === family ? null : family)}
              >
                {family}
              </PillButton>
            ))}
          </div>
        )}

        {/* Row 3: Content tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <PillButton
              size="xs"
              variant={activeTag === null ? 'default' : 'ghost'}
              onClick={() => setActiveTag(null)}
            >
              All tags
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.model_family && (
                    <span className="text-primary font-medium">{p.model_family}</span>
                  )}
                  {p.tags.length > 0 && (
                    <span className="text-muted-foreground">{p.tags.join(', ')}</span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
