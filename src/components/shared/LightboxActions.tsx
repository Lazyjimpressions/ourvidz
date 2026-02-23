import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, ChevronRight, Trash2, Download, Copy, Shuffle } from 'lucide-react';
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
  tags?: string[];
}> = ({ asset, onSave, onClear, onDiscard, onDownload, onUseAsReference, onRoleTagToggle, tags }) => (
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
      <RoleTagButton tags={tags} onToggle={onRoleTagToggle} />
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
  tags?: string[];
}> = ({ asset, onDelete, onDownload, onUseAsReference, onRoleTagToggle, tags }) => (
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
    {onRoleTagToggle && tags && (
      <RoleTagButton tags={tags} onToggle={onRoleTagToggle} />
    )}
    {onDelete && (
      <Button size="sm" variant="outline" onClick={onDelete} className="h-7 w-7 p-0" title="Delete">
        <Trash2 className="w-3 h-3" />
      </Button>
    )}
  </>
);
