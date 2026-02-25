import React, { useState } from 'react';
import { Camera, Video, Settings, X, Plus, Film, ChevronDown, Check, Loader2, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import {
  SlotRole,
  SLOT_ROLE_LABELS,
  SLOT_ROLE_COLORS,
  MEANINGFUL_ROLES,
  DEFAULT_SLOT_ROLES,
  getSlotLabel,
  QUICK_SCENE_SLOTS,
} from '@/types/slotRoles';

export interface RefSlotData {
  url?: string | null;
  isVideo?: boolean;
  role?: SlotRole;
  label?: string;
}

/** Fixed slot definitions for image mode (10 slots for multi-ref support) - legacy */
export const FIXED_IMAGE_SLOTS: { role: SlotRole; label: string }[] =
  DEFAULT_SLOT_ROLES.map((role, i) => ({ role, label: getSlotLabel(role, i) }));

export interface MobileQuickBarProps {
  // Mode
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
  
  // Model display
  selectedModelName: string;
  
  // Settings sheet trigger
  onOpenSettings: () => void;
  
  // Dynamic ref slots (used in video mode)
  refSlots: RefSlotData[];
  maxSlots: number;
  onAddRef: (index: number) => void;
  onRemoveRef: (index: number) => void;
  onDropRef: (index: number, file: File) => void;
  onDropRefUrl?: (index: number, url: string) => void;
  onAddSlot: () => void;
  
  // Fixed image slots (used in image mode)
  fixedSlots?: RefSlotData[];
  onFixedSlotAdd?: (index: number) => void;
  onFixedSlotRemove?: (index: number) => void;
  onFixedSlotDrop?: (index: number, file: File) => void;
  /** Handle URL-based drops (from grid tile drag) — no upload needed */
  onFixedSlotDropUrl?: (index: number, url: string) => void;
  /** Open library picker for a given slot */
  onFixedSlotAddFromLibrary?: (index: number) => void;
  /** Open native file picker (no capture) for a given slot */
  onFixedSlotAddFromFile?: (index: number) => void;
  /** Slot role assignments (parallel to fixedSlots) */
  slotRoles?: SlotRole[];
  onSlotRoleChange?: (index: number, role: SlotRole) => void;
  
  // Desktop inline controls
  contentType?: 'sfw' | 'nsfw';
  onContentTypeChange?: (type: 'sfw' | 'nsfw') => void;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  batchSize?: number;
  onBatchSizeChange?: (size: number) => void;
  
  // Model selector dropdown
  selectedModel?: { id: string; type: string; display_name: string } | null;
  onModelChange?: (model: { id: string; type: string; display_name: string }) => void;
  imageModels?: Array<{ id: string; display_name: string; provider_name: string; tasks?: string[] }>;
  videoModels?: Array<{ id: string; display_name: string; api_providers?: { name: string } }>;
  modelsLoading?: boolean;
  multiRefActive?: boolean;
  
  /** Selected model's task tags (e.g. ['multi', 'i2v']) */
  selectedModelTasks?: string[];
  
  // Disabled state
  disabled?: boolean;
}

/** Single ref slot with optional label underneath */
const RefSlot: React.FC<{
  url?: string | null;
  isVideo?: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onDrop: (file: File) => void;
  onDropUrl?: (url: string) => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
  role?: SlotRole;
  onRoleChange?: (role: SlotRole) => void;
  onAddFromLibrary?: () => void;
  onAddFromFile?: () => void;
}> = ({ url, isVideo, onAdd, onRemove, onDrop, onDropUrl, label, disabled, showLabel = false, role, onRoleChange, onAddFromLibrary, onAddFromFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [justDropped, setJustDropped] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Check for custom ref-image MIME (from grid tile drag) first
    const refData = e.dataTransfer.getData('application/x-ref-image');
    if (refData && onDropUrl) {
      try {
        const { url: droppedUrl } = JSON.parse(refData);
        if (droppedUrl) {
          onDropUrl(droppedUrl);
          // Brief green flash feedback
          setJustDropped(true);
          setTimeout(() => setJustDropped(false), 400);
          return;
        }
      } catch { /* fall through to file drop */ }
    }

    // Fallback: OS file drop
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDrop(file);
      setJustDropped(true);
      setTimeout(() => setJustDropped(false), 400);
    }
  };

  const slotSize = showLabel ? 'h-10 w-10' : 'h-8 w-8';

  if (url) {
    return (
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            `relative ${slotSize} rounded border overflow-hidden bg-muted/20 transition-all duration-200`,
            isDragOver
              ? "border-primary ring-2 ring-primary/50 scale-110 bg-primary/20"
              : justDropped
                ? "border-green-500 ring-2 ring-green-500/50 scale-105"
                : "border-border/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropEvent}
        >
          {isVideo ? (
            videoError ? (
              <div className="h-full w-full flex items-center justify-center bg-muted/40">
                <Film className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <video
                src={url}
                muted
                preload="metadata"
                className="h-full w-full object-cover"
                onError={() => setVideoError(true)}
              />
            )
          ) : (
            <img src={url} alt={label} className="h-full w-full object-cover" />
          )}
          {isVideo && !videoError && (
            <div className="absolute bottom-0 left-0 bg-black/60 px-0.5">
              <Film className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive/80 flex items-center justify-center"
          >
            <X className="h-2 w-2 text-destructive-foreground" />
          </button>
          {/* Role badge - tap to change */}
          {role && onRoleChange && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center text-[7px] font-bold text-white leading-none tracking-wide",
                    SLOT_ROLE_COLORS[role],
                    "bg-opacity-90"
                  )}
                >
                  {SLOT_ROLE_LABELS[role]}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                className="min-w-[120px] w-auto p-1.5 z-[100] bg-popover border border-border shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[9px] text-muted-foreground px-1.5 pb-1 font-medium uppercase tracking-wider">Slot Role</p>
                <div className="space-y-0.5">
                  {([...MEANINGFUL_ROLES, 'reference'] as SlotRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onRoleChange(r)}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors text-left",
                        role === r ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", SLOT_ROLE_COLORS[r])} />
                      {SLOT_ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {showLabel && (
          <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">{label}</span>
        )}
      </div>
    );
  }

  // If source callbacks provided, show dropdown; otherwise plain button
  if (onAddFromLibrary) {
    return (
      <div className="flex flex-col items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDropEvent}
              className={cn(
                `${slotSize} rounded border border-dashed flex items-center justify-center hover:border-primary/60 hover:bg-muted/30 transition-all duration-200 disabled:opacity-30`,
                isDragOver
                  ? "border-primary bg-primary/20 scale-110 ring-2 ring-primary/50"
                  : justDropped
                    ? "border-green-500 ring-2 ring-green-500/50 scale-105"
                    : "border-muted-foreground/40"
              )}
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="min-w-[130px] z-[100] bg-popover border border-border shadow-lg"
          >
            <DropdownMenuItem onClick={onAdd} className="gap-2 text-xs">
              <Camera className="h-3.5 w-3.5" />
              Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddFromLibrary} className="gap-2 text-xs">
              <ImageIcon className="h-3.5 w-3.5" />
              Library
            </DropdownMenuItem>
            {onAddFromFile && (
              <DropdownMenuItem onClick={onAddFromFile} className="gap-2 text-xs">
                <Upload className="h-3.5 w-3.5" />
                File
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {showLabel && (
          <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">{label}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center shrink-0">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropEvent}
        className={cn(
          `${slotSize} rounded border border-dashed flex items-center justify-center hover:border-primary/60 hover:bg-muted/30 transition-all duration-200 disabled:opacity-30`,
          isDragOver
            ? "border-primary bg-primary/20 scale-110 ring-2 ring-primary/50"
            : justDropped
              ? "border-green-500 ring-2 ring-green-500/50 scale-105"
              : "border-muted-foreground/40"
        )}
      >
        <Plus className="h-3 w-3 text-muted-foreground" />
      </button>
      {showLabel && (
        <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">{label}</span>
      )}
    </div>
  );
};

/** "+" button to add more ref slots (video mode only) */
const AddSlotButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 rounded-full border border-dashed border-primary/40 flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors shrink-0 disabled:opacity-30"
    title="Add reference slot"
  >
    <Plus className="h-3.5 w-3.5 text-primary/70" />
  </button>
);

/** Single item in the model dropdown */
const ModelDropdownItem: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-colors text-left",
      selected
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-accent"
    )}
  >
    <Check className={cn("h-3 w-3 shrink-0", selected ? "opacity-100" : "opacity-0")} />
    <span className="truncate">{label}</span>
  </button>
);

/** Compact popover that shows current value and reveals options on click */
function CompactPopover<T extends string | number>({
  label,
  options,
  value,
  onSelect,
  renderLabel,
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (v: T) => void;
  renderLabel?: (v: T) => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 px-2 gap-1 text-[10px] font-medium rounded border bg-muted/50 flex items-center transition-colors hover:bg-muted",
            className
          )}
        >
          <span>{label}</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="min-w-[80px] w-auto p-1 z-[100] bg-popover border border-border shadow-lg"
      >
        <div className="space-y-0.5">
          {options.map((opt) => (
            <ModelDropdownItem
              key={String(opt)}
              label={renderLabel ? renderLabel(opt) : String(opt)}
              selected={value === opt}
              onClick={() => { onSelect(opt); setOpen(false); }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const MobileQuickBar: React.FC<MobileQuickBarProps> = ({
  currentMode,
  onModeToggle,
  selectedModelName,
  onOpenSettings,
  refSlots,
  maxSlots,
  onAddRef,
  onRemoveRef,
  onDropRef,
  onDropRefUrl,
  onAddSlot,
  fixedSlots = [],
  onFixedSlotAdd,
  onFixedSlotRemove,
  onFixedSlotDrop,
  onFixedSlotDropUrl,
  onFixedSlotAddFromLibrary,
  onFixedSlotAddFromFile,
  slotRoles,
  onSlotRoleChange,
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  batchSize = 1,
  onBatchSizeChange,
  selectedModel,
  onModelChange,
  imageModels = [],
  videoModels = [],
  modelsLoading = false,
  multiRefActive = false,
  selectedModelTasks = [],
  disabled = false,
}) => {
  const allFilled = refSlots.length > 0 && refSlots.every(s => !!s.url);
  const canAddMore = refSlots.length < maxSlots;

  // Use fixed slots in image mode, dynamic slots in video mode
  const useFixedSlots = currentMode === 'image' && onFixedSlotAdd && onFixedSlotRemove && onFixedSlotDrop;

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
      
      {/* Ref Slots */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {useFixedSlots ? (
          /* Quick Scene: 5 fixed labeled slots for image mode */
          QUICK_SCENE_SLOTS.map((slotDef, i) => (
            <RefSlot
              key={`qs-${i}`}
              url={fixedSlots[i]?.url}
              isVideo={fixedSlots[i]?.isVideo}
              onAdd={() => onFixedSlotAdd!(i)}
              onRemove={() => onFixedSlotRemove!(i)}
              onDrop={(file) => onFixedSlotDrop!(i, file)}
              onDropUrl={onFixedSlotDropUrl ? (url) => onFixedSlotDropUrl(i, url) : undefined}
              onAddFromLibrary={onFixedSlotAddFromLibrary ? () => onFixedSlotAddFromLibrary(i) : undefined}
              onAddFromFile={onFixedSlotAddFromFile ? () => onFixedSlotAddFromFile(i) : undefined}
              label={slotDef.label}
              disabled={disabled}
              showLabel
            />
          ))
        ) : (
          /* Video mode: always 5 fixed labeled slots */
          <>
            {refSlots.map((slot, i) => (
              <RefSlot
                key={i}
                url={slot.url}
                isVideo={slot.isVideo}
                onAdd={() => onAddRef(i)}
                onRemove={() => onRemoveRef(i)}
                onDrop={(file) => onDropRef(i, file)}
                onDropUrl={onDropRefUrl ? (url) => onDropRefUrl(i, url) : undefined}
                label={slot.label || `Ref ${i + 1}`}
                disabled={disabled}
                showLabel
              />
            ))}
          </>
        )}
      </div>

      {/* Desktop-only compact popover controls */}
      {onContentTypeChange && (
        <CompactPopover
          className="hidden md:inline-flex"
          label={contentType.toUpperCase()}
          options={['sfw', 'nsfw']}
          value={contentType}
          onSelect={(v) => onContentTypeChange(v as 'sfw' | 'nsfw')}
          renderLabel={(v) => v.toUpperCase()}
        />
      )}
      {onAspectRatioChange && (
        <CompactPopover
          className="hidden md:inline-flex"
          label={aspectRatio}
          options={['1:1', '16:9', '9:16'] as const}
          value={aspectRatio}
          onSelect={(v) => onAspectRatioChange(v as '16:9' | '1:1' | '9:16')}
        />
      )}
      {onBatchSizeChange && currentMode !== 'video' && (
        <CompactPopover
          className="hidden md:inline-flex"
          label={`${batchSize}×`}
          options={[1, 3, 6]}
          value={batchSize}
          onSelect={(v) => onBatchSizeChange(v as number)}
          renderLabel={(v) => `${v}×`}
        />
      )}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Model Selector Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 gap-1 text-xs font-normal max-w-[140px]"
          >
            <span className="truncate">{selectedModelName}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="min-w-[180px] max-w-[240px] p-1.5 z-[100] bg-popover border border-border shadow-lg"
        >
          {modelsLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto space-y-0.5">
              {/* Local model option */}
              {currentMode === 'image' && (
                <ModelDropdownItem
                  label="SDXL (Local)"
                  selected={selectedModel?.type === 'sdxl'}
                  onClick={() => onModelChange?.({ id: 'local-sdxl', type: 'sdxl', display_name: 'SDXL (Local)' })}
                />
              )}
              {currentMode === 'video' && (
                <ModelDropdownItem
                  label="WAN (Local)"
                  selected={selectedModel?.id === 'local-wan'}
                  onClick={() => onModelChange?.({ id: 'local-wan', type: 'sdxl', display_name: 'WAN (Local)' })}
                />
              )}
              {/* API models (filtered for i2i_multi when multi-ref active) */}
              {(currentMode === 'image'
                ? (multiRefActive
                    ? imageModels.filter(m => m.tasks?.includes('i2i_multi'))
                    : imageModels)
                : videoModels
              ).map((m) => (
                <ModelDropdownItem
                  key={m.id}
                  label={m.display_name}
                  selected={selectedModel?.id === m.id}
                  onClick={() => onModelChange?.({
                    id: m.id,
                    type: ('provider_name' in m ? m.provider_name : (m as any).api_providers?.name) || 'fal',
                    display_name: m.display_name,
                  })}
                />
              ))}
              {(currentMode === 'image' ? imageModels : videoModels).length === 0 && !modelsLoading && (
                <p className="text-[10px] text-muted-foreground text-center py-2">No models available</p>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      
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
