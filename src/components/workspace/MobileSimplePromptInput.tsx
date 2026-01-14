import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import heic2any from 'heic2any';
import { useImageModels } from '@/hooks/useImageModels';
import { useVideoModels } from '@/hooks/useApiModels';
import { useVideoModelSettings } from '@/hooks/useVideoModelSettings';
import { MobileQuickBar } from './MobileQuickBar';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import { detectImageType, looksLikeImage, isHeicType, normalizeExtension } from '@/utils/imageTypeDetection';
import { uploadAndSignReferenceImage } from '@/lib/storage';

// Detect iOS Safari for special handling
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

export interface MobileSimplePromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: (prompt: string, options?: any) => void;
  isGenerating: boolean;
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
  selectedModel: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string } | null;
  onModelChange: (model: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string }) => void;
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
  onReferenceImageSet?: (file: File, type: 'single' | 'start' | 'end') => void;
  onReferenceImageUrlSet?: (url: string, type: 'single' | 'start' | 'end') => void;
  onReferenceImageRemove?: (type: 'single' | 'start' | 'end') => void;
  referenceImage?: File | null;
  referenceImageUrl?: string | null;
  beginningRefImage?: File | null;
  beginningRefImageUrl?: string | null;
  endingRefImage?: File | null;
  endingRefImageUrl?: string | null;
  contentType?: 'sfw' | 'nsfw';
  onContentTypeChange?: (type: 'sfw' | 'nsfw') => void;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  exactCopyMode?: boolean;
  onExactCopyModeChange?: (mode: boolean) => void;
  referenceStrength?: number;
  onReferenceStrengthChange?: (strength: number) => void;
  onClearWorkspace?: () => void;
  onDeleteAllWorkspace?: () => void;
}

export const MobileSimplePromptInput: React.FC<MobileSimplePromptInputProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  currentMode = 'image',
  onModeToggle,
  selectedModel,
  onModelChange,
  quality,
  onQualityChange,
  onReferenceImageSet,
  onReferenceImageUrlSet,
  onReferenceImageRemove,
  referenceImage,
  referenceImageUrl,
  beginningRefImage,
  beginningRefImageUrl,
  endingRefImage,
  endingRefImageUrl,
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  onCollapsedChange,
  exactCopyMode = false,
  onExactCopyModeChange,
  referenceStrength = 0.8,
  onReferenceStrengthChange,
  onClearWorkspace,
  onDeleteAllWorkspace
}) => {
  const hasReferenceImage = !!referenceImage || !!referenceImageUrl;
  const { imageModels = [], isLoading: modelsLoading } = useImageModels(hasReferenceImage);
  const { data: videoModels, isLoading: videoModelsLoading } = useVideoModels();
  
  // Get video model settings for selected model
  const videoModelSettings = useVideoModelSettings(
    currentMode === 'video' && selectedModel?.type === 'fal' ? selectedModel.id : null
  );
  
  // Settings sheet state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // File input refs for reference images
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileTypeRef = useRef<'single' | 'start' | 'end'>('single');

  // Notify parent of settings sheet state (for keyboard handling)
  React.useEffect(() => {
    onCollapsedChange?.(isSettingsOpen);
  }, [isSettingsOpen, onCollapsedChange]);

  const handleFileSelect = (type: 'single' | 'start' | 'end') => {
    pendingFileTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = pendingFileTypeRef.current;
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (!file) return;

    console.log('📱 MOBILE: File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isIOS
    });

    // Magic byte detection for MIME type
    let detectedMime: string | null = null;
    let arrayBuffer: ArrayBuffer;
    
    try {
      arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer.slice(0, 16));
      const detected = detectImageType(bytes);
      detectedMime = detected?.mime || null;
    } catch (error) {
      console.error('❌ MOBILE: Failed to read file bytes:', error);
      toast.error('Failed to read image file');
      return;
    }

    let effectiveMime = detectedMime || file.type;
    if (!effectiveMime || !effectiveMime.startsWith('image/')) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extMap: Record<string, string> = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png', 'gif': 'image/gif',
        'webp': 'image/webp', 'heic': 'image/heic', 'heif': 'image/heif'
      };
      effectiveMime = ext ? extMap[ext] || '' : '';
    }

    if (!effectiveMime.startsWith('image/') && !looksLikeImage(file)) {
      toast.error('Selected file is not a supported image');
      return;
    }

    // HEIC conversion
    const needsHeicConversion = isHeicType(detectedMime) || isHeicType(effectiveMime);
    let processedFile: File = file;
    let processedMime = effectiveMime;

    if (needsHeicConversion) {
      try {
        const result = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.92
        });
        const blob = Array.isArray(result) ? result[0] : result;
        processedFile = new File(
          [blob], 
          file.name.replace(/\.(heic|heif)$/i, '.jpg'), 
          { type: 'image/jpeg', lastModified: Date.now() }
        );
        processedMime = 'image/jpeg';
        arrayBuffer = await processedFile.arrayBuffer();
        toast.success('Image converted from HEIC to JPEG');
      } catch (error) {
        toast.error(isIOS 
          ? 'iOS tip: Try selecting a JPEG or PNG photo instead of HEIC'
          : 'Failed to convert HEIC image.');
        return;
      }
    }

    // Size validation
    const maxSize = 10 * 1024 * 1024;
    if (processedFile.size > maxSize) {
      toast.error('Image is too large. Maximum size is 10MB.');
      return;
    }

    // Persist and upload
    try {
      const finalMime = processedMime.startsWith('image/') ? processedMime : 'image/jpeg';
      const persistedBlob = new Blob([arrayBuffer], { type: finalMime });
      const normalizedName = normalizeExtension(processedFile.name, finalMime);
      const persistedFile = new File([persistedBlob], normalizedName, {
        type: finalMime,
        lastModified: Date.now()
      });

      // Validate image loads
      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image failed to load'));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(persistedFile);
      });
      
      // Upload immediately
      try {
        const signedUrl = await uploadAndSignReferenceImage(persistedFile);
        
        if (onReferenceImageUrlSet) {
          onReferenceImageUrlSet(signedUrl, type);
        } else if (onReferenceImageSet) {
          onReferenceImageSet(persistedFile, type);
        }
        
        toast.success(`${type === 'single' ? 'Reference' : type === 'start' ? 'Start frame' : 'End frame'} image uploaded`);
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
        if (errorMessage.includes('authenticated')) {
          toast.error('Your session expired. Please refresh the page.');
        } else {
          toast.error(`Upload failed: ${errorMessage}`);
        }
        return;
      }
    } catch (error) {
      toast.error(isIOS 
        ? 'Failed to load image on iOS. Try a different photo.'
        : 'Invalid image file.');
      return;
    }
  };

  const removeReferenceImage = (type: 'single' | 'start' | 'end') => {
    onReferenceImageRemove?.(type);
    toast.success('Reference image removed');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating) {
      toast.info('Generation in progress, please wait...');
      return;
    }
    
    const hasReference = !!referenceImage || !!referenceImageUrl;
    const canGenerateWithExactCopy = exactCopyMode && hasReference;
    
    if (!prompt.trim() && !canGenerateWithExactCopy) {
      toast.error('Enter a prompt or use copy mode with a reference image');
      return;
    }
    
    toast.success('Starting generation...', { duration: 2000 });

    onGenerate(prompt.trim(), { 
      mode: currentMode,
      selectedModel,
      quality,
      exactCopyMode
    });
  };

  // Determine which reference is set for indicator
  const displayReferenceUrl = currentMode === 'image' 
    ? referenceImageUrl 
    : beginningRefImageUrl;
  const hasDisplayReference = currentMode === 'image'
    ? (!!referenceImage || !!referenceImageUrl)
    : (!!beginningRefImage || !!beginningRefImageUrl);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-[env(safe-area-inset-bottom)]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />
      
      {/* Quick Bar */}
      <MobileQuickBar
        currentMode={currentMode}
        onModeToggle={onModeToggle}
        selectedModelName={selectedModel?.display_name || 'Select Model'}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasReferenceImage={hasDisplayReference}
        referenceImageUrl={displayReferenceUrl}
        onRemoveReference={() => removeReferenceImage(currentMode === 'image' ? 'single' : 'start')}
        disabled={isGenerating}
      />
      
      {/* Prompt Input + Generate Button */}
      <form onSubmit={handleSubmit} className="px-3 pb-3 space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={exactCopyMode && hasDisplayReference 
            ? "Optional: Describe modifications (or leave blank for exact copy)" 
            : "Describe what you want to create..."
          }
          className="min-h-[60px] max-h-[120px] resize-none text-base"
          disabled={isGenerating}
        />
        
        <Button
          type="submit"
          size="lg"
          className="w-full min-h-[48px] gap-2 text-base font-medium"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate
            </>
          )}
        </Button>
      </form>
      
      {/* Settings Bottom Sheet */}
      <MobileSettingsSheet
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentMode={currentMode}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        imageModels={imageModels?.map(m => ({
          id: m.id,
          display_name: m.display_name,
          provider_name: m.provider_name,
          capabilities: m.capabilities as any
        }))}
        videoModels={videoModels || []}
        modelsLoading={modelsLoading || videoModelsLoading}
        quality={quality}
        onQualityChange={onQualityChange}
        aspectRatio={aspectRatio}
        onAspectRatioChange={onAspectRatioChange || (() => {})}
        contentType={contentType}
        onContentTypeChange={onContentTypeChange || (() => {})}
        referenceImage={referenceImage}
        referenceImageUrl={referenceImageUrl}
        onReferenceImageSelect={() => handleFileSelect('single')}
        onReferenceImageRemove={() => removeReferenceImage('single')}
        exactCopyMode={exactCopyMode}
        onExactCopyModeChange={onExactCopyModeChange}
        referenceStrength={referenceStrength}
        onReferenceStrengthChange={onReferenceStrengthChange}
        beginningRefImage={beginningRefImage}
        beginningRefImageUrl={beginningRefImageUrl}
        endingRefImage={endingRefImage}
        endingRefImageUrl={endingRefImageUrl}
        onStartFrameSelect={() => handleFileSelect('start')}
        onEndFrameSelect={() => handleFileSelect('end')}
        onStartFrameRemove={() => removeReferenceImage('start')}
        onEndFrameRemove={() => removeReferenceImage('end')}
        videoReferenceMode={(videoModelSettings?.settings?.referenceMode === 'dual' ? 'dual' : 'single')}
        onClearWorkspace={onClearWorkspace}
        onDeleteAllWorkspace={onDeleteAllWorkspace}
      />
    </div>
  );
};
