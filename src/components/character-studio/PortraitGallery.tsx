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
  Copy
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

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Portrait Versions</h3>
          <Badge variant="secondary" className="text-xs">
            {portraits.length}
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddNew}
          disabled={isGenerating || isNewCharacter}
          className="gap-1.5"
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Generate
        </Button>
      </div>

      {/* Gallery Grid */}
      {portraits.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {portraits.map((portrait) => {
            const isPrimary = portrait.id === primaryPortraitId || portrait.is_primary;
            const isSelected = portrait.id === selectedPortraitId;

            return (
              <div
                key={portrait.id}
                className={cn(
                  'group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer',
                  'border-2 transition-all duration-200',
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50',
                  isPrimary && 'ring-2 ring-yellow-500/30'
                )}
                onClick={() => {
                  const index = portraits.findIndex(p => p.id === portrait.id);
                  setLightboxIndex(index >= 0 ? index : 0);
                  setLightboxOpen(true);
                }}
              >
                {/* Image */}
                <img
                  src={portrait.thumbnail_url || portrait.image_url}
                  alt="Portrait version"
                  className="w-full h-full object-cover"
                />

                {/* Primary Badge */}
                {isPrimary && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-yellow-500/90 text-yellow-950 gap-1 text-xs">
                      <Star className="w-3 h-3 fill-current" />
                      Primary
                    </Badge>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  'flex flex-col justify-end p-2'
                )}>
                  {/* Quick Actions */}
                  <div className="flex items-center justify-between">
                    {!isPrimary && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetPrimary(portrait.id);
                        }}
                      >
                        <Star className="w-3 h-3" />
                        Set Primary
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 ml-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
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
                          className="text-destructive"
                          onClick={() => onDelete(portrait.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Tile */}
          <button
            onClick={onAddNew}
            disabled={isGenerating || isNewCharacter}
            className={cn(
              'aspect-[3/4] rounded-lg border-2 border-dashed border-border',
              'flex flex-col items-center justify-center gap-2',
              'text-muted-foreground hover:text-foreground hover:border-primary/50',
              'transition-colors duration-200',
              (isGenerating || isNewCharacter) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
            <span className="text-xs">
              {isGenerating ? 'Generating...' : 'Add Version'}
            </span>
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
              {isNewCharacter 
                ? 'Save your character first, then generate portraits'
                : 'Generate your first portrait to get started'
              }
            </p>
          </div>
          <Button 
            onClick={onAddNew} 
            disabled={isGenerating || isNewCharacter}
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
