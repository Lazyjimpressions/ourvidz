import React, { useState, useCallback, useMemo } from 'react';
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
  ClipboardCopy,
  Lock,
  CheckSquare,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from '@/hooks/usePortraitVersions';
import { AssetTile } from '@/components/shared/AssetTile';
import { UnifiedLightbox, LightboxItem } from '@/components/shared/UnifiedLightbox';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { useToast } from '@/hooks/use-toast';

// ─── Sub-components ───

/** Wrapper that signs a portrait URL and renders an AssetTile */
const SignedPortraitTile: React.FC<{
  portrait: CharacterPortrait;
  className?: string;
  onClick: () => void;
  children?: React.ReactNode;
}> = ({ portrait, className, onClick, children }) => {
  const { signedUrl } = useSignedUrl(portrait.thumbnail_url || portrait.image_url);
  return (
    <AssetTile
      src={signedUrl}
      alt="Portrait version"
      aspectRatio="3/4"
      className={className}
      onClick={onClick}
    >
      {children}
    </AssetTile>
  );
};

// ─── Main Component ───

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
  onCopyPrompt?: (prompt: string) => void;
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
  onCopyPrompt,
  characterAppearanceTags = [],
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
    selectedPortraits.forEach((id) => onDelete(id));
    setSelectedPortraits(new Set());
    setSelectionMode(false);
  };

  const handleBulkDownload = async () => {
    for (const portrait of portraits.filter((p) => selectedPortraits.has(p.id))) {
      await handleDownload(portrait);
    }
  };

  const toggleSelection = (portraitId: string) => {
    const next = new Set(selectedPortraits);
    if (next.has(portraitId)) next.delete(portraitId);
    else next.add(portraitId);
    setSelectedPortraits(next);
  };

  const handlePortraitClick = (portrait: CharacterPortrait, index: number) => {
    if (selectionMode) {
      toggleSelection(portrait.id);
    } else {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  // Convert portraits to LightboxItem[]
  const lightboxItems: LightboxItem[] = useMemo(
    () =>
      portraits.map((p) => ({
        id: p.id,
        url: p.image_url,
        type: 'image' as const,
        prompt: p.prompt || p.enhanced_prompt || undefined,
        metadata: {
          ...(p.generation_metadata as Record<string, unknown> || {}),
          enhanced_prompt: p.enhanced_prompt,
        },
      })),
    [portraits]
  );

  // Sign original URL on demand for lightbox
  const handleRequireOriginal = useCallback(async (item: LightboxItem): Promise<string> => {
    const url = item.url;
    if (url.includes('user-library/') || url.includes('workspace-temp/')) {
      const bucket = url.includes('user-library/') ? 'user-library' : 'workspace-temp';
      return urlSigningService.getSignedUrl(url, bucket);
    }
    return url;
  }, []);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
          <span>{portraits.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {portraits.length > 0 && !selectionMode && (
            <Button variant="ghost" size="sm" onClick={() => setSelectionMode(true)} className="h-8 px-2 text-xs">
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              Select
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onAddNew} disabled={isGenerating} className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">Generate</span>
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectionMode && (
        <div className="flex items-center gap-1.5 p-1.5 bg-muted rounded-md">
          <span className="text-xs text-muted-foreground px-1">{selectedPortraits.size} selected</span>
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleBulkDelete} disabled={selectedPortraits.size === 0}>
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkDownload} disabled={selectedPortraits.size === 0}>
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => { setSelectionMode(false); setSelectedPortraits(new Set()); }}>
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
              <SignedPortraitTile
                key={portrait.id}
                portrait={portrait}
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
                      {isSelectedForBulk && <Check className="w-5 h-5 text-primary-foreground" />}
                    </div>
                  </div>
                )}

                {/* Top Row: Primary Badge + Options Menu */}
                {!selectionMode && (
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between pointer-events-none">
                    {isPrimary ? (
                      <Badge className="bg-amber-500/90 text-amber-950 gap-0.5 text-[10px] px-1.5 py-0.5 pointer-events-auto">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="hidden sm:inline">Primary</span>
                      </Badge>
                    ) : (
                      <div />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-6 w-6 p-0 pointer-events-auto bg-black/60 hover:bg-black/80 border-0" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-3.5 h-3.5 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
                        {!isPrimary && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetPrimary(portrait.id); }}>
                              <Star className="w-4 h-4 mr-2" />Set as Primary
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUseAsReference(portrait); }}>
                          <Lock className="w-4 h-4 mr-2" />Use as Reference
                        </DropdownMenuItem>
                        {(portrait.enhanced_prompt || portrait.prompt) && onCopyPrompt && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            const text = portrait.enhanced_prompt || portrait.prompt || '';
                            navigator.clipboard.writeText(text);
                            onCopyPrompt(text);
                          }}>
                            <ClipboardCopy className="w-4 h-4 mr-2" />Copy Prompt
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(portrait); }}>
                          <Download className="w-4 h-4 mr-2" />Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(portrait.id); }}>
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </SignedPortraitTile>
            );
          })}

          {/* Add New Tile */}
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
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
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
            <p className="text-xs text-muted-foreground mt-1">Generate your first portrait to get started</p>
          </div>
          <Button onClick={onAddNew} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate Portrait
          </Button>
        </div>
      )}

      {/* Unified Lightbox */}
      {lightboxOpen && portraits.length > 0 && (
        <UnifiedLightbox
          items={lightboxItems}
          startIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
          onRequireOriginalUrl={handleRequireOriginal}
          showPromptDetails={false}
          enableSwipeClose
          headerSlot={(item, index) => {
            const portrait = portraits[index];
            const isPrimary = portrait?.id === primaryPortraitId || portrait?.is_primary;
            return isPrimary ? (
              <Badge className="bg-yellow-500/90 text-yellow-950 gap-1">
                <Star className="w-3 h-3 fill-current" />
                Primary
              </Badge>
            ) : null;
          }}
          bottomSlot={(item, index) => (
            <PortraitLightboxBottomPanel
              portrait={portraits[index]}
              isPrimary={portraits[index]?.id === primaryPortraitId || portraits[index]?.is_primary}
              characterAppearanceTags={characterAppearanceTags}
              onRegenerate={(prompt, refUrl) => {
                onRegenerate?.(prompt, refUrl);
                setLightboxOpen(false);
              }}
              onUseAsReference={(p) => {
                onUseAsReference(p);
                setLightboxOpen(false);
              }}
              onDownload={handleDownload}
              onSetPrimary={onSetPrimary}
              onDelete={(id) => {
                onDelete(id);
                if (portraits.length <= 1) {
                  setLightboxOpen(false);
                } else if (lightboxIndex >= portraits.length - 1) {
                  setLightboxIndex(lightboxIndex - 1);
                }
              }}
            />
          )}
        />
      )}
    </div>
  );
}

// ─── Portrait Lightbox Bottom Panel ───
// Extracted from old PortraitLightbox — contains prompt editor + action buttons

interface PortraitLightboxBottomPanelProps {
  portrait: CharacterPortrait;
  isPrimary: boolean;
  characterAppearanceTags: string[];
  onRegenerate: (prompt: string, referenceUrl: string) => void;
  onUseAsReference: (portrait: CharacterPortrait) => void;
  onDownload: (portrait: CharacterPortrait) => void;
  onSetPrimary: (portraitId: string) => void;
  onDelete: (portraitId: string) => void;
}

function PortraitLightboxBottomPanel({
  portrait,
  isPrimary,
  characterAppearanceTags,
  onRegenerate,
  onUseAsReference,
  onDownload,
  onSetPrimary,
  onDelete,
}: PortraitLightboxBottomPanelProps) {
  const [editablePrompt, setEditablePrompt] = useState(portrait.prompt || portrait.enhanced_prompt || '');
  const [showMetadata, setShowMetadata] = useState(false);
  const { toast } = useToast();

  // Sync prompt when portrait changes
  React.useEffect(() => {
    setEditablePrompt(portrait.prompt || portrait.enhanced_prompt || '');
  }, [portrait.id]);

  const meta = portrait.generation_metadata as Record<string, unknown> | null;

  return (
    <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-4 pb-safe space-y-4 max-w-2xl mx-auto">
      {/* Prompt Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-white/70 text-xs">Edit Prompt</Label>
          {portrait.prompt && (
            <Button variant="ghost" size="sm" onClick={() => setEditablePrompt(portrait.prompt || '')} className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10">
              Reset
            </Button>
          )}
        </div>
        <Textarea
          value={editablePrompt}
          onChange={(e) => setEditablePrompt(e.target.value)}
          placeholder="Describe changes for a new version..."
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm resize-none"
          rows={2}
        />
      </div>

      {/* Appearance Tags */}
      {characterAppearanceTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {characterAppearanceTags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs border-white/30 text-white/70 bg-white/5">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Generation Metadata */}
      {meta && (
        <div className="space-y-1.5">
          <button onClick={() => setShowMetadata(!showMetadata)} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
            <Info className="w-3.5 h-3.5" />
            <span>Generation Details</span>
            {showMetadata ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          {showMetadata && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white/5 rounded-md p-2.5">
              {(meta.model as string) && (
                <><span className="text-white/40">Model</span><span className="text-white/80 font-medium">{meta.model as string}</span></>
              )}
              {(meta.generation_mode as string) && (
                <><span className="text-white/40">Mode</span><span className="text-white/80">{(meta.generation_mode as string) === 'txt2img' ? 'Text to Image' : (meta.generation_mode as string) === 'i2i' ? 'Image to Image' : meta.generation_mode as string}</span></>
              )}
              {(meta.generation_time_ms as number) != null && (
                <><span className="text-white/40">Gen Time</span><span className="text-white/80">{((meta.generation_time_ms as number) / 1000).toFixed(1)}s</span></>
              )}
              {(meta.model_key as string) && (
                <><span className="text-white/40">Model Key</span><span className="text-white/80 truncate" title={meta.model_key as string}>{(meta.model_key as string).split('/').pop()}</span></>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <Button onClick={() => { if (editablePrompt.trim()) onRegenerate(editablePrompt.trim(), portrait.image_url); }} disabled={!editablePrompt.trim()} className="gap-2 flex-1 sm:flex-none bg-primary hover:bg-primary/90">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Regenerate</span>
            <span className="sm:hidden">Regen</span>
          </Button>
          <Button variant="default" onClick={() => { onUseAsReference(portrait); toast({ title: 'Reference Image Set', description: 'New portraits will match this style', duration: 3000 }); }} className="gap-2 flex-1 sm:flex-none">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Set as Reference Image</span>
            <span className="sm:hidden">Set Ref</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 justify-between sm:justify-end sm:flex-1">
          {!isPrimary && (
            <Button variant="ghost" size="sm" onClick={() => onSetPrimary(portrait.id)} className="gap-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Set Primary</span>
              <span className="sm:hidden">Primary</span>
            </Button>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" onClick={() => onDownload(portrait)} className="text-white/70 hover:text-white hover:bg-white/10">
              <Download className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(portrait.id)} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
