import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGeneration } from "@/hooks/useGeneration";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { WorkspaceInputControls } from "@/components/WorkspaceInputControls";
import { WorkspaceGenerationSets } from "@/components/WorkspaceGenerationSets";
import { GenerationProgressIndicator } from "@/components/GenerationProgressIndicator";
import type { GenerationQuality } from "@/types/generation";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: GenerationQuality;
}

interface GenerationSet {
  id: string;
  prompt: string;
  quality: GenerationQuality;
  mode: 'image' | 'video';
  timestamp: Date;
  content: GeneratedContent[];
  isExpanded?: boolean;
  isRegeneration?: boolean;
  sourceSetId?: string;
}

// Helper function to get timeout based on format
const getTimeoutForFormat = (format: 'image' | 'video'): number => {
  if (format === 'video') {
    return 8 * 60 * 1000; // 8 minutes for videos
  } else {
    return 5 * 60 * 1000; // 5 minutes for images
  }
};

export const Workspace = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = (searchParams.get('mode') as 'image' | 'video') || 'image';
  
  const [mode, setMode] = useState<'image' | 'video'>(initialMode);
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [prompt, setPrompt] = useState("");
  const [generationSets, setGenerationSets] = useState<GenerationSet[]>([]);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [generationStartTime, setGenerationStartTime] = useState<Date | null>(null);
  const [currentRegenerationSource, setCurrentRegenerationSource] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus } = useGeneration({
    onSuccess: (data) => {
      console.log('🎉 Generation started with ID:', data.id);
      setGeneratedId(data.id);
      setGenerationStartTime(new Date());
      setProcessedIds(new Set()); // Clear processed IDs for new generation
      toast.success(`${mode === 'image' ? 'Image' : 'Video'} generation started!`);
    },
    onError: (error) => {
      console.error('❌ Generation failed:', error);
      toast.error(`Generation failed: ${error.message}`);
      setGeneratedId(null);
      setGenerationStartTime(null);
      setCurrentRegenerationSource(null);
    }
  });

  const { data: generationData, error: statusError } = useGenerationStatus(
    generatedId, 
    mode, 
    !!generatedId
  );

  // Map database status to GenerationProgressIndicator status
  const mapDatabaseStatusToProgressStatus = (dbStatus: string): 'queued' | 'processing' | 'uploading' | 'completed' | 'failed' => {
    switch (dbStatus) {
      case 'pending':
      case 'queued':
        return 'queued';
      case 'processing':
        return 'processing';
      case 'uploading':
        return 'uploading';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  };

  // Calculate progress based on status and elapsed time
  const calculateProgress = (status: string, startTime: Date | null): number => {
    if (!startTime) return 0;
    
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const estimatedTotal = getEstimatedTime();
    
    switch (status) {
      case 'queued':
      case 'pending':
        return Math.min(10, (elapsed / estimatedTotal) * 100);
      case 'processing':
        return Math.min(80, 20 + ((elapsed / estimatedTotal) * 60));
      case 'uploading':
        return Math.min(95, 85 + ((elapsed / estimatedTotal) * 10));
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return Math.min(50, (elapsed / estimatedTotal) * 100);
    }
  };

  // Update URL when mode changes
  const handleModeChange = (newMode: 'image' | 'video') => {
    setMode(newMode);
    navigate(`/workspace?mode=${newMode}`, { replace: true });
  };

  // Sync mode with URL parameter
  useEffect(() => {
    const urlMode = searchParams.get('mode') as 'image' | 'video';
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [searchParams, mode]);

  // Add timeout mechanism for stuck generations
  useEffect(() => {
    if (!generatedId || !generationStartTime) return;

    const timeout = getTimeoutForFormat(mode);
    const timeoutId = setTimeout(() => {
      const elapsed = Date.now() - generationStartTime.getTime();
      if (elapsed > timeout) {
        console.log(`⏰ Generation timeout reached (${mode === 'video' ? '8 minutes' : '5 minutes'}), clearing progress dialog`);
        toast.error('Generation timed out. Please try again.');
        setGeneratedId(null);
        setGenerationStartTime(null);
        setProcessedIds(prev => new Set(prev).add(generatedId));
        setCurrentRegenerationSource(null);
      }
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [generatedId, generationStartTime, mode]);

  // Enhanced generation completion handler with improved regeneration detection
  useEffect(() => {
    if (!generationData || !generatedId) return;

    // Prevent processing the same generation multiple times
    if (processedIds.has(generatedId)) {
      console.log('⏭️ Already processed generation:', generatedId);
      return;
    }

    console.log('🔄 Processing generation data:', { 
      id: generatedId, 
      status: generationData.status, 
      mode,
      hasUrlError: 'url_error' in generationData && generationData.url_error,
      isRegeneration: generationData.is_regeneration || !!currentRegenerationSource,
      regenerationSource: generationData.regeneration_source || currentRegenerationSource
    });

    // Handle URL errors - clear progress dialog and mark as processed
    if ('url_error' in generationData && generationData.url_error) {
      console.log('❌ URL error detected, clearing progress dialog');
      setGeneratedId(null);
      setGenerationStartTime(null);
      setProcessedIds(prev => new Set(prev).add(generatedId));
      setCurrentRegenerationSource(null);
      return;
    }

    if (generationData.status === 'completed') {
      console.log('✅ Generation completed, processing results...');
      
      const contentData = generationData as any;
      
      if (mode === 'image' && contentData.image_urls && contentData.image_urls.length > 0) {
        const images = contentData.image_urls.map((url: string, index: number) => ({
          id: `${generatedId}-${index}`,
          url,
          prompt,
          timestamp: new Date(),
          quality
        }));
        
        console.log('🖼️ Creating new image generation set:', images);
        
        // Determine if this is a regeneration from either the current context or the data
        const isRegeneration = contentData.is_regeneration || !!currentRegenerationSource;
        const sourceSetId = contentData.regeneration_source || currentRegenerationSource;
        
        const newSet: GenerationSet = {
          id: generatedId,
          prompt,
          quality,
          mode: 'image',
          timestamp: new Date(),
          content: images,
          isExpanded: true,
          isRegeneration,
          sourceSetId
        };
        
        console.log('📍 Positioning regenerated set:', { isRegeneration, sourceSetId });
        
        // Position regenerated sets directly below their source
        if (isRegeneration && sourceSetId) {
          setGenerationSets(prev => {
            const sourceIndex = prev.findIndex(set => set.id === sourceSetId);
            if (sourceIndex !== -1) {
              const newSets = [...prev];
              newSets.splice(sourceIndex + 1, 0, newSet);
              console.log('✅ Positioned regenerated set below source at index:', sourceIndex + 1);
              return newSets;
            }
            console.warn('⚠️ Source set not found, adding to top');
            return [newSet, ...prev];
          });
        } else {
          console.log('📌 Adding new original set to top');
          setGenerationSets(prev => [newSet, ...prev]);
        }
        
        setProcessedIds(prev => new Set(prev).add(generatedId));
        setGeneratedId(null);
        setGenerationStartTime(null);
        setCurrentRegenerationSource(null);
        
      } else if (mode === 'video' && contentData.video_url) {
        const video: GeneratedContent = {
          id: generatedId,
          url: contentData.video_url,
          prompt,
          timestamp: new Date(),
          quality
        };
        
        console.log('🎬 Creating new video generation set:', video);
        
        // Determine if this is a regeneration from either the current context or the data
        const isRegeneration = contentData.is_regeneration || !!currentRegenerationSource;
        const sourceSetId = contentData.regeneration_source || currentRegenerationSource;
        
        const newSet: GenerationSet = {
          id: generatedId,
          prompt,
          quality,
          mode: 'video',
          timestamp: new Date(),
          content: [video],
          isExpanded: true,
          isRegeneration,
          sourceSetId
        };
        
        // Position regenerated sets directly below their source
        if (isRegeneration && sourceSetId) {
          setGenerationSets(prev => {
            const sourceIndex = prev.findIndex(set => set.id === sourceSetId);
            if (sourceIndex !== -1) {
              const newSets = [...prev];
              newSets.splice(sourceIndex + 1, 0, newSet);
              return newSets;
            }
            return [newSet, ...prev];
          });
        } else {
          setGenerationSets(prev => [newSet, ...prev]);
        }
        
        setProcessedIds(prev => new Set(prev).add(generatedId));
        setGeneratedId(null);
        setGenerationStartTime(null);
        setCurrentRegenerationSource(null);
        
      } else {
        console.warn('⚠️ Generation completed but no content found:', contentData);
        // Clear progress dialog even if no content is found
        setGeneratedId(null);
        setGenerationStartTime(null);
        setProcessedIds(prev => new Set(prev).add(generatedId));
        setCurrentRegenerationSource(null);
      }
      
    } else if (generationData.status === 'failed') {
      console.error('❌ Generation failed:', generationData);
      toast.error('Generation failed. Please try again.');
      setGeneratedId(null);
      setGenerationStartTime(null);
      setProcessedIds(prev => new Set(prev).add(generatedId));
      setCurrentRegenerationSource(null);
    }
  }, [generationData, generatedId, mode, prompt, quality, processedIds, currentRegenerationSource]);

  // Handle status check errors
  useEffect(() => {
    if (statusError && generatedId) {
      console.error('❌ Status check error:', statusError);
      // Only show toast for unexpected errors, not for normal "no rows" errors
      if (!statusError.message?.includes('no rows returned')) {
        // Don't show additional toast here as useGenerationStatus already handles it
        console.log('ℹ️ Status error handled by useGenerationStatus hook');
      }
    }
  }, [statusError, generatedId]);

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Clear regeneration state for new generations
    setCurrentRegenerationSource(null);
    setGeneratedId(null);
    setProcessedIds(new Set());

    generate({
      format: mode,
      quality,
      prompt: prompt.trim(),
      metadata: {
        source: 'workspace'
      }
    });
  };

  const handleReferenceImageUpload = () => {
    toast.info("Reference image upload coming soon!");
  };

  const handleRemoveSet = (setId: string) => {
    setGenerationSets(prev => prev.filter(set => set.id !== setId));
  };

  const handleClearAll = () => {
    setGenerationSets([]);
  };

  const handleRegenerateItem = (itemId: string) => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Find the item to regenerate across all sets
    let itemToRegenerate: GeneratedContent | null = null;
    let sourceSet: GenerationSet | null = null;

    for (const set of generationSets) {
      const item = set.content.find(item => item.id === itemId);
      if (item) {
        itemToRegenerate = item;
        sourceSet = set;
        break;
      }
    }

    if (!itemToRegenerate || !sourceSet) return;

    // Set regeneration context
    setCurrentRegenerationSource(sourceSet.id);
    setGeneratedId(null);
    setProcessedIds(new Set());

    // Generate new content with same prompt and quality
    generate({
      format: sourceSet.mode,
      quality: itemToRegenerate.quality,
      prompt: itemToRegenerate.prompt,
      metadata: {
        source: 'workspace',
        regenerateId: itemId
      }
    });
  };

  // Enhanced regeneration with prompt editing and advanced options
  const handleRegenerateWithPrompt = (params: {
    itemId: string;
    prompt: string;
    quality: GenerationQuality;
    mode: 'image' | 'video';
    strength?: number;
    referenceImageUrl?: string;
    preserveSeed?: boolean;
  }) => {
    console.log('🔄 Regenerating with enhanced params:', params);

    // Find the source set for positioning - use the set ID, not individual item ID
    const sourceSet = generationSets.find(set => set.id === params.itemId);
    if (sourceSet) {
      console.log('🎯 Found source set for regeneration:', sourceSet.id);
      setCurrentRegenerationSource(sourceSet.id);
    } else {
      console.warn('⚠️ Source set not found for regeneration:', params.itemId);
    }

    // Clear processing state and regenerate
    setGeneratedId(null);
    setProcessedIds(new Set());

    // Generate new content with enhanced regeneration request
    generate({
      format: params.mode,
      quality: params.quality,
      prompt: params.prompt,
      metadata: {
        source: 'workspace',
        regenerateId: params.itemId,
        is_regeneration: true,
        regeneration_source: params.itemId,
        strength: params.strength,
        reference_image_url: params.referenceImageUrl,
        preserve_seed: params.preserveSeed
      },
      // Pass regeneration-specific data
      strength: params.strength,
      referenceImageUrl: params.referenceImageUrl,
      preserveSeed: params.preserveSeed,
      originalItemId: params.itemId
    } as any);

    toast.success('Regenerating with updated prompt and settings...');
  };

  // Phase 2 optimized timing estimates
  const getEstimatedTime = () => {
    const timingMap = {
      'image_fast': 60,    // 37% faster with medium resolution
      'image_high': 105,   // High resolution, high quality
      'video_fast': 75,    // 38% faster with medium resolution
      'video_high': 120    // High resolution, high quality
    };
    
    const key = `${mode}_${quality}` as keyof typeof timingMap;
    return timingMap[key] || (mode === 'image' ? 90 : 120);
  };

  // Add cancel function for stuck generations
  const handleCancelGeneration = () => {
    console.log('🛑 User cancelled generation');
    setGeneratedId(null);
    setGenerationStartTime(null);
    setCurrentRegenerationSource(null);
    toast.info('Generation cancelled');
  };

  const hasGeneratedContent = generationSets.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <WorkspaceHeader />

      {/* Main Content Container - Improved layout structure */}
      <div className="flex flex-col min-h-screen">
        {/* Content Area - Improved scrolling and spacing */}
        <div className="flex-1 px-4 sm:px-8 py-4 sm:py-8 pb-48 sm:pb-40 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {!hasGeneratedContent ? (
              <div className="text-center max-w-4xl mx-auto">
                {/* Show progress indicator during generation */}
                {generatedId && generationData && (
                  <div className="mb-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700 sticky top-4 z-10">
                    <GenerationProgressIndicator
                      status={mapDatabaseStatusToProgressStatus(generationData.status)}
                      progress={calculateProgress(generationData.status, generationStartTime)}
                      estimatedTime={getEstimatedTime()}
                      startTime={generationStartTime}
                    />
                    {/* Add cancel button for stuck generations */}
                    <button
                      onClick={handleCancelGeneration}
                      className="mt-4 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded transition-colors"
                    >
                      Cancel Generation
                    </button>
                  </div>
                )}
                
                <h1 className="text-3xl sm:text-4xl font-light mb-4">
                  Let's start {mode === 'video' ? 'creating some videos' : 'with some image storming'}
                  <span className="inline-flex items-center gap-2">
                    <div className="flex gap-1 ml-2">
                      <img 
                        src="https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=32&h=32&fit=crop&crop=center" 
                        alt="" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover"
                      />
                      <img 
                        src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=32&h=32&fit=crop&crop=center" 
                        alt="" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover"
                      />
                      <img 
                        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=32&h=32&fit=crop&crop=center" 
                        alt="" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover"
                      />
                    </div>
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-gray-400 mb-8">
                  {mode === 'video' 
                    ? "Type your prompt, set your style, and generate your video"
                    : "Type your prompt, set your style, and generate your image"
                  }
                </p>
              </div>
            ) : (
              <div className="w-full space-y-6">
                {/* Show progress indicator during generation - positioned above existing content with better spacing */}
                {generatedId && generationData && (
                  <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 sticky top-4 z-20 backdrop-blur-sm">
                    <GenerationProgressIndicator
                      status={mapDatabaseStatusToProgressStatus(generationData.status)}
                      progress={calculateProgress(generationData.status, generationStartTime)}
                      estimatedTime={getEstimatedTime()}
                      startTime={generationStartTime}
                    />
                    {/* Add cancel button for stuck generations */}
                    <button
                      onClick={handleCancelGeneration}
                      className="mt-4 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded transition-colors"
                    >
                      Cancel Generation
                    </button>
                  </div>
                )}
                
                <WorkspaceGenerationSets
                  generationSets={generationSets}
                  onRemoveSet={handleRemoveSet}
                  onClearAll={handleClearAll}
                  onRegenerateItem={handleRegenerateItem}
                  onRegenerateWithPrompt={handleRegenerateWithPrompt}
                />
              </div>
            )}
          </div>
        </div>

        {/* Fixed Input Container - Improved positioning and reduced height */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-700/50 p-3 sm:p-6 z-30">
          <div className="max-w-5xl mx-auto">
            <WorkspaceInputControls
              mode={mode}
              onModeChange={handleModeChange}
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onReferenceImageUpload={handleReferenceImageUpload}
              quality={quality}
              onQualityChange={setQuality}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
