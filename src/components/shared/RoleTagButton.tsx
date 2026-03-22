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
import { TAG_GROUPS_BY_OUTPUT_TYPE } from '@/types/positionTags';

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

  // Determine which grouped sub-tags to show based on active role
  const activeRole = activeRoles.length === 1 ? activeRoles[0] : null;
  const tagGroups = activeRole ? TAG_GROUPS_BY_OUTPUT_TYPE[activeRole] : null;

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
        className="min-w-[160px] w-auto max-h-[320px] overflow-y-auto p-1.5 z-[100] bg-popover border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Role toggles */}
        <p className="text-[9px] text-muted-foreground px-1.5 pb-1 font-medium uppercase tracking-wider">Role Tags</p>
        <div className="space-y-0.5">
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

        {/* Grouped sub-tags when exactly one role is active */}
        {tagGroups && onTagToggle && (
          <div className="mt-2 pt-2 border-t border-border space-y-2">
            {Object.entries(tagGroups).map(([groupKey, group]) => (
              <div key={groupKey}>
                <p className="text-[9px] text-muted-foreground px-1.5 pb-0.5 font-medium uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1 px-1">
                  {group.tags.map((tag) => {
                    const isActive = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onTagToggle(tag)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] transition-colors border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "text-muted-foreground hover:bg-accent border-border"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
