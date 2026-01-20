import React, { useState, useEffect } from 'react';
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
import { urlSigningService } from '@/lib/services/UrlSigningService';

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
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Sign URLs for all portraits
  useEffect(() => {
    const signUrls = async () => {
      const urlsToSign: Record<string, string> = {};
      
      for (const portrait of portraits) {
        const imageUrl = portrait.thumbnail_url || portrait.image_url;
        if (!imageUrl) continue;
        
        // Check if URL needs signing (storage paths)
        if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
          try {
            const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
            const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
            urlsToSign[portrait.id] = signed;
          } catch (error) {
            console.error('Failed to sign portrait URL:', error);
            urlsToSign[portrait.id] = imageUrl;
          }
        } else {
          urlsToSign[portrait.id] = imageUrl;
        }
      }
      
      setSignedUrls(urlsToSign);
    };
    
    if (portraits.length > 0) {
      signUrls();
    }
  }, [portraits]);

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
      {/* Section Header - simplified with icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
          <span>{portraits.length}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddNew}
          disabled={isGenerating || isNewCharacter}
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

      {/* Gallery Grid */}
      {portraits.length > 0 ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          {portraits.map((portrait) => {
            const isPrimary = portrait.id === primaryPortraitId || portrait.is_primary;
            const isSelected = portrait.id === selectedPortraitId;

            return (
              <div
                key={portrait.id}
                className={cn(
                  "relative group cursor-pointer",
                  "aspect-[3/4]",
                  "rounded-lg overflow-hidden",
                  "bg-card border border-border",
                  "transition-all duration-200",
                  "hover:shadow-lg hover:scale-[1.01] hover:border-primary/50",
                  "shadow-sm",
                  isSelected && 'border-primary ring-2 ring-primary/20',
                  isPrimary && 'ring-2 ring-yellow-500/30'
                )}
                onClick={() => {
                  const index = portraits.findIndex(p => p.id === portrait.id);
                  setLightboxIndex(index >= 0 ? index : 0);
                  setLightboxOpen(true);
                }}
              >
                {/* Image container matching MobileCharacterCard */}
                <div className="relative w-full h-full">
                  <img
                    src={signedUrls[portrait.id] || portrait.thumbnail_url || portrait.image_url}
                    alt="Portrait version"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Top Row: Primary Badge (left) + Options Menu (right) - always visible */}
                <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between pointer-events-none">
                  {/* Primary Badge */}
                  {isPrimary ? (
                    <Badge className="bg-yellow-500/90 text-yellow-950 gap-0.5 text-[10px] px-1.5 py-0.5 pointer-events-auto">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span className="hidden sm:inline">Primary</span>
                    </Badge>
                  ) : (
                    <div /> // Spacer to keep menu aligned right
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
              </div>
            );
          })}

          {/* Add New Tile - icon only */}
          <button
            onClick={onAddNew}
            disabled={isGenerating || isNewCharacter}
            className={cn(
              'aspect-[3/4] rounded-lg border-2 border-dashed border-border',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:border-primary/50',
              'transition-colors duration-200',
              (isGenerating || isNewCharacter) && 'opacity-50 cursor-not-allowed'
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
