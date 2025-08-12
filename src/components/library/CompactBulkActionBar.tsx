import React from 'react';
import { PillButton } from '@/components/ui/pill-button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, X, CheckSquare, Plus } from 'lucide-react';

interface CompactBulkActionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onAddToWorkspace: () => void;
  totalFilteredCount: number;
}

export const CompactBulkActionBar = ({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  onAddToWorkspace,
  totalFilteredCount
}: CompactBulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed left-1/2 transform -translate-x-1/2 z-50"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="bg-background/95 border border-border rounded-xl shadow-lg p-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              {selectedCount} selected
            </Badge>
            {selectedCount < totalFilteredCount && (
              <PillButton
                variant="ghost"
                size="xs"
                onClick={onSelectAll}
                className="gap-1"
              >
                <CheckSquare className="h-3 w-3" />
                All ({totalFilteredCount})
              </PillButton>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <PillButton
              onClick={onAddToWorkspace}
              variant="default"
              size="xs"
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Workspace
            </PillButton>
            <PillButton
              onClick={onBulkDownload}
              variant="outline"
              size="xs"
              className="gap-1"
            >
              <Download className="h-3 w-3" />
            </PillButton>
            <PillButton
              onClick={onBulkDelete}
              variant="destructive"
              size="xs"
              className="gap-1"
            >
              <Trash2 className="h-3 w-3" />
            </PillButton>
            <PillButton
              onClick={onClearSelection}
              variant="ghost"
              size="xs"
            >
              <X className="h-3 w-3" />
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
};