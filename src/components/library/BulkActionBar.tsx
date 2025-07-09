import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, X, CheckSquare, Plus } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onAddToWorkspace: () => void;
  totalFilteredCount: number;
}

export const BulkActionBar = ({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  onAddToWorkspace,
  totalFilteredCount
}: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4">
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-600 text-white">
              {selectedCount} selected
            </Badge>
            {selectedCount < totalFilteredCount && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                Select All ({totalFilteredCount})
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onAddToWorkspace}
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add to Workspace
            </Button>
            <Button
              onClick={onBulkDownload}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              onClick={onBulkDelete}
              variant="outline"
              size="sm"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button
              onClick={onClearSelection}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};