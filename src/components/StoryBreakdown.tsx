
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { VideoConfig } from "./VideoConfiguration";
import { Character } from "./CharacterManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scene {
  id: string;
  sceneNumber: number;
  description: string;
  enhancedPrompt: string;
}

interface StoryBreakdownProps {
  config: VideoConfig;
  characters: Character[];
  onScenesApproved: (scenes: Scene[], projectId?: string) => void;
}

// Content templates for different media types
const contentTemplates = {
  image: [
    "A magical forest scene with glowing flowers and mystical creatures",
    "A futuristic cityscape at sunset with flying vehicles", 
    "A cozy library filled with floating books and warm light"
  ],
  video: [
    "A character discovers a hidden door and steps through into a magical world",
    "An inventor creates a wonderful gadget that comes to life and helps solve a problem",
    "Friends embark on an adventure to find a lost treasure in an enchanted forest"
  ]
};

export const StoryBreakdown = ({ config, characters, onScenesApproved }: StoryBreakdownProps) => {
  const [story, setStory] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const templates = contentTemplates[config.mediaType];

  const handleTemplateSelect = (template: string) => {
    setStory(template);
  };

  const handleProcessStory = async () => {
    if (!story.trim()) return;

    setIsProcessing(true);
    
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Create project record
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: config.mediaType === 'image' ? 'Image Creation' : 'Video Creation',
          original_prompt: story,
          media_type: config.mediaType,
          scene_count: config.sceneCount
        })
        .select()
        .single();

      if (projectError) throw projectError;
      setCurrentProjectId(project.id);

      if (config.mediaType === 'image') {
        // For images, create a single scene and enhance the prompt
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            project_id: project.id,
            user_id: user.id,
            status: 'draft',
            duration: 0,
            format: 'text'
          })
          .select()
          .single();

        if (videoError) throw videoError;

        // Queue enhancement job
        const { data, error } = await supabase.functions.invoke('queue-job', {
          body: {
            jobType: 'enhance',
            videoId: video.id,
            projectId: project.id,
            metadata: {
              prompt: story,
              characters: characters.map(c => `${c.name} (${c.description || 'no description'})`),
              mode: 'image'
            }
          }
        });

        if (error) throw error;

        // Poll for enhancement completion
        const pollForCompletion = () => {
          const pollInterval = setInterval(async () => {
            try {
              const { data: updatedProject, error: pollError } = await supabase
                .from('projects')
                .select('enhanced_prompt')
                .eq('id', project.id)
                .single();

              if (pollError) throw pollError;

              if (updatedProject.enhanced_prompt) {
                clearInterval(pollInterval);
                
                const enhancedScene: Scene = {
                  id: 'scene-1',
                  sceneNumber: 1,
                  description: story,
                  enhancedPrompt: updatedProject.enhanced_prompt,
                };

                setScenes([enhancedScene]);
                setIsProcessing(false);
                toast.success('Prompt enhanced successfully!');
              }
            } catch (error) {
              clearInterval(pollInterval);
              throw error;
            }
          }, 2000);

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(pollInterval);
            if (isProcessing) {
              setIsProcessing(false);
              throw new Error('Enhancement timeout');
            }
          }, 30000);
        };

        pollForCompletion();

      } else {
        // For videos, generate scenes based on the story and scene count
        const generatedScenes: Scene[] = Array.from({ length: config.sceneCount }, (_, index) => {
          const sceneNumber = index + 1;
          const description = `Scene ${sceneNumber}: ${story} - part ${sceneNumber}`;
          const enhancedPrompt = `Cinematic video scene ${sceneNumber}: ${story}${characters.length > 0 ? ` with characters: ${characters.map(c => `${c.name} (${c.appearance_tags ? c.appearance_tags.join(', ') : 'no appearance details'})`).join(', ')}` : ''}`;

          return {
            id: `scene-${sceneNumber}`,
            sceneNumber,
            description,
            enhancedPrompt,
          };
        });

        setScenes(generatedScenes);
        setIsProcessing(false);
      }

    } catch (error) {
      console.error('Error processing story:', error);
      setIsProcessing(false);
      toast.error(`Failed to process story: ${error.message}`);
    }
  };

  const handleSceneEdit = (sceneId: string, newDescription: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId 
        ? { ...scene, description: newDescription }
        : scene
    ));
  };

  const handleApproveScenes = () => {
    onScenesApproved(scenes, currentProjectId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {config.mediaType === 'image' ? 'Image Description' : 'Story Input & Scene Breakdown'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Templates */}
        <div className="space-y-2">
          <Label>Quick Start Templates</Label>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateSelect(template)}
                className="p-2 text-sm text-left border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="story-input">
            {config.mediaType === 'image' ? 'Describe your image' : 'Your Story'}
          </Label>
          <Textarea
            id="story-input"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={
              config.mediaType === 'image' 
                ? "Describe the image you want to create in detail..."
                : "Write your story in natural language. The AI will break it down into scenes and enhance it for video generation..."
            }
            className="min-h-[120px]"
          />
        </div>

        {characters.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">Characters in this story:</div>
            <div className="text-sm text-blue-700">
              {characters.map(c => c.name).join(', ')}
            </div>
          </div>
        )}

        <Button 
          onClick={handleProcessStory}
          disabled={!story.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {config.mediaType === 'image' ? 'Enhancing prompt...' : 'Processing...'}
            </>
          ) : (
            config.mediaType === 'image' ? "Enhance Description" : "Break Down Into Scenes"
          )}
        </Button>

        {scenes.length > 0 && (
          <div className="space-y-4">
            <Label>
              {config.mediaType === 'image' ? 'Enhanced Description' : `Scene Breakdown (${scenes.length} scenes)`}
            </Label>
            <div className="space-y-3">
              {scenes.map((scene) => (
                <div key={scene.id} className="border rounded-lg p-4">
                  <div className="font-medium mb-2">
                    {config.mediaType === 'image' ? 'Description' : `Scene ${scene.sceneNumber}`}
                  </div>
                  <Textarea
                    value={scene.description}
                    onChange={(e) => handleSceneEdit(scene.id, e.target.value)}
                    className="min-h-[60px] mb-2"
                  />
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    AI Enhanced: {scene.enhancedPrompt}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleApproveScenes} className="w-full">
              {config.mediaType === 'image' ? 'Continue to Image Generation' : 'Continue to Storyboard Generation'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
