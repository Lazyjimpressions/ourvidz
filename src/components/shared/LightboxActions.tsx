import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, ChevronRight, Trash2, Download, Copy, Shuffle, BookmarkPlus, Tag } from 'lucide-react';
import type { SharedAsset } from '@/lib/services/AssetMappers';
import { RoleTagButton } from './RoleTagButton';
import type { SlotRole } from '@/types/slotRoles';

/** Compact action buttons for workspace assets in lightbox */
export const WorkspaceAssetActions: React.FC<{
  asset: SharedAsset;
  onSave?: () => void;
  onClear?: () => void;
  onDiscard?: () => void;
  onDownload?: () => void;
  onUseAsReference?: () => void;
  onRoleTagToggle?: (role: SlotRole) => void;
  onTagToggle?: (tag: string) => void;
  tags?: string[];
}> = ({ asset, onSave, onClear, onDiscard, onDownload, onUseAsReference, onRoleTagToggle, onTagToggle, tags }) => (
  <>
    {onSave && (
      <Button size="sm" variant="secondary" onClick={onSave} className="h-7 w-7 p-0" title="Save to Library">
        <Save className="w-3 h-3" />
      </Button>
    )}
    {onClear && (
      <Button size="sm" variant="secondary" onClick={onClear} className="h-7 w-7 p-0" title="Clear (save to library then remove)">
        <ChevronRight className="w-3 h-3" />
      </Button>
    )}
    {onDiscard && (
      <Button size="sm" variant="destructive" onClick={onDiscard} className="h-7 w-7 p-0" title="Delete permanently">
        <Trash2 className="w-3 h-3" />
      </Button>
    )}
    {onDownload && (
      <Button size="sm" variant="secondary" onClick={onDownload} className="h-7 w-7 p-0" title="Download">
        <Download className="w-3 h-3" />
      </Button>
    )}
    {onUseAsReference && (
      <Button size="sm" variant="secondary" onClick={onUseAsReference} className="h-7 w-7 p-0" title="Add to REF (Modify)">
        <Copy className="w-3 h-3" />
      </Button>
    )}
    {onRoleTagToggle && tags && (
      <RoleTagButton tags={tags} onToggle={onRoleTagToggle} onTagToggle={onTagToggle} />
    )}
  </>
);

/** Compact action buttons for library assets in lightbox */
export const LibraryAssetActions: React.FC<{
  asset: SharedAsset;
  onDelete?: () => void;
  onDownload?: () => void;
  onUseAsReference?: () => void;
  onRoleTagToggle?: (role: SlotRole) => void;
  onTagToggle?: (tag: string) => void;
  onSaveToCanon?: () => void;
  onOpenTagEditor?: () => void;
  tags?: string[];
}> = ({ asset, onDelete, onDownload, onUseAsReference, onRoleTagToggle, onTagToggle, onSaveToCanon, onOpenTagEditor, tags }) => (
  <>
    {onUseAsReference && (
      <Button size="sm" variant="secondary" onClick={onUseAsReference} className="h-7 w-7 p-0" title="Use as Reference">
        <Shuffle className="w-3 h-3" />
      </Button>
    )}
    {onDownload && (
      <Button size="sm" variant="outline" onClick={onDownload} className="h-7 w-7 p-0" title="Download">
        <Download className="w-3 h-3" />
      </Button>
    )}
    {onOpenTagEditor ? (
      <Button size="sm" variant={tags?.length ? 'default' : 'secondary'} onClick={onOpenTagEditor} className="h-7 w-7 p-0" title="Edit Tags">
        <Tag className="w-3 h-3" />
      </Button>
    ) : onRoleTagToggle && tags ? (
      <RoleTagButton tags={tags} onToggle={onRoleTagToggle} onTagToggle={onTagToggle} />
    ) : null}
    {onSaveToCanon && (
      <Button size="sm" variant="outline" onClick={onSaveToCanon} className="h-7 w-7 p-0" title="Save to Character Canon">
        <BookmarkPlus className="w-3 h-3" />
      </Button>
    )}
    {onDelete && (
      <Button size="sm" variant="outline" onClick={onDelete} className="h-7 w-7 p-0" title="Delete">
        <Trash2 className="w-3 h-3" />
      </Button>
    )}
  </>
);
