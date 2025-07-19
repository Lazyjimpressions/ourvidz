
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeneration } from '@/hooks/useGeneration';

import { ImageInputControls } from "@/components/ImageInputControls";
import { VideoInputControls } from "@/components/VideoInputControls";
import { MultiReferencePanel } from "@/components/workspace/MultiReferencePanel";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { LibraryImportModal } from "@/components/LibraryImportModal";
import { WorkspaceContentModal } from "@/components/WorkspaceContentModal";
import { PromptInfoModal } from "@/components/PromptInfoModal";
import AutoAddWorkspace from "@/components/AutoAddWorkspace";
import { ReferenceImage } from "@/types/workspace";
import { GenerationRequest } from "@/types/generation";
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Info, Trash2, Minus, Copy } from 'lucide-react';

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
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(4);
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [enhanced, setEnhanced] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [referenceStrength, setReferenceStrength] = useState(0.8);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [videoReferences, setVideoReferences] = useState<{ start?: ReferenceImage; end?: ReferenceImage; }>({});
  const isMobile = useIsMobile();

  // Workspace state - using original approach
  const [workspace, setWorkspace] = useState<WorkspaceAsset[]>([]);
  const [imageJobs, setImageJobs] = useState<any[]>([]);
  const [videoJobs, setVideoJobs] = useState<any[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [autoAddedUrls, setAutoAddedUrls] = useState<Set<string>>(new Set());
  
  // Modal states
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<WorkspaceAsset | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentPromptAsset, setCurrentPromptAsset] = useState<WorkspaceAsset | null>(null);

  // Use the real generation hook
  const { generateContent, isGenerating, currentJob, error } = useGeneration();

  // Ensure user is authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Load workspace from sessionStorage (original approach)
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

  // Fetch both image and video jobs (from original)
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

  // Auto-add callback (from original)
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

  const handleModeSwitch = (newMode: 'image' | 'video') => {
    setMode(newMode);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt.');
      return;
    }

    if (!user) {
      toast.error('Please sign in to generate content.');
      return;
    }

    try {
      // Determine the generation format based on mode, quality, and enhanced settings
      let format: string;
      if (mode === 'image') {
        if (enhanced) {
          format = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
        } else {
          format = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
        }
      } else {
        if (enhanced) {
          format = quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
        } else {
          format = quality === 'high' ? 'video_high' : 'video_fast';
        }
      }

      // Prepare the generation request
      const generationRequest: GenerationRequest = {
        format: format as any,
        prompt: prompt.trim(),
        metadata: {
          credits: quality === 'high' ? 2 : 1,
          num_images: mode === 'image' ? numImages : 1,
        }
      };

      // Add reference image if present
      const characterRef = references?.find(ref => ref.type === 'character');
      if (characterRef?.url && mode === 'image') {
        generationRequest.referenceImageUrl = characterRef.url;
        generationRequest.metadata = {
          ...generationRequest.metadata,
          reference_strength: referenceStrength,
          reference_type: 'character'
        };
      }

      // Add video references if present
      if (mode === 'video') {
        if (videoReferences?.start?.url) {
          generationRequest.startReferenceImageUrl = videoReferences.start.url;
        }
        if (videoReferences?.end?.url) {
          generationRequest.endReferenceImageUrl = videoReferences.end.url;
        }
      }

      console.log('Starting generation with request:', generationRequest);
      await generateContent(generationRequest);
      
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.error(`Generation failed: ${error.message || 'Unknown error'}`);
    }
  }, [prompt, numImages, quality, enhanced, mode, references, videoReferences, referenceStrength, user, generateContent]);

  const handleReferenceChange = (newReferences: ReferenceImage[]) => {
    setReferences(newReferences.length > 0
      ? [...(references || []).filter(ref => !newReferences.find(newRef => newRef.type === ref.type)), ...newReferences]
      : (references || []).filter(ref => !newReferences.find(newRef => newRef.type === ref.type))
    );
  };

  const handleVideoReferenceChange = (newVideoReferences: { start?: ReferenceImage; end?: ReferenceImage; }) => {
    setVideoReferences({
      ...videoReferences,
      ...newVideoReferences,
    });
  };

  const handleClearReferences = () => {
    setReferences([]);
  };

  const handleClearWorkspace = () => {
    setWorkspace([]);
    setAutoAddedUrls(new Set());
    sessionStorage.removeItem('workspace');
    toast.success('Workspace cleared');
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
    toast.success('Removed from workspace');
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

  const handleDownload = async (asset: WorkspaceAsset) => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${asset.type}-${asset.id}.${asset.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleImport = (assets: any[]) => {
    // Convert imported assets to workspace format
    const workspaceAssets: WorkspaceAsset[] = assets.map(asset => ({
      id: `${asset.id}_${Date.now()}`,
      url: asset.url || asset.signed_url || '',
      jobId: asset.id,
      prompt: asset.prompt,
      type: asset.type,
      quality: asset.quality,
      modelType: asset.modelType,
      timestamp: asset.createdAt
    }));
    
    setWorkspace(prev => [...workspaceAssets, ...prev]);
    toast.success(`Added ${workspaceAssets.length} asset${workspaceAssets.length !== 1 ? 's' : ''} to workspace`);
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Filter workspace assets for lightbox (images only)
  const imageAssets = workspace.filter(asset => asset.type !== 'video');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WorkspaceHeader onClearWorkspace={handleClearWorkspace} />

      {/* Main content area */}
      <main className="flex-1 pt-20 pb-32">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Multi-Reference Panel */}
          {mode === 'image' && (
            <div className="mb-6">
              <MultiReferencePanel
                mode={mode}
                strength={referenceStrength}
                onStrengthChange={setReferenceStrength}
                onReferencesChange={handleReferenceChange}
                onClear={handleClearReferences}
              />
            </div>
          )}

          {/* Current Workspace */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Current Workspace ({workspace.length} assets)</h2>
              {workspace.length > 0 && (
                <Button variant="destructive" onClick={handleClearWorkspace}>
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
      </main>

      {/* Fixed footer with input controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          {mode === 'image' ? (
            <ImageInputControls
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onSwitchToVideo={() => handleModeSwitch('video')}
              quality={quality}
              setQuality={setQuality}
              onLibraryClick={() => setShowLibrary(true)}
              enhanced={enhanced}
              setEnhanced={setEnhanced}
              numImages={numImages}
              setNumImages={setNumImages}
              referenceImage={
                references?.find(ref => ref.type === 'character')?.file || null
              }
              referenceImageUrl={
                references?.find(ref => ref.type === 'character')?.url
              }
              onReferenceImageChange={(file, url) => {
                handleReferenceChange([{
                  type: 'character' as const,
                  file,
                  url
                }]);
              }}
              onClearReference={() => {
                setReferences(prev => prev?.filter(ref => ref.type !== 'character') || []);
              }}
            />
          ) : (
            <VideoInputControls
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onSwitchToImage={() => handleModeSwitch('image')}
              quality={quality}
              setQuality={setQuality}
              onLibraryClick={() => setShowLibrary(true)}
              enhanced={enhanced}
              setEnhanced={setEnhanced}
              startReferenceImage={
                videoReferences?.start?.file || null
              }
              startReferenceImageUrl={
                videoReferences?.start?.url
              }
              endReferenceImage={
                videoReferences?.end?.file || null
              }
              endReferenceImageUrl={
                videoReferences?.end?.url
              }
              onStartReferenceChange={(file, url) => {
                handleVideoReferenceChange({
                  ...videoReferences,
                  start: { file, url }
                });
              }}
              onEndReferenceChange={(file, url) => {
                handleVideoReferenceChange({
                  ...videoReferences,
                  end: { file, url }
                });
              }}
              onClearStartReference={() => {
                handleVideoReferenceChange({
                  ...videoReferences,
                  start: undefined
                });
              }}
              onClearEndReference={() => {
                handleVideoReferenceChange({
                  ...videoReferences,
                  end: undefined
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Lightbox Viewer for Images */}
      {lightboxIndex !== null && imageAssets[lightboxIndex] && (
        <WorkspaceContentModal
          tiles={imageAssets.map(asset => ({
            id: asset.id,
            originalAssetId: asset.jobId,
            type: asset.type as 'image' | 'video' || 'image',
            url: asset.url,
            prompt: asset.prompt,
            timestamp: asset.timestamp || new Date(),
            quality: (asset.quality as 'fast' | 'high') || 'fast',
            modelType: asset.modelType,
          }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onRemoveFromWorkspace={handleRemoveFromWorkspace}
        />
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
          modelType={currentPromptAsset.modelType}
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
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default Workspace;
