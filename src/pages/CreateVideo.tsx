
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/PortalLayout";
import { VideoConfiguration, VideoConfig } from "@/components/VideoConfiguration";
import { CharacterManager, Character } from "@/components/CharacterManager";
import { StoryBreakdown } from "@/components/StoryBreakdown";
import { StoryboardGeneration } from "@/components/StoryboardGeneration";
import { EnhancedVideoGeneration } from "@/components/EnhancedVideoGeneration";
import { toast } from "sonner";

type WorkflowStep = 'config' | 'characters' | 'story' | 'storyboard' | 'generation' | 'complete';

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

const CreateVideo = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('config');
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [approvedScenes, setApprovedScenes] = useState<Scene[]>([]);
  const [approvedStoryboard, setApprovedStoryboard] = useState<SceneImage[]>([]);

  const stepTitles = {
    config: 'Video Configuration',
    characters: 'Character Setup',
    story: 'Story & Scene Breakdown',
    storyboard: 'Storyboard Generation',
    generation: 'Video Generation',
    complete: 'Complete'
  };

  const steps: WorkflowStep[] = ['config', 'characters', 'story', 'storyboard', 'generation'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleConfigurationComplete = (config: VideoConfig) => {
    setVideoConfig(config);
    setCurrentStep('characters');
  };

  const handleCharactersSelected = (characters: Character[]) => {
    setSelectedCharacters(characters);
    setCurrentStep('story');
  };

  const handleScenesApproved = (scenes: Scene[]) => {
    setApprovedScenes(scenes);
    setCurrentStep('storyboard');
  };

  const handleStoryboardApproved = (sceneImages: SceneImage[]) => {
    setApprovedStoryboard(sceneImages);
    setCurrentStep('generation');
  };

  const handleVideoGenerated = () => {
    toast.success("Your video has been generated successfully!");
    navigate("/library");
  };

  const handleBackStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'config':
        return <VideoConfiguration onConfigurationComplete={handleConfigurationComplete} />;
      
      case 'characters':
        return <CharacterManager onCharactersSelected={handleCharactersSelected} />;
      
      case 'story':
        return (
          <StoryBreakdown 
            config={videoConfig!}
            characters={selectedCharacters}
            onScenesApproved={handleScenesApproved}
          />
        );
      
      case 'storyboard':
        return (
          <StoryboardGeneration 
            scenes={approvedScenes}
            onStoryboardApproved={handleStoryboardApproved}
          />
        );
      
      case 'generation':
        return (
          <EnhancedVideoGeneration 
            config={videoConfig!}
            sceneImages={approvedStoryboard}
            onVideoGenerated={handleVideoGenerated}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <PortalLayout title="Create a New Video">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (currentStepIndex > 0) {
                  handleBackStep();
                } else {
                  navigate("/dashboard");
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{stepTitles[currentStep]}</h1>
              <div className="flex items-center gap-2 mt-2">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      index <= currentStepIndex ? 'bg-primary' : 'bg-gray-300'
                    }`} />
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 ${
                        index < currentStepIndex ? 'bg-primary' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {renderCurrentStep()}
        </div>
      </div>
    </PortalLayout>
  );
};

export default CreateVideo;
