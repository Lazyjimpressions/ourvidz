import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Check, X } from "lucide-react";
import { MediaTile } from '@/types/workspace';
import { cn } from '@/lib/utils';

interface SDXLImageSelectorProps {
  open: boolean;
  onClose: () => void;
  tile: MediaTile;
  onSelectionUpdate: (selectedIndices: number[]) => void;
  onIndividualDelete: (indices: number[]) => void;
}

export const SDXLImageSelector = ({
  open,
  onClose,
  tile,
  onSelectionUpdate,
  onIndividualDelete
}: SDXLImageSelectorProps) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(tile.selectedImageIndices || Array.from({ length: tile.setSize || 0 }, (_, i) => i))
  );

  const handleImageSelect = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedIndices);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSaveSelection = () => {
    const selectedArray = Array.from(selectedIndices).sort();
    onSelectionUpdate(selectedArray);
    onClose();
  };

  const handleDeleteSelected = () => {
    const selectedArray = Array.from(selectedIndices).sort();
    onIndividualDelete(selectedArray);
    onClose();
  };

  const selectedCount = selectedIndices.size;
  const totalImages = tile.setSize || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/40">
              SDXL Set
            </Badge>
            Select Images to Keep ({selectedCount}/{totalImages})
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {tile.setImageUrls?.map((url, index) => (
            <div
              key={index}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200",
                selectedIndices.has(index)
                  ? "border-blue-500 shadow-lg shadow-blue-500/20"
                  : "border-gray-600 hover:border-gray-500"
              )}
            >
              <img
                src={url}
                alt={`SDXL image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Selection overlay */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Checkbox
                  checked={selectedIndices.has(index)}
                  onCheckedChange={(checked) => handleImageSelect(index, checked as boolean)}
                  className="h-6 w-6 border-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </div>

              {/* Selection indicator */}
              {selectedIndices.has(index) && (
                <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Image number */}
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                  #{index + 1}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {selectedCount} of {totalImages} images selected
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected ({selectedCount})
            </Button>
            
            <Button
              onClick={handleSaveSelection}
              disabled={selectedCount === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Save Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};