
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { clearWorkspaceSessionData, clearSignedUrlCache, getSessionStorageStats } from '@/lib/utils';
import AutoAddWorkspace from '@/components/AutoAddWorkspace';

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
  
  // Workspace state - Simplified from test workspace
  const [workspace, setWorkspace] = useState<WorkspaceAsset[]>([]);
  const [imageJobs, setImageJobs] = useState<any[]>([]);
  const [videoJobs, setVideoJobs] = useState<any[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [autoAddedUrls, setAutoAddedUrls] = useState<Set<string>>(new Set());
  const [shouldClearWorkspace, setShouldClearWorkspace] = useState(false);
  
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

  // Load workspace from sessionStorage (from test workspace)
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
      
      setWorkspace([]);
      setAutoAddedUrls(new Set());
      return;
    }
    
    // Load existing workspace from current session
    const stored = sessionStorage.getItem('workspace');
    if (stored) {
      try {
        const loadedWorkspace = JSON.parse(stored);
        setWorkspace(loadedWorkspace);
        
        // Populate auto-added tracking with existing workspace URLs
        const existingUrls = new Set<string>(Array.from(loadedWorkspace, (asset: WorkspaceAsset) => asset.url));
        setAutoAddedUrls(existingUrls);
        
        console.log('🔄 Loaded workspace from current session');
      } catch (error) {
        console.error('Error parsing workspace data:', error);
        sessionStorage.removeItem('workspace');
        setWorkspace([]);
        setAutoAddedUrls(new Set());
      }
    }
  }, [user]);

  // Save workspace to sessionStorage with debouncing
  useEffect(() => {
    const timeout = setTimeout(() => {
      sessionStorage.setItem('workspace', JSON.stringify(workspace));
    }, 300);
    return () => clearTimeout(timeout);
  }, [workspace]);

  // Fetch both image and video jobs (from test workspace)
  useEffect(() => {
    if (!user) return;
    
    const fetchJobs = async () => {
      setWorkspaceLoading(true);
      try {
        // Fetch images
        const { data: imageData, error: imageError } = await supabase
          .from('images')
          .select('id, image_urls, prompt, metadata, created_at, generation_mode, quality')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (!imageError && imageData) {
          setImageJobs(imageData);
        }

        // Fetch videos
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('id, video_url, signed_url, metadata, created_at, resolution, thumbnail_url')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (!videoError && videoData) {
          setVideoJobs(videoData);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setWorkspaceLoading(false);
      }
    };

    fetchJobs();
  }, [user]);

  // Auto-add callback (from test workspace)
  const handleAutoAdd = useCallback((signedUrl: string, jobId: string, prompt: string, type: 'image' | 'video' = 'image', quality?: string, modelType?: string) => {
    // Check if this URL has already been auto-added to prevent duplicates
    if (autoAddedUrls.has(signedUrl)) {
      console.log(`Skipping auto-add for ${signedUrl} - already in workspace`);
      return;
    }

    const assetId = `${jobId}_${Date.now()}`;
    const newAsset: WorkspaceAsset = {
      id: assetId,
      url: signedUrl,
      jobId,
      prompt,
      type,
      quality,
      modelType,
      timestamp: new Date()
    };
    
    // Check if this exact URL is already in workspace (double-check)
    const existingAsset = workspace.find(asset => asset.url === signedUrl);
    if (!existingAsset) {
      setWorkspace(prev => [newAsset, ...prev]);
      setAutoAddedUrls(prev => new Set([...prev, signedUrl]));
      console.log(`Auto-added ${type} asset ${assetId} to workspace`);
    }
  }, [workspace, autoAddedUrls]);

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

      // Use the same format as the original image
      const originalFormat = tile.modelType === 'SDXL' 
        ? (tile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
        : (tile.quality === 'high' ? 'image_high' : 'image_fast');

      await generateContent({
        format: originalFormat,
        prompt: tile.prompt,
        referenceImageUrl: tile.url,
        batchCount: 3,
        metadata: {
          reference_image: true,
          similarity_strength: 0.8,
          model_variant: tile.modelType === 'SDXL' ? 'lustify_sdxl' : 'wan_2_1_1_3b'
        }
      });

      toast.success('Generating 3 more images like this one!');
    } catch (error) {
      console.error('❌ More like this generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage);
    }
  };

  const handleRemoveFromWorkspace = (assetId: string) => {
    setWorkspace(prev => {
      const assetToRemove = prev.find(asset => asset.id === assetId);
      if (assetToRemove) {
        // Remove the URL from tracking when asset is removed
        setAutoAddedUrls(prevUrls => {
          const newUrls = new Set(prevUrls);
          newUrls.delete(assetToRemove.url);
          return newUrls;
        });
      }
      return prev.filter(asset => asset.id !== assetId);
    });
  };

  const clearWorkspace = () => {
    setWorkspace([]);
    setAutoAddedUrls(new Set());
  };

  const handleImageClick = (asset: WorkspaceAsset) => {
    if (asset.type === 'video') {
      setSelectedVideo(asset);
    } else {
      // Find the index in the filtered image assets array for lightbox
      const imageAssets = workspace.filter(a => a.type !== 'video');
      const imageIndex = imageAssets.findIndex(a => a.id === asset.id);
      setLightboxIndex(imageIndex);
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

  // Handle workspace clearing from header
  useEffect(() => {
    if (shouldClearWorkspace) {
      clearWorkspace();
      setShouldClearWorkspace(false);
    }
  }, [shouldClearWorkspace]);

  // Show loading state while auth is being determined
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
  const imageAssets = workspace.filter(asset => asset.type !== 'video');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Fixed Header */}
      <WorkspaceHeader onClearWorkspace={() => {
        setShouldClearWorkspace(true);
      }} />

      {/* Main Content Area */}
      <div className="flex-1 pt-12">
        {/* Current Workspace */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Current Workspace ({workspace.length} assets)</h2>
            {workspace.length > 0 && (
              <Button variant="destructive" onClick={clearWorkspace}>
                Clear Workspace
              </Button>
            )}
          </div>
          
          {workspace.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {workspace.map((asset) => (
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
            onSwitchToVideo={() => navigate('/workspace?mode=video')}
            quality={quality}
            setQuality={setQuality}
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
            numImages={1}
            setNumImages={() => {}}
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

      {/* Auto-add component for background processing */}
      <AutoAddWorkspace
        onAutoAdd={handleAutoAdd}
        imageJobs={imageJobs}
        videoJobs={videoJobs}
      />

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
          
          setWorkspace(prev => [...workspaceAssets, ...prev]);
          toast.success(`Added ${workspaceAssets.length} asset${workspaceAssets.length !== 1 ? 's' : ''} to workspace`);
        }}
      />
    </div>
  );
};

export default Workspace;
