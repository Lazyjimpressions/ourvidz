import React from 'react';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { UnifiedTagPicker } from '@/components/shared/UnifiedTagPicker';
import { cn } from '@/lib/utils';
import {
  SLOT_ROLE_LABELS,
  SLOT_ROLE_COLORS,
  MEANINGFUL_ROLES,
  ROLE_TAG_PREFIX,
} from '@/types/slotRoles';
import type { SlotRole } from '@/types/slotRoles';

interface TagEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  /** Primary category hint for auto-expanding relevant tag groups */
  categoryHint?: string;
  /** Display title (e.g. asset label or type) */
  title?: string;
  /** Badge text shown next to title */
  categoryBadge?: string;
  /** Whether to show role tag pills (default true) */
  showRoleTags?: boolean;
}

/** Extract current role tags from a tags array */
function getRoleTags(tags: string[]): SlotRole[] {
  return tags
    .filter(t => t.startsWith(ROLE_TAG_PREFIX))
    .map(t => t.slice(ROLE_TAG_PREFIX.length) as SlotRole)
    .filter(r => MEANINGFUL_ROLES.includes(r));
}

/**
 * Shared tag editor drawer that works on both mobile (bottom sheet) and desktop (dialog).
 * Used by PositionsGrid (character_canon) and Library (user_library).
 * The parent handles persistence — this component only manages UI.
 */
export const TagEditorDrawer: React.FC<TagEditorDrawerProps> = ({
  open,
  onOpenChange,
  tags,
  onTagsChange,
  categoryHint,
  title = 'Edit Tags',
  categoryBadge,
  showRoleTags = true,
}) => {
  const activeRoles = getRoleTags(tags);
  const descriptiveTags = tags.filter(t => !t.startsWith(ROLE_TAG_PREFIX));

  const handleRoleToggle = (role: SlotRole) => {
    const roleTag = `${ROLE_TAG_PREFIX}${role}`;
    if (tags.includes(roleTag)) {
      onTagsChange(tags.filter(t => t !== roleTag));
    } else {
      onTagsChange([...tags, roleTag]);
    }
  };

  const handleDescriptiveTagsChange = (newDescriptiveTags: string[]) => {
    // Preserve role tags, replace descriptive tags
    const roleTags = tags.filter(t => t.startsWith(ROLE_TAG_PREFIX));
    onTagsChange([...roleTags, ...newDescriptiveTags]);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {title}
            {categoryBadge && (
              <Badge variant="secondary" className="text-xs capitalize ml-1">
                {categoryBadge}
              </Badge>
            )}
            {tags.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {tags.length} tag{tags.length !== 1 ? 's' : ''}
              </span>
            )}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Role tag pills (horizontal) */}
          {showRoleTags && (
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">
                Category
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MEANINGFUL_ROLES.map((role) => {
                  const isActive = activeRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleToggle(role)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors min-h-[32px]",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", SLOT_ROLE_COLORS[role])} />
                      {SLOT_ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descriptive tags */}
          <div>
            {showRoleTags && (
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">
                Descriptive Tags
              </p>
            )}
            <UnifiedTagPicker
              tags={descriptiveTags}
              onTagsChange={handleDescriptiveTagsChange}
              primaryCategory={categoryHint || (activeRoles.length === 1 ? activeRoles[0] : undefined)}
            />
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
