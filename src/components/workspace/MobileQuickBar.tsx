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
  
  // Desktop inline controls
  contentType?: 'sfw' | 'nsfw';
  onContentTypeChange?: (type: 'sfw' | 'nsfw') => void;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  batchSize?: number;
  onBatchSizeChange?: (size: number) => void;
  
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
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  batchSize = 1,
  onBatchSizeChange,
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
        <div 
          key={referenceImageUrl || 'ref-indicator'}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border text-xs"
        >
          {referenceImageUrl ? (
            <img 
              key={`img-${referenceImageUrl}`}
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

      {/* Desktop-only inline controls */}
      {onContentTypeChange && (
        <div className="hidden md:flex items-center gap-1.5">
          {/* Content Type */}
          <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
            {(['sfw', 'nsfw'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onContentTypeChange(t)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium uppercase transition-colors",
                  contentType === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Aspect Ratio */}
          {onAspectRatioChange && (
            <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
              {(['1:1', '16:9', '9:16'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onAspectRatioChange(r)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium transition-colors",
                    aspectRatio === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Batch Size */}
          {onBatchSizeChange && (
            <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
              {[1, 3, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onBatchSizeChange(n)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium transition-colors min-w-[24px]",
                    batchSize === n
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {n}×
                </button>
              ))}
            </div>
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