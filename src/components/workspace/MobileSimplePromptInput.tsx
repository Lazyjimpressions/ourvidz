
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Camera, Video, Upload, X, Image, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import heic2any from 'heic2any';
import { useImageModels } from '@/hooks/useImageModels';
import { useVideoModels } from '@/hooks/useApiModels';
import { useVideoModelSettings } from '@/hooks/useVideoModelSettings';
import { MobileReferenceImagePreview } from './MobileReferenceImagePreview';
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
  onReferenceImageUrlSet?: (url: string, type: 'single' | 'start' | 'end') => void; // NEW: For immediate upload workflow
  onReferenceImageRemove?: (type: 'single' | 'start' | 'end') => void;
  referenceImage?: File | null; // NEW: Sync with hook state
  referenceImageUrl?: string | null; // URL fallback for workspace images
  beginningRefImage?: File | null; // NEW: Sync with hook state
  beginningRefImageUrl?: string | null; // URL fallback for video start frame
  endingRefImage?: File | null; // NEW: Sync with hook state
  endingRefImageUrl?: string | null; // URL fallback for video end frame
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
  referenceImage, // NEW: Use hook state instead of local state
  referenceImageUrl, // URL fallback for workspace images
  beginningRefImage, // NEW: Use hook state
  beginningRefImageUrl, // URL fallback for video start frame
  endingRefImage, // NEW: Use hook state
  endingRefImageUrl, // URL fallback for video end frame
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
  // Use hook state for reference images instead of local state
  const hasReferenceImage = !!referenceImage;
  const { imageModels = [], isLoading: modelsLoading } = useImageModels(
    hasReferenceImage  // Pass reference state for dynamic filtering
  );
  const { data: videoModels, isLoading: videoModelsLoading } = useVideoModels();
  
  // Get video model settings for selected model (dynamic reference mode)
  const videoModelSettings = useVideoModelSettings(
    currentMode === 'video' && selectedModel?.type === 'fal' ? selectedModel.id : null
  );
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use a hidden file input in the DOM for iOS reliability
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileTypeRef = useRef<'single' | 'start' | 'end'>('single');

  const handleExpandedChange = (expanded: boolean) => {
    setIsExpanded(expanded);
    onCollapsedChange?.(expanded);
  };

  const handleFileSelect = (type: 'single' | 'start' | 'end') => {
    pendingFileTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = pendingFileTypeRef.current;
    
    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (!file) return;

    console.log('📱 MOBILE: File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      isIOS
    });

    // CRITICAL: Use magic byte detection instead of relying on file.type
    // iOS Safari often returns empty file.type
    let detectedMime: string | null = null;
    let arrayBuffer: ArrayBuffer;
    
    try {
      arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer.slice(0, 16));
      const detected = detectImageType(bytes);
      detectedMime = detected?.mime || null;
      
      console.log('🔍 MOBILE: Magic byte detection:', {
        browserType: file.type,
        detectedMime,
        fileName: file.name
      });
    } catch (error) {
      console.error('❌ MOBILE: Failed to read file bytes:', error);
      toast.error('Failed to read image file');
      return;
    }

    // Determine effective MIME type: detected > browser > extension guess
    let effectiveMime = detectedMime || file.type;
    if (!effectiveMime || !effectiveMime.startsWith('image/')) {
      // Fallback to extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extMap: Record<string, string> = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png', 'gif': 'image/gif',
        'webp': 'image/webp', 'heic': 'image/heic', 'heif': 'image/heif'
      };
      effectiveMime = ext ? extMap[ext] || '' : '';
    }

    // Final validation: must look like an image
    if (!effectiveMime.startsWith('image/') && !looksLikeImage(file)) {
      console.error('❌ MOBILE: Not an image:', { browserType: file.type, detectedMime, fileName: file.name });
      toast.error('Selected file is not a supported image');
      return;
    }

    // Check if HEIC/HEIF by bytes (not just filename)
    const needsHeicConversion = isHeicType(detectedMime) || isHeicType(effectiveMime);
    let processedFile: File = file;
    let processedMime = effectiveMime;

    if (needsHeicConversion) {
      console.log('🔄 MOBILE: Converting HEIC/HEIF to JPEG using heic2any...');
      try {
        const convertedFile = await convertHeicToJpeg(file);
        processedFile = convertedFile;
        processedMime = 'image/jpeg';
        console.log('✅ MOBILE: HEIC converted to JPEG:', {
          originalSize: file.size,
          convertedSize: convertedFile.size,
          newType: convertedFile.type
        });
        toast.success('Image converted from HEIC to JPEG');
        // Re-read arrayBuffer from converted file
        arrayBuffer = await convertedFile.arrayBuffer();
      } catch (error) {
        console.error('❌ MOBILE: Failed to convert HEIC:', error);
        toast.error(isIOS 
          ? 'iOS tip: Try selecting a JPEG or PNG photo instead of HEIC'
          : 'Failed to convert HEIC image. Please try a JPEG or PNG image.');
        return;
      }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (processedFile.size > maxSize) {
      console.error('❌ MOBILE: File too large:', processedFile.size);
      toast.error('Image is too large. Maximum size is 10MB.');
      return;
    }

    // CRITICAL FOR iOS: Persist file data and normalize MIME type
    try {
      console.log('📱 MOBILE: Persisting file data for iOS compatibility...');
      
      // If we didn't convert, use the original buffer
      if (!needsHeicConversion) {
        // arrayBuffer already read above
      }
      
      // Create blob with correct MIME type (fixes empty file.type on iOS)
      const finalMime = processedMime.startsWith('image/') ? processedMime : 'image/jpeg';
      const persistedBlob = new Blob([arrayBuffer], { type: finalMime });
      
      // Normalize filename extension
      const normalizedName = normalizeExtension(processedFile.name, finalMime);
      
      // Create a new File with correct type
      const persistedFile = new File([persistedBlob], normalizedName, {
        type: finalMime,
        lastModified: Date.now()
      });

      // Validate using data URL (more iOS-stable than blob URL)
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
      
      console.log('✅ MOBILE: File persisted and validated:', {
        fileName: persistedFile.name,
        fileSize: persistedFile.size,
        fileType: persistedFile.type,
        originalBrowserType: file.type,
        detectedMime,
        type
      });
      
      // CRITICAL FIX: Upload immediately instead of storing File object
      // This fixes iPhone persistence issues - File objects may not persist on iOS
      console.log('📤 MOBILE: Uploading reference image immediately (iPhone fix)...');
      
      // Don't pre-check auth - let upload function handle it (matches desktop behavior)
      // The upload function has robust auth checking with fallbacks
      try {
        const signedUrl = await uploadAndSignReferenceImage(persistedFile);
        console.log('✅ MOBILE: Reference image uploaded and signed:', signedUrl.substring(0, 60) + '...');
        
        // Store signed URL via new callback (preferred)
        if (onReferenceImageUrlSet) {
          onReferenceImageUrlSet(signedUrl, type);
          console.log('✅ MOBILE: Signed URL set via callback');
        } else if (onReferenceImageSet) {
          // Fallback: Still support File object for backward compatibility
          // But this should be removed once all components use URL callback
          console.warn('⚠️ MOBILE: Using legacy File object callback (should use onReferenceImageUrlSet)');
          onReferenceImageSet(persistedFile, type);
        }
        
        toast.success(`${type === 'single' ? 'Reference' : type === 'start' ? 'Start frame' : 'End frame'} image uploaded and ready`);
      } catch (uploadError) {
        console.error('❌ MOBILE: Failed to upload reference image:', uploadError);
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
        
        // Provide more helpful error messages
        if (errorMessage.includes('authenticated')) {
          toast.error('Your session expired. Please refresh the page and log in again.');
        } else if (errorMessage.includes('size') || errorMessage.includes('large')) {
          toast.error('Image is too large. Maximum size is 10MB.');
        } else {
          toast.error(`Upload failed: ${errorMessage}`);
        }
        return;
      }
    } catch (error) {
      console.error('❌ MOBILE: File persistence/validation failed:', error);
      toast.error(isIOS 
        ? 'Failed to load image on iOS. Try a different photo or format.'
        : 'Invalid image file. The file may be corrupted or unsupported.');
      return;
    }
  };

  // Helper function to convert HEIC/HEIF to JPEG using heic2any library
  // This is more reliable on iOS than the canvas-based approach
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
      });
      
      const blob = Array.isArray(result) ? result[0] : result;
      const jpegFile = new File(
        [blob], 
        file.name.replace(/\.(heic|heif)$/i, '.jpg'), 
        {
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );
      
      console.log('✅ MOBILE: HEIC successfully converted to JPEG via heic2any');
      return jpegFile;
    } catch (error) {
      console.error('❌ MOBILE: heic2any conversion failed:', error);
      throw new Error('Failed to convert HEIC image');
    }
  };

  const removeReferenceImage = (type: 'single' | 'start' | 'end') => {
    onReferenceImageRemove?.(type);
    toast.success(`${type === 'single' ? 'Reference' : type === 'start' ? 'Start frame' : 'End frame'} image removed`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📱 MOBILE INPUT: handleSubmit called', {
      prompt: prompt?.substring(0, 50),
      promptLength: prompt?.length,
      isGenerating,
      exactCopyMode,
      hasReferenceImage: !!referenceImage,
      hasReferenceImageUrl: !!referenceImageUrl,
      currentMode,
      selectedModel
    });
    
    // Block if already generating - with feedback
    if (isGenerating) {
      toast.info('Generation in progress, please wait...');
      return;
    }
    
    // Check for valid generation conditions
    // Allow generation if: prompt exists OR exactCopyMode with reference
    const hasReference = !!referenceImage || !!referenceImageUrl;
    const canGenerateWithExactCopy = exactCopyMode && hasReference;
    
    if (!prompt.trim() && !canGenerateWithExactCopy) {
      toast.error('Enter a prompt or use exact copy mode with a reference image');
      return;
    }
    
    // Show generation starting feedback
    toast.success('Starting generation...', { duration: 2000 });

    console.log('📱 MOBILE INPUT: Submitting with model:', selectedModel, 'quality:', quality);

    onGenerate(prompt.trim(), { 
      mode: currentMode,
      selectedModel,
      quality,
      exactCopyMode
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-[env(safe-area-inset-bottom)]">
      {/* Hidden file input for iOS reliability - must be in DOM */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />
      
      <Collapsible open={isExpanded} onOpenChange={handleExpandedChange}>
        {/* Collapsed State - Slim Bar */}
        {!isExpanded && (
          <div className="p-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full flex items-center justify-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm">Show Controls</span>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
        )}

        {/* Expanded State - Full Controls */}
        <CollapsibleContent>
          <div className="p-4 space-y-3">
            {/* Collapse Button */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Generation Controls</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>

            {/* Mode Selection */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={currentMode === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeToggle('image')}
                className="flex items-center gap-1 flex-1 min-h-[44px]"
              >
                <Camera className="h-4 w-4" />
                Image
              </Button>
              <Button
                type="button"
                variant={currentMode === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeToggle('video')}
                className="flex items-center gap-1 flex-1 min-h-[44px]"
              >
                <Video className="h-4 w-4" />
                Video
              </Button>
            </div>

            {/* NSFW Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">NSFW Content</span>
              <Switch 
                checked={contentType === 'nsfw'} 
                onCheckedChange={(checked) => onContentTypeChange?.(checked ? 'nsfw' : 'sfw')}
              />
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Picture Size</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={aspectRatio === '1:1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onAspectRatioChange?.('1:1')}
                  className="flex-1"
                >
                  1:1
                </Button>
                <Button
                  type="button"
                  variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onAspectRatioChange?.('16:9')}
                  className="flex-1"
                >
                  16:9
                </Button>
                <Button
                  type="button"
                  variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onAspectRatioChange?.('9:16')}
                  className="flex-1"
                >
                  9:16
                </Button>
              </div>
            </div>

            {/* Model & Quality Selection for Images */}
            {currentMode === 'image' && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedModel?.id || ''}
                  onValueChange={(modelId) => {
                    if (modelId === 'sdxl') {
                      onModelChange({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
                    } else {
                      // Find the selected API model (replicate or fal)
                      const apiModel = imageModels?.find(m => m.id === modelId);
                      if (apiModel) {
                        onModelChange({
                          id: apiModel.id,
                          type: apiModel.provider_name as 'replicate' | 'fal',
                          display_name: apiModel.display_name
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sdxl">SDXL (Local)</SelectItem>
                    {!modelsLoading && imageModels?.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={quality} onValueChange={(value: 'fast' | 'high') => onQualityChange(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Model & Quality Selection for Videos */}
            {currentMode === 'video' && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedModel?.id || 'wan'}
                  onValueChange={(modelId) => {
                    if (modelId === 'wan') {
                      onModelChange({ id: 'wan', type: 'sdxl', display_name: 'WAN' });
                    } else {
                      // Find the selected API video model (fal, etc.)
                      const apiModel = videoModels?.find(m => m.id === modelId);
                      if (apiModel) {
                        onModelChange({
                          id: apiModel.id,
                          type: apiModel.api_providers.name as 'replicate' | 'fal',
                          display_name: apiModel.display_name
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wan">WAN (Local)</SelectItem>
                    {!videoModelsLoading && videoModels?.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={quality} onValueChange={(value: 'fast' | 'high') => onQualityChange(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reference Image Upload */}
            <div className="space-y-2">
              {currentMode === 'image' ? (
                // Single reference for images
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileSelect('single')}
                      className="flex items-center gap-1 flex-1"
                    >
                      <Upload className="h-4 w-4" />
                      {referenceImage ? 'Change Reference' : 'Reference Image'}
                    </Button>
                    {referenceImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReferenceImage('single')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {(referenceImage || referenceImageUrl) && (
                    <>
                      <div className="flex items-center gap-2">
                        <MobileReferenceImagePreview
                          key={referenceImageUrl || referenceImage?.name || 'ref-image'} // Force re-render when URL changes
                          file={referenceImage}
                          imageUrl={referenceImageUrl}
                          onRemove={() => removeReferenceImage('single')}
                          onError={(error) => {
                            console.error('Preview error:', error);
                            toast.error('Image preview failed. File may be corrupted.');
                          }}
                          sizeClass="h-16 w-16"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {referenceImage?.name || (referenceImageUrl ? 'Uploaded image' : 'Workspace image')}
                          </div>
                          {referenceImage && (
                            <div className="text-xs text-muted-foreground">{(referenceImage.size / 1024).toFixed(0)}KB</div>
                          )}
                          {!referenceImage && referenceImageUrl && (
                            <div className="text-xs text-muted-foreground">Ready</div>
                          )}
                        </div>
                      </div>
                      {/* Exact Copy Mode Toggle - Only show when reference image is set */}
                      {onExactCopyModeChange && (
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                          <span className="text-sm font-medium">Mode:</span>
                          <Button
                            type="button"
                            variant={exactCopyMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => onExactCopyModeChange(!exactCopyMode)}
                            className="min-w-[60px] min-h-[44px]"
                          >
                            {exactCopyMode ? "COPY" : "MOD"}
                          </Button>
                          <span className="text-xs text-muted-foreground flex-1">
                            {exactCopyMode 
                              ? "Exact copy - preserves image exactly" 
                              : "Modify - allows changes to image"}
                          </span>
                        </div>
                      )}
                      {/* Reference Strength Control - Only show in modify mode */}
                      {!exactCopyMode && (referenceImage || referenceImageUrl) && onReferenceStrengthChange && (
                        <div className="space-y-1 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Variation: {Math.round((1 - referenceStrength) * 100)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Strength: {referenceStrength.toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            value={[referenceStrength]}
                            onValueChange={(value) => onReferenceStrengthChange(value[0])}
                            min={0.1}
                            max={0.9}
                            step={0.05}
                            size="sm"
                            className="w-full"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // Video mode: Show single reference for WAN 2.1 i2v, dual for other models
                videoModelSettings?.settings?.referenceMode === 'single' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileSelect('start')}
                        className="flex items-center gap-1 flex-1"
                      >
                        <Image className="h-4 w-4" />
                        {beginningRefImage ? 'Change Reference' : 'Reference Image'}
                      </Button>
                      {beginningRefImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReferenceImage('start')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {(beginningRefImage || beginningRefImageUrl) && (
                      <>
                        <div className="flex items-center gap-2">
                          <MobileReferenceImagePreview
                            file={beginningRefImage}
                            imageUrl={beginningRefImageUrl}
                            onRemove={() => removeReferenceImage('start')}
                            onError={(error) => {
                              console.error('Preview error:', error);
                              toast.error('Image preview failed. File may be corrupted.');
                            }}
                            sizeClass="h-16 w-16"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{beginningRefImage?.name || 'Workspace image'}</div>
                            {beginningRefImage && (
                              <div className="text-xs text-muted-foreground">{(beginningRefImage.size / 1024).toFixed(0)}KB</div>
                            )}
                          </div>
                        </div>
                        {/* Exact Copy Mode Toggle - Only show when reference image is set */}
                        {onExactCopyModeChange && (
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                            <span className="text-sm font-medium">Mode:</span>
                            <Button
                              type="button"
                              variant={exactCopyMode ? "default" : "outline"}
                              size="sm"
                              onClick={() => onExactCopyModeChange(!exactCopyMode)}
                              className="min-w-[60px]"
                            >
                              {exactCopyMode ? "COPY" : "MOD"}
                            </Button>
                            <span className="text-xs text-muted-foreground flex-1">
                              {exactCopyMode 
                                ? "Exact copy - preserves image exactly" 
                                : "Modify - allows changes to image"}
                            </span>
                          </div>
                        )}
                        {/* Reference Strength Control - Only show in modify mode */}
                        {!exactCopyMode && (beginningRefImage || beginningRefImageUrl) && onReferenceStrengthChange && (
                          <div className="space-y-1 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Variation: {Math.round((1 - referenceStrength) * 100)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Strength: {referenceStrength.toFixed(2)}
                              </span>
                            </div>
                            <Slider
                              value={[referenceStrength]}
                              onValueChange={(value) => onReferenceStrengthChange(value[0])}
                              min={0.1}
                              max={0.9}
                              step={0.05}
                              size="sm"
                              className="w-full"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  // Dual reference for other models
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileSelect('start')}
                          className="flex items-center gap-1 flex-1"
                        >
                          <Image className="h-4 w-4" />
                          {beginningRefImage ? 'Change Start' : 'Start Frame'}
                        </Button>
                        {beginningRefImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReferenceImage('start')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {(beginningRefImage || beginningRefImageUrl) && (
                        <div className="flex items-center gap-2">
                          <MobileReferenceImagePreview
                            file={beginningRefImage}
                            imageUrl={beginningRefImageUrl}
                            onRemove={() => removeReferenceImage('start')}
                            onError={(error) => {
                              console.error('Preview error:', error);
                              toast.error('Image preview failed. File may be corrupted.');
                            }}
                            sizeClass="h-16 w-16"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{beginningRefImage?.name || 'Workspace image'}</div>
                            {beginningRefImage && (
                              <div className="text-xs text-muted-foreground">{(beginningRefImage.size / 1024).toFixed(0)}KB</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileSelect('end')}
                          className="flex items-center gap-1 flex-1"
                        >
                          <Image className="h-4 w-4" />
                          {endingRefImage ? 'Change End' : 'End Frame'}
                        </Button>
                        {endingRefImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReferenceImage('end')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {(endingRefImage || endingRefImageUrl) && (
                        <div className="flex items-center gap-2">
                          <MobileReferenceImagePreview
                            file={endingRefImage}
                            imageUrl={endingRefImageUrl}
                            onRemove={() => removeReferenceImage('end')}
                            onError={(error) => {
                              console.error('Preview error:', error);
                              toast.error('Image preview failed. File may be corrupted.');
                            }}
                            sizeClass="h-16 w-16"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{endingRefImage?.name || 'Workspace image'}</div>
                            {endingRefImage && (
                              <div className="text-xs text-muted-foreground">{(endingRefImage.size / 1024).toFixed(0)}KB</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Workspace Actions - Clear All and Delete All */}
            {(onClearWorkspace || onDeleteAllWorkspace) && (
              <div className="flex items-center gap-2 pt-2 border-t">
                {onClearWorkspace && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onClearWorkspace()}
                    className="flex-1 min-h-[44px]"
                  >
                    Clear All
                  </Button>
                )}
                {onDeleteAllWorkspace && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteAllWorkspace()}
                    className="flex-1 text-destructive min-h-[44px]"
                  >
                    Delete All
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>

        {/* Prompt Input - Always Visible */}
        <div className="p-4 pt-0 border-t">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              type="text"
              placeholder={`Enter prompt for ${currentMode}`}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isGenerating}
            />
            <Button type="submit" disabled={isGenerating} className="w-full min-h-[44px]">
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate'
              )}
            </Button>
          </form>
        </div>
      </Collapsible>
    </div>
  );
};
