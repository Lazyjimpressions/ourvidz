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

/** Compact button that opens a role-tag popover for an asset */
export const RoleTagButton: React.FC<{
  tags: string[];
  onToggle: (role: SlotRole) => void;
}> = ({ tags, onToggle }) => {
  const [open, setOpen] = useState(false);
  const activeRoles = getRoleTags(tags);
  const hasRoles = activeRoles.length > 0;

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
        className="min-w-[120px] w-auto p-1.5 z-[100] bg-popover border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
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
      </PopoverContent>
    </Popover>
  );
};
