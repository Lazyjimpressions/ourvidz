import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Image, Play, Edit, Save, Trash2, Download, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface WorkspaceItem {
  id: string;
  url: string;
  prompt: string;
  type: 'image' | 'video';
  modelType?: string;
  quality?: 'fast' | 'high';
  generationParams?: {
    seed?: number;
    originalAssetId?: string;
    timestamp?: string;
  };
  seed?: number;
  originalAssetId?: string;
  timestamp?: string;
}

interface MobileWorkspaceGridProps {
  items: WorkspaceItem[];
  onEdit: (item: WorkspaceItem) => void;
  onSave: (item: WorkspaceItem) => void;
  onDelete: (item: WorkspaceItem) => void;
  onView: (item: WorkspaceItem) => void;
  onDownload?: (item: WorkspaceItem) => void;
  onUseAsReference?: (item: WorkspaceItem) => void;
  onUseSeed?: (item: WorkspaceItem) => void;
  isDeleting?: Set<string>;
  className?: string;
}

export const MobileWorkspaceGrid: React.FC<MobileWorkspaceGridProps> = ({
  items,
  onEdit,
  onSave,
  onDelete,
  onView,
  onDownload,
  onUseAsReference,
  onUseSeed,
  isDeleting = new Set(),
  className = ""
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);

  const getSeedFromItem = (item: WorkspaceItem): number | undefined => {
    return item.generationParams?.seed || item.seed;
  };

  // Handle touch start for long press detection
  const handleTouchStart = useCallback((itemId: string, e: React.TouchEvent) => {
    if (!isTouchDevice) return;

    const timer = setTimeout(() => {
      setSelectedItem(itemId);
      setShowActionSheet(itemId);
    }, 500); // 500ms long press

    setLongPressTimer(timer);
    setSwipeStartX(e.touches[0].clientX);
    setSwipeStartY(e.touches[0].clientY);
  }, [isTouchDevice]);

  // Handle touch end to cancel long press
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setSwipeStartX(null);
    setSwipeStartY(null);
  }, [longPressTimer]);

  // Handle touch move for swipe detection
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartX || !swipeStartY) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = Math.abs(currentX - swipeStartX);
    const deltaY = Math.abs(currentY - swipeStartY);

    // If significant horizontal swipe, cancel long press
    if (deltaX > 50 && deltaX > deltaY) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  }, [swipeStartX, swipeStartY, longPressTimer]);

  // Handle item click (short tap)
  const handleItemClick = useCallback((item: WorkspaceItem) => {
    if (longPressTimer) {
      // Long press in progress, don't trigger click
      return;
    }
    onView(item);
  }, [onView, longPressTimer]);

  // Handle action sheet close
  const handleCloseActionSheet = useCallback(() => {
    setShowActionSheet(null);
    setSelectedItem(null);
  }, []);

  // Handle action from sheet
  const handleAction = useCallback((action: () => void) => {
    action();
    handleCloseActionSheet();
  }, [handleCloseActionSheet]);

  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center mb-4">
          <Image className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Workspace is empty</h3>
        <p className="text-muted-foreground max-w-md">
          Generated images and videos will automatically appear here. Start creating content to see your workspace fill up!
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Grid Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          Current Workspace ({items.length} {items.length === 1 ? 'asset' : 'assets'})
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{isMobile ? 'Tap to view • Long press for actions' : 'Click to view • Hover for actions'}</span>
        </div>
      </div>

      {/* Mobile-Optimized Grid Layout */}
      <div className={`grid gap-4 ${
        isMobile 
          ? 'grid-cols-2' 
          : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
      }`}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`relative group aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
              selectedItem === item.id 
                ? 'ring-2 ring-primary scale-105' 
                : 'hover:scale-105 hover:shadow-lg'
            }`}
            onClick={() => handleItemClick(item)}
            onTouchStart={(e) => handleTouchStart(item.id, e)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            {/* Media Content */}
            {item.type === 'video' ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                muted
                loop
                onMouseEnter={(e) => !isTouchDevice && e.currentTarget.play()}
                onMouseLeave={(e) => !isTouchDevice && e.currentTarget.pause()}
              />
            ) : (
              <img
                src={item.url}
                alt={`Workspace ${item.id}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}

            {/* Mobile Action Button (Always Visible) */}
            <div className="absolute top-2 right-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-background/80 hover:bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActionSheet(item.id);
                }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Type Indicator */}
            <div className="absolute top-2 left-2">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                item.type === 'video' 
                  ? 'bg-blue-500/80 text-white' 
                  : 'bg-green-500/80 text-white'
              }`}>
                {item.type === 'video' ? (
                  <div className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    VIDEO
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    IMAGE
                  </div>
                )}
              </div>
            </div>

            {/* Quality Indicator */}
            {item.quality && (
              <div className="absolute bottom-2 left-2">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  item.quality === 'high' 
                    ? 'bg-purple-500/80 text-white' 
                    : 'bg-orange-500/80 text-white'
                }`}>
                  {item.quality === 'high' ? 'HIGH' : 'FAST'}
                </div>
              </div>
            )}

            {/* Seed Display */}
            {getSeedFromItem(item) && (
              <div className="absolute bottom-2 right-2">
                <div className="bg-background/80 px-2 py-1 rounded text-xs font-mono">
                  🎲 {getSeedFromItem(item)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Action Sheet */}
      {showActionSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-background rounded-t-lg w-full max-w-md p-4 space-y-2">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Item Actions
            </div>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleAction(() => onEdit(items.find(i => i.id === showActionSheet)!))}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Prompt
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleAction(() => onSave(items.find(i => i.id === showActionSheet)!))}
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Library
              </Button>
              
              {onDownload && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleAction(() => onDownload(items.find(i => i.id === showActionSheet)!))}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              
              {onUseAsReference && items.find(i => i.id === showActionSheet)?.type === 'image' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleAction(() => onUseAsReference(items.find(i => i.id === showActionSheet)!))}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Use as Reference
                </Button>
              )}
              
              {onUseSeed && getSeedFromItem(items.find(i => i.id === showActionSheet)!) && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleAction(() => onUseSeed(items.find(i => i.id === showActionSheet)!))}
                >
                  <span className="mr-2">🎲</span>
                  Use Seed
                </Button>
              )}
              
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => handleAction(() => onDelete(items.find(i => i.id === showActionSheet)!))}
                disabled={isDeleting.has(showActionSheet)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting.has(showActionSheet) ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleCloseActionSheet}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 