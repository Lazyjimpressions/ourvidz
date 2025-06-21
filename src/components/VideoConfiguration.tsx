
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Coins, Image, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { projectAPI, usageAPI } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

interface VideoConfigurationProps {
  onConfigurationComplete: (config: VideoConfig & { projectId: string }) => void;
}

export interface VideoConfig {
  mediaType: 'image' | 'video';
  duration: number;
  sceneCount: number;
  estimatedCost: number;
}

const mediaOptions = [
  {
    type: 'image' as const,
    duration: 0,
    label: 'Static Image',
    description: 'Single AI-generated image',
    icon: Image,
    scenes: 1,
    cost: 5
  },
  {
    type: 'video' as const,
    duration: 5,
    label: '5 Second Video',
    description: 'Quick animation sequence',
    icon: Video,
    scenes: 1,
    cost: 15
  },
  {
    type: 'video' as const,
    duration: 10,
    label: '10 Second Video',
    description: 'Short story sequence',
    icon: Video,
    scenes: 2,
    cost: 30
  },
  {
    type: 'video' as const,
    duration: 30,
    label: '30 Second Video',
    description: 'Full story with multiple scenes',
    icon: Video,
    scenes: 6,
    cost: 90
  }
];

export const VideoConfiguration = ({ onConfigurationComplete }: VideoConfigurationProps) => {
  const [selectedOption, setSelectedOption] = useState(mediaOptions[1]);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a story or description",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create projects",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create project in database
      const project = await projectAPI.create({
        user_id: user.id,
        title: title.trim() || 'Untitled Project',
        original_prompt: prompt.trim(),
        media_type: selectedOption.type,
        duration: selectedOption.duration,
        scene_count: selectedOption.scenes,
        workflow_step: 'configuration'
      });

      // Log usage
      await usageAPI.logAction('project_created', 0, {
        media_type: selectedOption.type,
        duration: selectedOption.duration,
        scene_count: selectedOption.scenes
      });

      const config: VideoConfig & { projectId: string } = {
        projectId: project.id,
        mediaType: selectedOption.type,
        duration: selectedOption.duration,
        sceneCount: selectedOption.scenes,
        estimatedCost: selectedOption.cost,
      };

      onConfigurationComplete(config);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Project</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Project Title (Optional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome video project"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Story or Description *</Label>
          <Input
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to create..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Media Type & Duration</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mediaOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={`${option.type}-${option.duration}`}
                  onClick={() => setSelectedOption(option)}
                  className={`p-4 border rounded-lg text-left transition-all hover:bg-gray-50 ${
                    selectedOption === option 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{option.scenes} scene{option.scenes > 1 ? 's' : ''}</span>
                    <span>{option.cost} tokens</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium">{selectedOption.scenes} scene{selectedOption.scenes > 1 ? 's' : ''}</div>
              <div className="text-sm text-gray-600">
                {selectedOption.type === 'image' ? 'Static image' : `${selectedOption.duration / selectedOption.scenes}s each`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">{selectedOption.cost} tokens</div>
              <div className="text-sm text-gray-600">Estimated cost</div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleContinue} 
          className="w-full"
          disabled={loading || !prompt.trim()}
        >
          {loading ? "Creating Project..." : "Continue to Character Selection"}
        </Button>
      </CardContent>
    </Card>
  );
};
