import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Star,
  Trash2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from '@/hooks/usePortraitVersions';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { useToast } from '@/hooks/use-toast';

interface PortraitLightboxProps {
  portraits: CharacterPortrait[];
  currentIndex: number;
  primaryPortraitId?: string;
  characterAppearanceTags?: string[];
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onRegenerate: (prompt: string, referenceUrl: string) => void;
  onUseAsReference: (portrait: CharacterPortrait) => void;
  onDownload: (portrait: CharacterPortrait) => void;
  onSetPrimary: (portraitId: string) => void;
  onDelete: (portraitId: string) => void;
}

export function PortraitLightbox({
  portraits,
  currentIndex,
  primaryPortraitId,
  characterAppearanceTags = [],
  onClose,
  onIndexChange,
  onRegenerate,
  onUseAsReference,
  onDownload,
  onSetPrimary,
  onDelete
}: PortraitLightboxProps) {
  const [editablePrompt, setEditablePrompt] = useState('');
  const [showPanel, setShowPanel] = useState(true);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const [signedImageUrl, setSignedImageUrl] = useState<string>('');
  const [showHints, setShowHints] = useState(() => {
    return !localStorage.getItem('lightbox-hints-dismissed');
  });

  const currentPortrait = portraits[currentIndex];
  const isPrimary = currentPortrait?.id === primaryPortraitId || currentPortrait?.is_primary;

  const dismissHints = () => {
    setShowHints(false);
    localStorage.setItem('lightbox-hints-dismissed', 'true');
  };

  // Sign the current portrait URL
  useEffect(() => {
    const signUrl = async () => {
      if (!currentPortrait?.image_url) {
        setSignedImageUrl('');
        return;
      }
      
      const imageUrl = currentPortrait.image_url;
      
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
        try {
          const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
          const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
          setSignedImageUrl(signed);
        } catch (error) {
          console.error('Failed to sign lightbox image URL:', error);
          setSignedImageUrl(imageUrl);
        }
      } else {
        setSignedImageUrl(imageUrl);
      }
    };
    
    signUrl();
  }, [currentPortrait?.image_url]);

  // Initialize prompt from current portrait
  useEffect(() => {
    if (currentPortrait) {
      setEditablePrompt(currentPortrait.prompt || currentPortrait.enhanced_prompt || '');
    }
  }, [currentPortrait]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, onClose]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : portraits.length - 1;
    onIndexChange(newIndex);
  }, [currentIndex, portraits.length, onIndexChange]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex < portraits.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  }, [currentIndex, portraits.length, onIndexChange]);

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    
    // Horizontal swipe (navigation)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
    // Vertical swipe down (close)
    else if (deltaY > 60 && Math.abs(deltaY) > Math.abs(deltaX)) {
      onClose();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleRegenerate = () => {
    if (!currentPortrait || !editablePrompt.trim()) return;
    onRegenerate(editablePrompt.trim(), currentPortrait.image_url);
    onClose();
  };

  const handleDownload = async () => {
    if (!currentPortrait) return;
    onDownload(currentPortrait);
  };

  if (!currentPortrait) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={(e) => {
        // Close when clicking backdrop (not on controls)
        if (e.target === e.currentTarget) {
          setShowPanel(!showPanel);
        }
      }}
    >
      {/* Header */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between",
        "bg-gradient-to-b from-black/80 to-transparent",
        "transition-opacity duration-200",
        !showPanel && "opacity-0 pointer-events-none"
      )}>
        {/* Counter */}
        {portraits.length > 1 && (
          <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            {currentIndex + 1} / {portraits.length}
          </div>
        )}
        
        {/* Primary Badge */}
        {isPrimary && (
          <Badge className="bg-yellow-500/90 text-yellow-950 gap-1">
            <Star className="w-3 h-3 fill-current" />
            Primary
          </Badge>
        )}
        
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 ml-auto"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Image Container */}
      <div 
        className="flex-1 flex flex-col items-center justify-center p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowPanel(!showPanel)}
      >
        {/* Constrained image wrapper */}
        <div className="relative w-full h-full max-w-4xl max-h-[calc(100vh-200px)] flex items-center justify-center">
          <img
            src={signedImageUrl || currentPortrait.image_url}
            alt="Portrait"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
        
        {/* Mobile Navigation Dots - outside image wrapper */}
        {portraits.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4 md:hidden" onClick={(e) => e.stopPropagation()}>
            {portraits.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onIndexChange(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  idx === currentIndex 
                    ? "bg-white w-4" 
                    : "bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to portrait ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Arrows (Desktop) */}
      {portraits.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-50",
              "hidden md:flex",
              "w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white",
              "transition-opacity duration-200 pointer-events-auto",
              !showPanel && "opacity-0 pointer-events-none"
            )}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-50",
              "hidden md:flex",
              "w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white",
              "transition-opacity duration-200 pointer-events-auto",
              !showPanel && "opacity-0 pointer-events-none"
            )}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </>
      )}

      {/* Bottom Panel */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10",
        "bg-gradient-to-t from-black via-black/95 to-transparent",
        "transition-transform duration-300 ease-out",
        !showPanel && "translate-y-full"
      )}>
        {/* Toggle Panel Button */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="absolute -top-8 left-1/2 -translate-x-1/2 p-2 text-white/70 hover:text-white"
        >
          {showPanel ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>

        <div className="p-4 pb-safe space-y-4 max-w-2xl mx-auto">
          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white/70 text-xs">Edit Prompt</Label>
              {currentPortrait.prompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditablePrompt(currentPortrait.prompt || '')}
                  className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
                >
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
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs border-white/30 text-white/70 bg-white/5"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons - Mobile optimized 2-row layout */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Primary actions row */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRegenerate} 
                disabled={!editablePrompt.trim()}
                className="gap-2 flex-1 sm:flex-none bg-primary hover:bg-primary/90"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Regenerate</span>
                <span className="sm:hidden">Regen</span>
              </Button>
              
              <Button
                variant="default"
                onClick={() => {
                  onUseAsReference(currentPortrait);
                  toast({
                    title: 'Reference Image Set',
                    description: 'New portraits will match this style',
                    duration: 3000
                  });
                  onClose();
                }}
                className="gap-2 flex-1 sm:flex-none"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Set as Reference Image</span>
                <span className="sm:hidden">Set Ref</span>
              </Button>
            </div>
            
            {/* Secondary actions row */}
            <div className="flex items-center gap-2 justify-between sm:justify-end sm:flex-1">
              {!isPrimary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetPrimary(currentPortrait.id)}
                  className="gap-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Set Primary</span>
                  <span className="sm:hidden">Primary</span>
                </Button>
              )}
              
              <div className="flex items-center gap-1 ml-auto">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleDownload}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    onDelete(currentPortrait.id);
                    if (portraits.length <= 1) {
                      onClose();
                    } else if (currentIndex >= portraits.length - 1) {
                      onIndexChange(currentIndex - 1);
                    }
                  }}
                  className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Hints Overlay - First Time Only */}
      {showHints && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <div className="bg-background p-4 rounded-lg max-w-xs space-y-2 mx-4">
            <h3 className="text-sm font-semibold">Navigation Tips</h3>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="shrink-0">←  →</span>
                <span>Arrow keys to navigate</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0">👆</span>
                <span>Click image to hide controls</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0">👉</span>
                <span>Swipe left/right on mobile</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0">ESC</span>
                <span>Close lightbox</span>
              </li>
            </ul>
            <Button
              size="sm"
              className="w-full h-7 text-xs mt-3"
              onClick={dismissHints}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}