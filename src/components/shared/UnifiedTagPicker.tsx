import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { PillFilter } from '@/components/ui/pill-filter';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTagPresets } from '@/hooks/useTagPresets';

interface UnifiedTagPickerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  /** Primary category to auto-expand (e.g. 'position', 'clothing') */
  primaryCategory?: string;
  /** Compact mode for smaller popovers */
  compact?: boolean;
}

export const UnifiedTagPicker: React.FC<UnifiedTagPickerProps> = ({
  tags,
  onTagsChange,
  primaryCategory,
  compact = false,
}) => {
  const { categories } = useTagPresets();
  const [sectionInputs, setSectionInputs] = useState<Record<string, string>>({});
  const [customTagGroupMap, setCustomTagGroupMap] = useState<Record<string, string>>({});

  const handleToggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter(t => t !== tag));
    } else {
      onTagsChange([...tags, tag]);
    }
  };

  const handleAddCustomTag = (catKey: string, groupKey: string) => {
    const inputKey = `${catKey}_${groupKey}`;
    const value = (sectionInputs[inputKey] || '').trim().toLowerCase();
    if (value && !tags.includes(value)) {
      onTagsChange([...tags, value]);
      setCustomTagGroupMap(prev => ({ ...prev, [value]: inputKey }));
    }
    setSectionInputs(prev => ({ ...prev, [inputKey]: '' }));
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  // Collect all known preset tag values
  const allPresetTags = new Set<string>();
  for (const cat of categories) {
    for (const group of Object.values(cat.groups)) {
      for (const t of group.tags) allPresetTags.add(t);
    }
  }

  // Orphan tags: in tags[] but not in any preset and not mapped to a custom group
  const orphanTags = tags.filter(t =>
    !allPresetTags.has(t) && !customTagGroupMap[t] && !t.startsWith('role:')
  );

  const textSize = compact ? 'text-[9px]' : 'text-[10px]';
  const pillSize = compact ? 'sm' : 'sm';

  return (
    <div className="space-y-1.5">
      {categories.map(({ category, key: catKey, groups }) => {
        const hasActiveTags = Object.values(groups).some(g =>
          g.tags.some(t => tags.includes(t))
        );
        const hasCustomTagsInCat = Object.keys(groups).some(gk =>
          tags.some(t => customTagGroupMap[t] === `${catKey}_${gk}`)
        );
        const isPrimary = catKey === primaryCategory;

        return (
          <Collapsible key={catKey} defaultOpen={isPrimary || hasActiveTags || hasCustomTagsInCat}>
            <CollapsibleTrigger className={`flex items-center gap-1 w-full ${textSize} font-semibold text-foreground py-0.5 hover:text-primary border-b border-border/50 mb-0.5`}>
              <ChevronDown className="w-3 h-3 transition-transform" />
              {category}
              {(hasActiveTags || hasCustomTagsInCat) && <span className="ml-auto text-[8px] text-primary">●</span>}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-1 space-y-1">
              {Object.entries(groups).map(([groupKey, group]) => {
                const inputKey = `${catKey}_${groupKey}`;
                const inputValue = sectionInputs[inputKey] || '';
                // Custom tags assigned to this group
                const customTagsInGroup = tags.filter(
                  t => !group.tags.includes(t) && customTagGroupMap[t] === inputKey
                );
                const hasAnyActive = group.tags.some(t => tags.includes(t)) || customTagsInGroup.length > 0;

                return (
                  <Collapsible key={groupKey} defaultOpen={isPrimary || hasAnyActive}>
                    <CollapsibleTrigger className={`flex items-center gap-1 w-full text-[9px] font-medium text-muted-foreground uppercase tracking-wider py-0.5 hover:text-foreground`}>
                      <ChevronDown className="w-2.5 h-2.5 transition-transform" />
                      {group.label}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1 py-0.5">
                        {group.tags.map(tag => (
                          <PillFilter
                            key={tag}
                            active={tags.includes(tag)}
                            onClick={() => handleToggleTag(tag)}
                            size={pillSize}
                          >
                            {tag}
                          </PillFilter>
                        ))}
                        {/* Custom tags in this group */}
                        {customTagsInGroup.map(tag => (
                          <PillFilter
                            key={tag}
                            active
                            onClick={() => handleRemoveTag(tag)}
                            size={pillSize}
                          >
                            {tag} ×
                          </PillFilter>
                        ))}
                      </div>
                      <div className="flex gap-1 mt-0.5">
                        <Input
                          value={inputValue}
                          onChange={(e) => setSectionInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag(catKey, groupKey)}
                          placeholder={`+ custom ${group.label.toLowerCase()}…`}
                          className="h-5 text-[10px] px-1.5"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1 min-w-0"
                          onClick={() => handleAddCustomTag(catKey, groupKey)}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Orphan tags */}
      {orphanTags.length > 0 && (
        <div className="pt-1 border-t border-border">
          <span className="text-[9px] text-muted-foreground font-medium">Custom tags</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {orphanTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[9px] cursor-pointer hover:bg-destructive/20"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Active tags summary */}
      {tags.length > 0 && (
        <div className="pt-1 border-t border-border">
          <span className="text-[9px] text-muted-foreground font-medium">{tags.length} tag{tags.length !== 1 ? 's' : ''} active</span>
        </div>
      )}
    </div>
  );
};
