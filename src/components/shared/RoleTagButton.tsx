import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  SlotRole,
  SLOT_ROLE_LABELS,
  SLOT_ROLE_COLORS,
  MEANINGFUL_ROLES,
  ROLE_TAG_PREFIX,
} from '@/types/slotRoles';
import { UnifiedTagPicker } from '@/components/shared/UnifiedTagPicker';

/** Extract current role tags from a tags array */
export function getRoleTags(tags: string[]): SlotRole[] {
  return tags
    .filter(t => t.startsWith(ROLE_TAG_PREFIX))
    .map(t => t.slice(ROLE_TAG_PREFIX.length) as SlotRole)
    .filter(r => MEANINGFUL_ROLES.includes(r));
}

/** Toggle a role tag in a tags array, returns the new array */
export function toggleRoleTag(tags: string[], role: SlotRole): string[] {
  const tag = `${ROLE_TAG_PREFIX}${role}`;
  if (tags.includes(tag)) {
    return tags.filter(t => t !== tag);
  }
  return [...tags, tag];
}

/** Toggle a descriptive tag (non-role) in a tags array */
export function toggleDescriptiveTag(tags: string[], tag: string): string[] {
  if (tags.includes(tag)) {
    return tags.filter(t => t !== tag);
  }
  return [...tags, tag];
}

/** Compact button that opens a role-tag popover for an asset */
export const RoleTagButton: React.FC<{
  tags: string[];
  onToggle: (role: SlotRole) => void;
  onTagToggle?: (tag: string) => void;
}> = ({ tags, onToggle, onTagToggle }) => {
  const [open, setOpen] = useState(false);
  const activeRoles = getRoleTags(tags);
  const hasRoles = activeRoles.length > 0;

  // Determine primary category from active role for the unified picker
  const primaryCategory = activeRoles.length === 1 ? activeRoles[0] : undefined;

  // Non-role tags for the unified picker
  const descriptiveTags = tags.filter(t => !t.startsWith(ROLE_TAG_PREFIX));

  const handleTagsChange = (newTags: string[]) => {
    if (!onTagToggle) return;
    // Find diff between old and new descriptive tags
    const oldSet = new Set(descriptiveTags);
    const newSet = new Set(newTags);
    // Added tags
    for (const t of newTags) {
      if (!oldSet.has(t)) onTagToggle(t);
    }
    // Removed tags
    for (const t of descriptiveTags) {
      if (!newSet.has(t)) onTagToggle(t);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={hasRoles ? 'default' : 'secondary'}
          onClick={(e) => e.stopPropagation()}
          className={cn("h-7 w-7 p-0", hasRoles && "bg-primary")}
          title="Tag with role"
        >
          <Tag className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="min-w-[200px] w-auto max-h-[400px] overflow-y-auto p-1.5 z-[100] bg-popover border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Role toggles */}
        <p className="text-[9px] text-muted-foreground px-1.5 pb-1 font-medium uppercase tracking-wider">Role Tags</p>
        <div className="space-y-0.5 mb-2">
          {MEANINGFUL_ROLES.map((role) => {
            const isActive = activeRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => onToggle(role)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors text-left",
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                )}
              >
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", SLOT_ROLE_COLORS[role])} />
                <span>{SLOT_ROLE_LABELS[role]}</span>
              </button>
            );
          })}
        </div>

        {/* Unified tag picker for descriptive tags */}
        {onTagToggle && (
          <div className="border-t border-border pt-2">
            <UnifiedTagPicker
              tags={descriptiveTags}
              onTagsChange={handleTagsChange}
              primaryCategory={primaryCategory}
              compact
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
