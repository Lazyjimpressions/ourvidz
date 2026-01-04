
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Camera, Video, Upload, X, Image, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useImageModels } from '@/hooks/useImageModels';
import { useVideoModels } from '@/hooks/useApiModels';
import { useVideoModelSettings } from '@/hooks/useVideoModelSettings';
import { MobileReferenceImagePreview } from './MobileReferenceImagePreview';

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
  onReferenceImageRemove?: (type: 'single' | 'start' | 'end') => void;
  referenceImage?: File | null; // NEW: Sync with hook state
  beginningRefImage?: File | null; // NEW: Sync with hook state
  endingRefImage?: File | null; // NEW: Sync with hook state
  contentType?: 'sfw' | 'nsfw';
  onContentTypeChange?: (type: 'sfw' | 'nsfw') => void;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  onCollapsedChange?: (collapsed: boolean) => void;
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
  onReferenceImageRemove,
  referenceImage, // NEW: Use hook state instead of local state
  beginningRefImage, // NEW: Use hook state
  endingRefImage, // NEW: Use hook state
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  onCollapsedChange
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

  const handleExpandedChange = (expanded: boolean) => {
    setIsExpanded(expanded);
    onCollapsedChange?.(expanded);
  };

  const handleFileSelect = async (type: 'single' | 'start' | 'end') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      console.log('📱 MOBILE: File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      // Check if it's a HEIC/HEIF file (iPhone format)
      const isHeic = file.type === 'image/heic' || 
                     file.type === 'image/heif' ||
                     file.name.toLowerCase().endsWith('.heic') ||
                     file.name.toLowerCase().endsWith('.heif');
      
      let processedFile: File = file;

      if (isHeic) {
        console.log('🔄 MOBILE: Converting HEIC/HEIF to JPEG...');
        try {
          // Convert HEIC to JPEG using canvas
          const convertedFile = await convertHeicToJpeg(file);
          processedFile = convertedFile;
          console.log('✅ MOBILE: HEIC converted to JPEG:', {
            originalSize: file.size,
            convertedSize: convertedFile.size,
            newType: convertedFile.type
          });
          toast.success('Image converted from HEIC to JPEG');
        } catch (error) {
          console.error('❌ MOBILE: Failed to convert HEIC:', error);
          toast.error('Failed to convert HEIC image. Please try a JPEG or PNG image.');
          return;
        }
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(processedFile.type)) {
        console.error('❌ MOBILE: Invalid file type:', processedFile.type);
        toast.error(`Unsupported image format: ${processedFile.type}. Please use JPEG, PNG, or WebP.`);
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (processedFile.size > maxSize) {
        console.error('❌ MOBILE: File too large:', processedFile.size);
        toast.error('Image is too large. Maximum size is 10MB.');
        return;
      }

      // CRITICAL: Validate file is readable by creating preview
      try {
        const previewUrl = URL.createObjectURL(processedFile);
        // Test if image actually loads
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(previewUrl);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(previewUrl);
            reject(new Error('Image failed to load'));
          };
          img.src = previewUrl;
        });
        
        console.log('✅ MOBILE: File validated - image loads successfully');
      } catch (error) {
        console.error('❌ MOBILE: File validation failed:', error);
        toast.error('Invalid image file. The file may be corrupted or unsupported. Please try another image.');
        return;
      }

      // Only set file if validation succeeded
      console.log('✅ MOBILE: File validated and ready to set:', {
        fileName: processedFile.name,
        fileSize: processedFile.size,
        fileType: processedFile.type,
        type: type
      });
      onReferenceImageSet?.(processedFile, type);
      console.log('✅ MOBILE: File set callback called');
      toast.success(`${type === 'single' ? 'Reference' : type === 'start' ? 'Start frame' : 'End frame'} image selected`);
    };
    input.click();
  };

  // Helper function to convert HEIC/HEIF to JPEG
  // Note: Browser support for HEIC is limited, so this may not work for all HEIC files
  // If conversion fails, user will need to convert the image manually
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        let timeoutId: NodeJS.Timeout;
        
        img.onload = () => {
          clearTimeout(timeoutId);
          try {
            // Create canvas and draw image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            ctx.drawImage(img, 0, 0);
            
            // Convert to blob (JPEG)
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to convert image to blob'));
                return;
              }
              
              // Create new File object with JPEG extension
              const jpegFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                type: 'image/jpeg',
                lastModified: file.lastModified
              });
              
              console.log('✅ MOBILE: HEIC successfully converted to JPEG');
              resolve(jpegFile);
            }, 'image/jpeg', 0.95); // 95% quality
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('❌ MOBILE: Image load error:', error);
          reject(new Error('Browser cannot decode HEIC image. Please convert to JPEG or PNG first.'));
        };
        
        // Set timeout for image loading (10 seconds)
        timeoutId = setTimeout(() => {
          reject(new Error('Image conversion timed out. The HEIC file may not be supported by your browser.'));
        }, 10000);
        
        // Try to load the image
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          clearTimeout(timeoutId);
          reject(new Error('Failed to read file data'));
          return;
        }
        
        img.src = dataUrl;
      };
      
      reader.onerror = (error) => {
        console.error('❌ MOBILE: FileReader error:', error);
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (type: 'single' | 'start' | 'end') => {
    onReferenceImageRemove?.(type);
    toast.success(`${type === 'single' ? 'Reference' : type === 'start' ? 'Start frame' : 'End frame'} image removed`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    console.log('📱 MOBILE INPUT: Submitting with model:', selectedModel, 'quality:', quality);

    onGenerate(prompt.trim(), { 
      mode: currentMode,
      selectedModel,
      quality
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
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
                className="flex items-center gap-1 flex-1"
              >
                <Camera className="h-4 w-4" />
                Image
              </Button>
              <Button
                type="button"
                variant={currentMode === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeToggle('video')}
                className="flex items-center gap-1 flex-1"
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
                  {referenceImage && (
                    <div className="flex items-center gap-2">
                      <MobileReferenceImagePreview
                        file={referenceImage}
                        onRemove={() => removeReferenceImage('single')}
                        onError={(error) => {
                          console.error('Preview error:', error);
                          toast.error('Image preview failed. File may be corrupted.');
                        }}
                        sizeClass="h-16 w-16"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{referenceImage.name}</div>
                        <div className="text-xs text-muted-foreground">{(referenceImage.size / 1024).toFixed(0)}KB</div>
                      </div>
                    </div>
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
                    {beginningRefImage && (
                      <div className="flex items-center gap-2">
                        <MobileReferenceImagePreview
                          file={beginningRefImage}
                          onRemove={() => removeReferenceImage('start')}
                          onError={(error) => {
                            console.error('Preview error:', error);
                            toast.error('Image preview failed. File may be corrupted.');
                          }}
                          sizeClass="h-16 w-16"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{beginningRefImage.name}</div>
                          <div className="text-xs text-muted-foreground">{(beginningRefImage.size / 1024).toFixed(0)}KB</div>
                        </div>
                      </div>
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
                      {beginningRefImage && (
                        <div className="flex items-center gap-2">
                          <MobileReferenceImagePreview
                            file={beginningRefImage}
                            onRemove={() => removeReferenceImage('start')}
                            onError={(error) => {
                              console.error('Preview error:', error);
                              toast.error('Image preview failed. File may be corrupted.');
                            }}
                            sizeClass="h-16 w-16"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{beginningRefImage.name}</div>
                            <div className="text-xs text-muted-foreground">{(beginningRefImage.size / 1024).toFixed(0)}KB</div>
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
                      {endingRefImage && (
                        <div className="flex items-center gap-2">
                          <MobileReferenceImagePreview
                            file={endingRefImage}
                            onRemove={() => removeReferenceImage('end')}
                            onError={(error) => {
                              console.error('Preview error:', error);
                              toast.error('Image preview failed. File may be corrupted.');
                            }}
                            sizeClass="h-16 w-16"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{endingRefImage.name}</div>
                            <div className="text-xs text-muted-foreground">{(endingRefImage.size / 1024).toFixed(0)}KB</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
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
            <Button type="submit" disabled={isGenerating} className="w-full">
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </form>
        </div>
      </Collapsible>
    </div>
  );
};
