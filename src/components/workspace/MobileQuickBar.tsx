import React from 'react';
import { Camera, Video, Settings, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface MobileQuickBarProps {
  // Mode
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
  
  // Model display
  selectedModelName: string;
  
  // Settings sheet trigger
  onOpenSettings: () => void;
  
  // Reference indicator
  hasReferenceImage?: boolean;
  referenceImageUrl?: string | null;
  onRemoveReference?: () => void;
  
  // Disabled state
  disabled?: boolean;
}

export const MobileQuickBar: React.FC<MobileQuickBarProps> = ({
  currentMode,
  onModeToggle,
  selectedModelName,
  onOpenSettings,
  hasReferenceImage = false,
  referenceImageUrl,
  onRemoveReference,
  disabled = false,
}) => {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {/* Mode Toggle */}
      <SegmentedControl
        options={[
          { value: 'image', label: 'Image', icon: <Camera className="h-3.5 w-3.5" /> },
          { value: 'video', label: 'Video', icon: <Video className="h-3.5 w-3.5" /> },
        ]}
        value={currentMode}
        onChange={onModeToggle}
        size="sm"
      />
      
      {/* Reference Image Indicator (when set) */}
      {hasReferenceImage && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border text-xs">
          {referenceImageUrl ? (
            <img 
              src={referenceImageUrl} 
              alt="Ref" 
              className="h-5 w-5 rounded object-cover"
            />
          ) : (
            <Image className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-muted-foreground max-w-[60px] truncate">Ref</span>
          {onRemoveReference && (
            <button
              type="button"
              onClick={onRemoveReference}
              className="ml-0.5 p-0.5 hover:bg-muted-foreground/20 rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Model Chip */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        className="h-9 px-2 gap-1.5 text-xs font-normal max-w-[100px]"
      >
        <span className="truncate">{selectedModelName}</span>
      </Button>
      
      {/* Settings Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSettings}
        className="h-9 w-9"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
};
