
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/hooks/useGeneration';
import { useRealtimeGenerationStatus } from '@/hooks/useRealtimeGenerationStatus';
import { GenerationFormat } from '@/types/generation';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { ScrollNavigation } from '@/components/ScrollNavigation';
import { ImageInputControls } from '@/components/ImageInputControls';
import { VideoInputControls } from '@/components/VideoInputControls';
import { LibraryImportModal } from '@/components/LibraryImportModal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Info } from 'lucide-react';
import { PromptInfoModal } from '@/components/PromptInfoModal';
import { useWorkspaceIntegration } from '@/hooks/useWorkspaceIntegration';
import { OptimizedAssetService, UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface WorkspaceAsset {
  id: string;
  url: string;
  jobId: string;
  prompt: string;
  type?: 'image' | 'video';
  quality?: string;
  modelType?: string;
  timestamp?: Date;
}

const Workspace = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Get mode from URL params, default to image
  const mode = searchParams.get('mode') || 'image';
  const isVideoMode = mode === 'video';
  
  // Generation state
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [enhanced, setEnhanced] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<GenerationFormat>(
    isVideoMode ? 'video_fast' : 'sdxl_image_fast'
  );
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  
  // Workspace state - Simplified and optimized
  const [workspaceAssets, setWorkspaceAssets] = useState<WorkspaceAsset[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  
  // Modal states
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<WorkspaceAsset | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentPromptAsset, setCurrentPromptAsset] = useState<WorkspaceAsset | null>(null);
  
  // Generation hooks
  const {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error: generationError,
    clearError
  } = useGeneration();

  // Use realtime generation status hook to track job completion
  useRealtimeGenerationStatus(
    currentJob?.id || null,
    selectedMode,
    !!currentJob && isGenerating
  );

  // Use workspace integration hook
  useWorkspaceIntegration();

  // Load workspace from sessionStorage with proper session management
  useEffect(() => {
    const sessionStart = sessionStorage.getItem('workspace-session');
    const sessionUserId = sessionStorage.getItem('workspace-user');
    const currentUserId = user?.id;
    
    // Check if this is a new session or different user
    if (!sessionStart || sessionUserId !== currentUserId) {
      // Clear old workspace data and start fresh
      sessionStorage.removeItem('workspace');
      sessionStorage.removeItem('workspace-session');
      sessionStorage.removeItem('workspace-user');
      
      // Set new session data
      if (currentUserId) {
        sessionStorage.setItem('workspace-session', Date.now().toString());
        sessionStorage.setItem('workspace-user', currentUserId);
        console.log('🆕 Started new workspace session for user:', currentUserId);
      }
      
      setWorkspaceAssets([]);
      return;
    }
    
    // Load existing workspace from current session
    const stored = sessionStorage.getItem('workspace');
    if (stored) {
      try {
        const loadedWorkspace = JSON.parse(stored);
        setWorkspaceAssets(loadedWorkspace);
        console.log('🔄 Loaded workspace from current session:', loadedWorkspace.length, 'assets');
      } catch (error) {
        console.error('Error parsing workspace data:', error);
        sessionStorage.removeItem('workspace');
        setWorkspaceAssets([]);
      }
    }
  }, [user]);

  // Save workspace to sessionStorage with debouncing
  useEffect(() => {
    const timeout = setTimeout(() => {
      sessionStorage.setItem('workspace', JSON.stringify(workspaceAssets));
    }, 300);
    return () => clearTimeout(timeout);
  }, [workspaceAssets]);

  // React Query for recent completed assets (for auto-add functionality)
  const { data: recentAssets = [] } = useQuery({
    queryKey: ['recent-assets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get recent completed assets from the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await OptimizedAssetService.getUserAssets(
        { status: 'completed' },
        { limit: 50, offset: 0 }
      );
      
      // Filter to only assets created in the last 24 hours
      return result.assets.filter(asset => 
        asset.createdAt > oneDayAgo
      );
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Auto-add new assets to workspace (only recent ones not already in workspace)
  useEffect(() => {
    if (!recentAssets.length || !user) return;

    const workspaceJobIds = new Set(workspaceAssets.map(asset => asset.jobId));
    const newAssets: WorkspaceAsset[] = [];

    recentAssets.forEach(asset => {
      // Skip if this job is already in workspace
      if (workspaceJobIds.has(asset.id)) return;

      if (asset.type === 'image' && asset.signedUrls && asset.signedUrls.length > 0) {
        // SDXL job with multiple images - add each individually
        asset.signedUrls.forEach((url, index) => {
          newAssets.push({
            id: `${asset.id}_${index}`,
            url,
            jobId: asset.id,
            prompt: `${asset.prompt} (Image ${index + 1})`,
            type: 'image',
            quality: asset.quality,
            modelType: asset.modelType,
            timestamp: asset.createdAt
          });
        });
      } else if (asset.url) {
        // Single image or video
        newAssets.push({
          id: asset.id,
          url: asset.url,
          jobId: asset.id,
          prompt: asset.prompt,
          type: asset.type,
          quality: asset.quality,
          modelType: asset.modelType,
          timestamp: asset.createdAt
        });
      }
    });

    if (newAssets.length > 0) {
      setWorkspaceAssets(prev => [...newAssets, ...prev]);
      console.log('🔄 Auto-added', newAssets.length, 'new assets to workspace');
    }
  }, [recentAssets, workspaceAssets, user]);

  // Listen for library assets being added to workspace
  useEffect(() => {
    const handleLibraryAddToWorkspace = async (event: CustomEvent) => {
      const { assetIds } = event.detail;
      
      try {
        // Fetch the assets from the database
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [imagesResult, videosResult] = await Promise.all([
          supabase
            .from('images')
            .select('*')
            .eq('user_id', user.id)
            .in('id', assetIds.filter(id => !id.includes('_'))) // Filter out SDXL individual image IDs
            .eq('status', 'completed'),
          supabase
            .from('videos')
            .select('*')
            .eq('user_id', user.id)
            .in('id', assetIds.filter(id => !id.includes('_')))
            .eq('status', 'completed')
        ]);

        const newAssets: WorkspaceAsset[] = [];

        // Process images
        if (imagesResult.data) {
          imagesResult.data.forEach(image => {
            const imageUrls = image.image_urls as string[] | null;
            if (imageUrls && imageUrls.length > 0) {
              // SDXL job with multiple images
              imageUrls.forEach((url: string, index: number) => {
                const assetId = `${image.id}_${index}`;
                newAssets.push({
                  id: assetId,
                  url,
                  jobId: image.id,
                  prompt: `${image.prompt} (Image ${index + 1})`,
                  type: 'image',
                  quality: image.quality,
                  modelType: image.generation_mode,
                  timestamp: new Date(image.created_at)
                });
              });
            } else if (image.image_url) {
              // Single image
              newAssets.push({
                id: image.id,
                url: image.image_url,
                jobId: image.id,
                prompt: image.prompt,
                type: 'image',
                quality: image.quality,
                modelType: image.generation_mode,
                timestamp: new Date(image.created_at)
              });
            }
          });
        }

        // Process videos
        if (videosResult.data) {
          videosResult.data.forEach(video => {
            if (video.signed_url) {
              newAssets.push({
                id: video.id,
                url: video.signed_url,
                jobId: video.id,
                prompt: 'Generated video', // Videos don't have prompt field
                type: 'video',
                quality: 'fast', // Default quality for videos
                timestamp: new Date(video.created_at)
              });
            }
          });
        }

        // Add to workspace
        setWorkspaceAssets(prev => [...newAssets, ...prev]);
        toast.success(`Added ${newAssets.length} assets to workspace`);
      } catch (error) {
        console.error('Failed to add assets to workspace:', error);
        toast.error('Failed to add assets to workspace');
      }
    };

    window.addEventListener('library-add-to-workspace', handleLibraryAddToWorkspace as EventListener);
    
    return () => {
      window.removeEventListener('library-add-to-workspace', handleLibraryAddToWorkspace as EventListener);
    };
  }, []);

  // Handle authentication state and navigation
  useEffect(() => {
    // Don't redirect while auth is loading
    if (loading) return;
    
    // Redirect to auth if user is not authenticated
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  // Update selected mode when URL mode changes, quality changes, or enhancement changes
  useEffect(() => {
    if (isVideoMode) {
      if (enhanced) {
        setSelectedMode(quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced');
      } else {
        setSelectedMode(quality === 'high' ? 'video_high' : 'video_fast');
      }
    } else {
      if (enhanced) {
        setSelectedMode(quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced');
      } else {
        setSelectedMode(quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast');
      }
    }
  }, [isVideoMode, quality, enhanced]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (generationError) {
      clearError();
    }

    try {
      console.log('🚀 Starting generation with:', {
        format: selectedMode,
        prompt: prompt.trim(),
        referenceImage: referenceImage?.name
      });

      await generateContent({
        format: selectedMode,
        prompt: prompt.trim(),
        metadata: {
          reference_image: referenceImage ? true : false,
          model_variant: selectedMode.startsWith('sdxl') ? 'lustify_sdxl' : 'wan_2_1_1_3b'
        }
      });

      toast.success('Generation started successfully!');
    } catch (error) {
      console.error('❌ Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage);
    }
  };

  const handleRegenerate = () => {
    if (currentJob && prompt) {
      handleGenerate();
    }
  };

  const handleGenerateMoreLike = async (tile: WorkspaceAsset) => {
    if (!tile.url || tile.type !== 'image') {
      toast.error('Reference image not available');
      return;
    }

    try {
      console.log('🔄 Generating 3 more images like:', {
        tileId: tile.id,
        prompt: tile.prompt,
        quality: tile.quality,
        modelType: tile.modelType
      });

      // Set the prompt from the selected tile
      setPrompt(tile.prompt);
      
      // Determine the generation mode based on the tile's properties
      let generationMode: GenerationFormat;
      if (tile.modelType?.includes('7b')) {
        generationMode = tile.quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
      } else if (tile.modelType?.includes('sdxl')) {
        generationMode = tile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      } else {
        generationMode = tile.quality === 'high' ? 'image_high' : 'image_fast';
      }
      
      setSelectedMode(generationMode);
      
      // Start generation
      await generateContent({
        format: generationMode,
        prompt: tile.prompt,
        metadata: {
          model_variant: generationMode.startsWith('sdxl') ? 'lustify_sdxl' : 'wan_2_1_1_3b'
        }
      });

      toast.success('Generating more images like this one!');
    } catch (error) {
      console.error('❌ Generate more like failed:', error);
      toast.error('Failed to generate more images');
    }
  };

  const handleRemoveFromWorkspace = (assetId: string) => {
    setWorkspaceAssets(prev => prev.filter(asset => asset.id !== assetId));
    toast.success('Removed from workspace');
  };

  const clearWorkspace = () => {
    setIsClearing(true);
    
    // Clear workspace state
    setWorkspaceAssets([]);
    
    // Clear session storage
    sessionStorage.removeItem('workspace');
    
    // Set cleared flag
    sessionStorage.setItem('workspaceCleared', 'true');
    localStorage.setItem('workspaceCleared', 'true');
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['recent-assets'] });
    
    toast.success('Workspace cleared');
    
    // Reset clearing state after a short delay
    setTimeout(() => {
      setIsClearing(false);
      sessionStorage.removeItem('workspaceCleared');
      localStorage.removeItem('workspaceCleared');
    }, 1000);
  };

  const handleImageClick = (asset: WorkspaceAsset) => {
    if (asset.type === 'video') {
      setSelectedVideo(asset);
    } else {
      const imageAssets = workspaceAssets.filter(a => a.type !== 'video');
      const index = imageAssets.findIndex(a => a.id === asset.id);
      if (index !== -1) {
        setLightboxIndex(index);
      }
    }
  };

  const handleCloseVideoModal = () => {
    setSelectedVideo(null);
  };

  const handleShowPromptInfo = (asset: WorkspaceAsset) => {
    setCurrentPromptAsset(asset);
    setShowPromptModal(true);
  };

  const handleClosePromptModal = () => {
    setShowPromptModal(false);
    setCurrentPromptAsset(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated (redirect will happen in useEffect)
  if (!user) {
    return null;
  }

  // Filter workspace assets for lightbox (images only)
  const imageAssets = workspaceAssets.filter(asset => asset.type !== 'video');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Fixed Header */}
      <WorkspaceHeader onClearWorkspace={clearWorkspace} />

      {/* Main Content Area */}
      <div className="flex-1 pt-12">
        {/* Current Workspace */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Current Workspace ({workspaceAssets.length} assets)</h2>
          </div>
          
          {workspaceAssets.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {workspaceAssets.map((asset) => (
                <div key={asset.id} className="relative group">
                  {asset.type === 'video' ? (
                    <video
                      src={asset.url}
                      className="w-full aspect-square object-cover rounded-lg border border-border cursor-pointer hover:scale-105 transition"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      onClick={() => handleImageClick(asset)}
                    />
                  ) : (
                    <img
                      src={asset.url}
                      alt={`Workspace ${asset.id}`}
                      onClick={() => handleImageClick(asset)}
                      className="w-full aspect-square object-cover rounded-lg border border-border hover:scale-105 transition cursor-pointer"
                    />
                  )}
                  <button
                    onClick={() => handleRemoveFromWorkspace(asset.id)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Workspace is empty. Generated images and videos will automatically appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Scroll Navigation */}
      <ScrollNavigation />

      {/* Bottom Input Controls */}
      <div className="p-6 bg-black">
        {isVideoMode ? (
          <VideoInputControls
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onBeginningFrameUpload={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              };
              input.click();
            }}
            onEndingFrameUpload={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              };
              input.click();
            }}
            onSwitchToImage={() => navigate('/workspace?mode=image')}
            quality={quality}
            setQuality={setQuality}
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
          />
        ) : (
          <ImageInputControls
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onReferenceImageUpload={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              };
              input.click();
            }}
            onSwitchToVideo={() => navigate('/workspace?mode=video')}
            quality={quality}
            setQuality={setQuality}
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
          />
        )}
      </div>

      {/* Lightbox Viewer for Images */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={imageAssets[lightboxIndex]?.url}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              {imageAssets[lightboxIndex] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShowPromptInfo(imageAssets[lightboxIndex])}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLightboxIndex(null)}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={handleCloseVideoModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-lg pr-8">
              {selectedVideo?.prompt}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {selectedVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShowPromptInfo(selectedVideo)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
              <button
                onClick={handleCloseVideoModal}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="flex justify-center">
              <video
                controls
                className="max-w-full max-h-[70vh] rounded"
                autoPlay
              >
                <source src={selectedVideo.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Prompt Info Modal */}
      {currentPromptAsset && (
        <PromptInfoModal
          isOpen={showPromptModal}
          onClose={handleClosePromptModal}
          prompt={currentPromptAsset.prompt}
          quality={(currentPromptAsset.quality as 'fast' | 'high') || "fast"}
          mode={currentPromptAsset.type || 'image'}
          timestamp={currentPromptAsset.timestamp || new Date()}
          contentCount={1}
          itemId={currentPromptAsset.jobId}
          originalImageUrl={currentPromptAsset.type === 'image' ? currentPromptAsset.url : undefined}
        />
      )}

      {/* Library Import Modal */}
      <LibraryImportModal
        open={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onImport={(importedAssets) => {
          // Convert imported assets to workspace format
          const workspaceAssets: WorkspaceAsset[] = importedAssets.map(asset => ({
            id: `${asset.id}_${Date.now()}`,
            url: asset.url || '',
            jobId: asset.id,
            prompt: asset.prompt,
            type: asset.type,
            quality: asset.quality,
            modelType: asset.modelType,
            timestamp: asset.createdAt
          }));
          
          setWorkspaceAssets(prev => [...workspaceAssets, ...prev]);
          setShowLibraryModal(false);
          toast.success(`Added ${workspaceAssets.length} assets to workspace`);
        }}
      />
    </div>
  );
};

export default Workspace;
