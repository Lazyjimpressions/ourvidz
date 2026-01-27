import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Star,
  Trash2,
  MoreVertical,
  Image as ImageIcon,
  Loader2,
  Download,
  Copy,
  CheckSquare,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from '@/hooks/usePortraitVersions';
import { PortraitLightbox } from './PortraitLightbox';
import { PortraitTile } from '@/components/shared/PortraitTile';

interface PortraitGalleryProps {
  portraits: CharacterPortrait[];
  primaryPortraitId?: string;
  selectedPortraitId: string | null;
  isGenerating: boolean;
  isNewCharacter: boolean;
  onSelect: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onUseAsReference: (portrait: CharacterPortrait) => void;
  onRegenerate?: (prompt: string, referenceUrl: string) => void;
  characterAppearanceTags?: string[];
}

export function PortraitGallery({
  portraits,
  primaryPortraitId,
  selectedPortraitId,
  isGenerating,
  isNewCharacter,
  onSelect,
  onSetPrimary,
  onDelete,
  onAddNew,
  onUseAsReference,
  onRegenerate,
  characterAppearanceTags = []
}: PortraitGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPortraits, setSelectedPortraits] = useState<Set<string>>(new Set());

  const handleDownload = async (portrait: CharacterPortrait) => {
    try {
      const response = await fetch(portrait.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portrait-${portrait.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleBulkDelete = () => {
    selectedPortraits.forEach(id => onDelete(id));
    setSelectedPortraits(new Set());
    setSelectionMode(false);
  };

  const handleBulkDownload = async () => {
    const selectedPortraitObjects = portraits.filter(p => selectedPortraits.has(p.id));
    for (const portrait of selectedPortraitObjects) {
      await handleDownload(portrait);
    }
  };

  const toggleSelection = (portraitId: string) => {
    const newSelection = new Set(selectedPortraits);
    if (newSelection.has(portraitId)) {
      newSelection.delete(portraitId);
    } else {
      newSelection.add(portraitId);
    }
    setSelectedPortraits(newSelection);
  };

  const handlePortraitClick = (portrait: CharacterPortrait, index: number) => {
    if (selectionMode) {
      toggleSelection(portrait.id);
    } else {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header - simplified with icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
          <span>{portraits.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {portraits.length > 0 && !selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectionMode(true)}
              className="h-8 px-2 text-xs"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              Select
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddNew}
            disabled={isGenerating}
            className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Generate</span>
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar - Compact */}
      {selectionMode && (
        <div className="flex items-center gap-1.5 p-1.5 bg-muted rounded-md">
          <span className="text-xs text-muted-foreground px-1">
            {selectedPortraits.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBulkDelete}
            disabled={selectedPortraits.size === 0}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBulkDownload}
            disabled={selectedPortraits.size === 0}
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => {
              setSelectionMode(false);
              setSelectedPortraits(new Set());
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Gallery Grid */}
      {portraits.length > 0 ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          {portraits.map((portrait, index) => {
            const isPrimary = portrait.id === primaryPortraitId || portrait.is_primary;
            const isSelected = portrait.id === selectedPortraitId;
            const isSelectedForBulk = selectedPortraits.has(portrait.id);

            return (
              <PortraitTile
                key={portrait.id}
                imageUrl={portrait.thumbnail_url || portrait.image_url}
                alt="Portrait version"
                className={cn(
                  isSelected && !selectionMode && 'border-primary ring-2 ring-primary/20',
                  isPrimary && !selectionMode && 'ring-2 ring-amber-500/30',
                  isSelectedForBulk && selectionMode && 'ring-2 ring-primary/50 border-primary'
                )}
                onClick={() => handlePortraitClick(portrait, index)}
              >
                {/* Selection Checkmark Overlay */}
                {selectionMode && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                      isSelectedForBulk ? 'bg-primary' : 'bg-black/60 border-2 border-white'
                    )}>
                      {isSelectedForBulk && (
                        <Check className="w-5 h-5 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                )}

                {/* Top Row: Primary Badge (left) + Options Menu (right) - hidden in selection mode */}
                {!selectionMode && (
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between pointer-events-none">
                    {/* Primary Badge */}
                    {isPrimary ? (
                      <Badge className="bg-amber-500/90 text-amber-950 gap-0.5 text-[10px] px-1.5 py-0.5 pointer-events-auto">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="hidden sm:inline">Primary</span>
                      </Badge>
                    ) : (
                      <div /> /* Spacer */
                    )}

                    {/* Options Menu - always visible for accessibility */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 w-6 p-0 pointer-events-auto bg-black/60 hover:bg-black/80 border-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
                        {!isPrimary && (
                          <>
                            <DropdownMenuItem onClick={() => onSetPrimary(portrait.id)}>
                              <Star className="w-4 h-4 mr-2" />
                              Set as Primary
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => onUseAsReference(portrait)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Use as Reference
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(portrait)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(portrait.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </PortraitTile>
            );
          })}

          {/* Add New Tile - icon only */}
          <button
            onClick={onAddNew}
            disabled={isGenerating}
            className={cn(
              'aspect-[3/4] rounded-lg border-2 border-dashed border-border',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:border-primary/50',
              'transition-colors duration-200',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className={cn(
          'border-2 border-dashed border-border rounded-lg',
          'flex flex-col items-center justify-center gap-3 py-12 px-4',
          'text-center'
        )}>
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">No portraits yet</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Generate your first portrait to get started
            </p>
          </div>
          <Button
            onClick={onAddNew}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Generate Portrait
          </Button>
        </div>
      )}

      {/* Portrait Lightbox */}
      {lightboxOpen && portraits.length > 0 && (
        <PortraitLightbox
          portraits={portraits}
          currentIndex={lightboxIndex}
          primaryPortraitId={primaryPortraitId}
          characterAppearanceTags={characterAppearanceTags}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
          onRegenerate={(prompt, refUrl) => {
            onRegenerate?.(prompt, refUrl);
            setLightboxOpen(false);
          }}
          onUseAsReference={(portrait) => {
            onUseAsReference(portrait);
            setLightboxOpen(false);
          }}
          onDownload={handleDownload}
          onSetPrimary={onSetPrimary}
          onDelete={(id) => {
            onDelete(id);
            // Adjust index if needed
            if (portraits.length <= 1) {
              setLightboxOpen(false);
            } else if (lightboxIndex >= portraits.length - 1) {
              setLightboxIndex(lightboxIndex - 1);
            }
          }}
        />
      )}
    </div>
  );
}
