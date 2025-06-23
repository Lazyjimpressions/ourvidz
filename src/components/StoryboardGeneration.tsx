import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Image, CheckCircle, Edit, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scene {
  id: string;
  sceneNumber: number;
  description: string;
  enhancedPrompt: string;
}

interface SceneImage {
  sceneId: string;
  imageUrl: string;
  approved: boolean;
}

interface StoryboardGenerationProps {
  scenes: Scene[];
  projectId: string;
  onStoryboardApproved: (sceneImages: SceneImage[]) => void;
}

export const StoryboardGeneration = ({ scenes, projectId, onStoryboardApproved }: StoryboardGenerationProps) => {
  const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
  const [generatingScenes, setGeneratingScenes] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [sceneErrors, setSceneErrors] = useState<Map<string, string>>(new Map());
  const [debugInfo, setDebugInfo] = useState<Map<string, any>>(new Map());

  const checkVideoStatus = async (videoId: string, sceneNumber: number) => {
    try {
      console.log(`🔍 Manually checking video status for scene ${sceneNumber}, videoId: ${videoId}`);
      
      const { data: video, error } = await supabase
        .from('videos')
        .select('id, status, preview_url, created_at, updated_at')
        .eq('id', videoId)
        .single();

      if (error) {
        console.error(`❌ Error checking video status for scene ${sceneNumber}:`, error);
        return;
      }

      console.log(`📊 Video status for scene ${sceneNumber}:`, video);
      
      setDebugInfo(prev => {
        const newInfo = new Map(prev);
        newInfo.set(videoId, {
          lastChecked: new Date().toISOString(),
          videoData: video
        });
        return newInfo;
      });

      if (video.status === 'completed' && video.preview_url) {
        console.log(`✅ Found completed video for scene ${sceneNumber} with URL:`, video.preview_url);
        
        const scene = scenes.find(s => s.sceneNumber === sceneNumber);
        if (scene) {
          const newSceneImage: SceneImage = {
            sceneId: scene.id,
            imageUrl: video.preview_url,
            approved: false,
          };

          setSceneImages(prev => {
            const filtered = prev.filter(img => img.sceneId !== scene.id);
            return [...filtered, newSceneImage];
          });

          setGeneratingScenes(prev => {
            const newSet = new Set(prev);
            newSet.delete(scene.id);
            return newSet;
          });

          setSceneErrors(prev => {
            const newErrors = new Map(prev);
            newErrors.delete(scene.id);
            return newErrors;
          });

          toast.success(`Scene ${sceneNumber} image found and loaded!`);
        }
      } else if (video.status === 'failed') {
        console.log(`❌ Video generation failed for scene ${sceneNumber}`);
        const scene = scenes.find(s => s.sceneNumber === sceneNumber);
        if (scene) {
          setSceneErrors(prev => {
            const newErrors = new Map(prev);
            newErrors.set(scene.id, 'Generation failed on server - check logs');
            return newErrors;
          });
          
          setGeneratingScenes(prev => {
            const newSet = new Set(prev);
            newSet.delete(scene.id);
            return newSet;
          });
        }
      } else {
        console.log(`⏳ Video still processing for scene ${sceneNumber}, status: ${video.status}`);
      }
    } catch (error) {
      console.error(`💥 Exception checking video status for scene ${sceneNumber}:`, error);
    }
  };

  const generateSceneImage = async (scene: Scene) => {
    setGeneratingScenes(prev => new Set(prev).add(scene.id));
    setSceneErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(scene.id);
      return newErrors;
    });
    
    try {
      console.log(`🚀 Starting generation for scene ${scene.sceneNumber}:`, scene.enhancedPrompt);
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Create a video record for scene image generation
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'draft',
          duration: 0, // 0 for images
          format: 'png'
        })
        .select()
        .single();

      if (videoError) throw videoError;

      console.log(`📝 Created video record for scene ${scene.sceneNumber}:`, video.id);

      // Queue image generation job using existing infrastructure
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'preview',
          videoId: video.id,
          projectId: projectId,
          metadata: {
            prompt: scene.enhancedPrompt,
            sceneNumber: scene.sceneNumber,
            sceneId: scene.id
          }
        }
      });

      if (error) throw error;

      console.log(`✅ Job queued for scene ${scene.sceneNumber}:`, data);

      // Set up real-time subscription for this specific video
      console.log(`📡 Setting up real-time subscription for video ${video.id}`);
      const videoSubscription = supabase
        .channel(`video-${video.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${video.id}`
        }, (payload) => {
          console.log(`🔔 Real-time update for scene ${scene.sceneNumber}:`, payload);
          const updatedVideo = payload.new as any;
          
          if (updatedVideo.status === 'completed' && updatedVideo.preview_url) {
            console.log(`🎉 Scene ${scene.sceneNumber} completed via real-time! URL:`, updatedVideo.preview_url);
            
            const newSceneImage: SceneImage = {
              sceneId: scene.id,
              imageUrl: updatedVideo.preview_url,
              approved: false,
            };

            setSceneImages(prev => {
              const filtered = prev.filter(img => img.sceneId !== scene.id);
              return [...filtered, newSceneImage];
            });

            setGeneratingScenes(prev => {
              const newSet = new Set(prev);
              newSet.delete(scene.id);
              return newSet;
            });

            toast.success(`Scene ${scene.sceneNumber} image generated successfully`);
            supabase.removeChannel(videoSubscription);
          } else if (updatedVideo.status === 'failed') {
            console.error(`❌ Scene ${scene.sceneNumber} generation failed via real-time`);
            const errorMessage = 'Generation failed on server - please check server logs for details';
            
            setSceneErrors(prev => {
              const newErrors = new Map(prev);
              newErrors.set(scene.id, errorMessage);
              return newErrors;
            });

            setGeneratingScenes(prev => {
              const newSet = new Set(prev);
              newSet.delete(scene.id);
              return newSet;
            });
            
            toast.error(`Scene ${scene.sceneNumber} generation failed: ${errorMessage}`);
            supabase.removeChannel(videoSubscription);
          } else if (updatedVideo.status === 'processing') {
            console.log(`⚡ Scene ${scene.sceneNumber} now processing...`);
          }
        })
        .subscribe((status) => {
          console.log(`📡 Subscription status for scene ${scene.sceneNumber}:`, status);
        });

      // Enhanced polling with better logging
      const pollForCompletion = () => {
        let pollCount = 0;
        const maxPolls = 120; // 10 minutes at 5-second intervals
        
        const pollInterval = setInterval(async () => {
          try {
            pollCount++;
            console.log(`🔄 Polling scene ${scene.sceneNumber}, attempt ${pollCount}/${maxPolls} for video ${video.id}`);
            
            const { data: updatedVideo, error: pollError } = await supabase
              .from('videos')
              .select('id, status, preview_url, created_at, updated_at')
              .eq('id', video.id)
              .single();

            if (pollError) {
              console.error(`❌ Poll error for scene ${scene.sceneNumber}:`, pollError);
              throw pollError;
            }

            console.log(`📊 Poll result for scene ${scene.sceneNumber}:`, updatedVideo);

            if (updatedVideo.status === 'completed' && updatedVideo.preview_url) {
              clearInterval(pollInterval);
              console.log(`🎉 Scene ${scene.sceneNumber} completed via polling! URL:`, updatedVideo.preview_url);
              
              const newSceneImage: SceneImage = {
                sceneId: scene.id,
                imageUrl: updatedVideo.preview_url,
                approved: false,
              };

              setSceneImages(prev => {
                const filtered = prev.filter(img => img.sceneId !== scene.id);
                return [...filtered, newSceneImage];
              });

              setGeneratingScenes(prev => {
                const newSet = new Set(prev);
                newSet.delete(scene.id);
                return newSet;
              });

              toast.success(`Scene ${scene.sceneNumber} image generated successfully`);
            } else if (updatedVideo.status === 'failed') {
              clearInterval(pollInterval);
              console.error(`❌ Scene ${scene.sceneNumber} failed via polling`);
              const errorMessage = 'Generation failed on server - please check server logs for details';
              
              setSceneErrors(prev => {
                const newErrors = new Map(prev);
                newErrors.set(scene.id, errorMessage);
                return newErrors;
              });

              setGeneratingScenes(prev => {
                const newSet = new Set(prev);
                newSet.delete(scene.id);
                return newSet;
              });
              
              throw new Error(errorMessage);
            } else if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              console.warn(`⏰ Scene ${scene.sceneNumber} polling timeout after ${maxPolls} attempts`);
              const timeoutError = 'Generation timeout after 10 minutes - server may be overloaded';
              
              setSceneErrors(prev => {
                const newErrors = new Map(prev);
                newErrors.set(scene.id, timeoutError);
                return newErrors;
              });

              setGeneratingScenes(prev => {
                const newSet = new Set(prev);
                newSet.delete(scene.id);
                return newSet;
              });
              
              throw new Error(timeoutError);
            } else {
              console.log(`⏳ Scene ${scene.sceneNumber} still ${updatedVideo.status}, continuing to poll...`);
            }
          } catch (error) {
            clearInterval(pollInterval);
            console.error(`💥 Polling error for scene ${scene.sceneNumber}:`, error);
            throw error;
          }
        }, 5000); // Poll every 5 seconds
      };

      pollForCompletion();

    } catch (error) {
      console.error(`💥 Error generating scene ${scene.sceneNumber}:`, error);
      const errorMessage = error.message || 'Failed to start generation';
      
      setSceneErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.set(scene.id, errorMessage);
        return newErrors;
      });
      
      toast.error(`Failed to generate scene ${scene.sceneNumber} image: ${errorMessage}`);
      
      setSceneImages(prev => prev.filter(img => img.sceneId !== scene.id));
      setGeneratingScenes(prev => {
        const newSet = new Set(prev);
        newSet.delete(scene.id);
        return newSet;
      });
    }
  };

  const refreshSceneStatus = async (scene: Scene) => {
    console.log(`🔄 Manual refresh requested for scene ${scene.sceneNumber}`);
    
    try {
      // Look for any video records for this scene
      const { data: videos, error } = await supabase
        .from('videos')
        .select('id, status, preview_url, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        return;
      }

      console.log(`📋 Found ${videos.length} videos for project ${projectId}:`, videos);

      // Find the most recent video that might correspond to this scene
      const recentVideo = videos.find(v => v.status === 'completed' && v.preview_url);
      
      if (recentVideo) {
        console.log(`🎯 Found completed video for manual refresh:`, recentVideo);
        await checkVideoStatus(recentVideo.id, scene.sceneNumber);
      } else {
        toast.info(`No completed videos found for scene ${scene.sceneNumber}`);
      }
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast.error('Failed to refresh scene status');
    }
  };

  const generateAllScenes = async () => {
    setIsGeneratingAll(true);
    
    try {
      const scenesToGenerate = scenes.filter(scene => 
        !sceneImages.find(img => img.sceneId === scene.id) && 
        !sceneErrors.has(scene.id)
      );

      console.log(`Generating images for ${scenesToGenerate.length} scenes`);

      // Generate scenes sequentially to avoid overwhelming the system
      for (const scene of scenesToGenerate) {
        await generateSceneImage(scene);
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast.success('All scene images queued for generation');
    } catch (error) {
      console.error('Error generating all scenes:', error);
      toast.error('Failed to queue some scene images');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const toggleSceneApproval = (sceneId: string) => {
    setSceneImages(prev => prev.map(img => 
      img.sceneId === sceneId 
        ? { ...img, approved: !img.approved }
        : img
    ));
  };

  const regenerateScene = (scene: Scene) => {
    setSceneImages(prev => prev.filter(img => img.sceneId !== scene.id));
    setSceneErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(scene.id);
      return newErrors;
    });
    generateSceneImage(scene);
  };

  const allScenesApproved = scenes.every(scene => {
    const sceneImage = sceneImages.find(img => img.sceneId === scene.id);
    return sceneImage?.approved;
  });

  const handleContinueToGeneration = () => {
    onStoryboardApproved(sceneImages);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storyboard Generation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Generate AI images for each scene using Wan 2.1 before creating the final video
            <div className="text-xs text-amber-600 mt-1">
              ⏱️ Video generation can take up to 10 minutes per scene
            </div>
          </div>
          <Button 
            onClick={generateAllScenes}
            disabled={isGeneratingAll || scenes.length === 0}
            variant="outline"
          >
            {isGeneratingAll ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating All...
              </>
            ) : (
              "Generate All Scenes"
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenes.map((scene) => {
            const sceneImage = sceneImages.find(img => img.sceneId === scene.id);
            const isGenerating = generatingScenes.has(scene.id);
            const hasError = sceneErrors.has(scene.id);
            const errorMessage = sceneErrors.get(scene.id);
            const debug = debugInfo.get(scene.id);

            return (
              <div key={scene.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">Scene {scene.sceneNumber}</div>
                    <div className="text-sm text-gray-600 mt-1">{scene.description}</div>
                    <div className="text-xs text-gray-400 mt-1 bg-gray-50 p-2 rounded">
                      AI Prompt: {scene.enhancedPrompt.substring(0, 100)}...
                    </div>
                    {debug && (
                      <div className="text-xs text-blue-500 mt-1 bg-blue-50 p-2 rounded">
                        Last checked: {new Date(debug.lastChecked).toLocaleTimeString()}
                        <br />
                        Status: {debug.videoData?.status || 'unknown'}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshSceneStatus(scene)}
                    disabled={isGenerating}
                    title="Refresh scene status"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner />
                      <span className="text-sm text-gray-600">Generating with Wan 2.1...</span>
                      <span className="text-xs text-gray-500">This may take up to 10 minutes</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshSceneStatus(scene)}
                        className="mt-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check Status
                      </Button>
                    </div>
                  ) : sceneImage ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={sceneImage.imageUrl} 
                        alt={`Scene ${scene.sceneNumber}`}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          console.error('Image load error for scene:', scene.sceneNumber, 'URL:', sceneImage.imageUrl);
                          setSceneErrors(prev => {
                            const newErrors = new Map(prev);
                            newErrors.set(scene.id, 'Failed to load generated image - invalid URL from server');
                            return newErrors;
                          });
                          setSceneImages(prev => prev.filter(img => img.sceneId !== scene.id));
                        }}
                      />
                      {sceneImage.approved && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ) : hasError ? (
                    <div className="flex flex-col items-center gap-2 text-red-500 p-4 text-center">
                      <div className="text-sm font-medium">Generation Failed</div>
                      <div className="text-xs text-red-400 break-words max-w-full">
                        {errorMessage}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Check server logs for detailed error information
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshSceneStatus(scene)}
                        className="mt-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check Again
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Image className="h-8 w-8" />
                      <span className="text-sm">No image generated</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshSceneStatus(scene)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check Status
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {sceneImage ? (
                    <>
                      <Button
                        variant={sceneImage.approved ? "default" : "outline"}
                        onClick={() => toggleSceneApproval(scene.id)}
                        className="flex-1"
                      >
                        {sceneImage.approved ? "Approved" : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => regenerateScene(scene)}
                        disabled={isGenerating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => generateSceneImage(scene)}
                      disabled={isGenerating}
                      className="w-full"
                      variant={hasError ? "destructive" : "default"}
                    >
                      {hasError ? "Retry Generation" : "Generate AI Image"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sceneImages.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 mb-3">
              Progress: {sceneImages.filter(img => img.approved).length} of {scenes.length} scenes approved
            </div>
            <Button 
              onClick={handleContinueToGeneration}
              disabled={!allScenesApproved}
              className="w-full"
            >
              Generate Final Video
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
