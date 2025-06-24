import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/PortalLayout";
import { VideoConfiguration, VideoConfig } from "@/components/VideoConfiguration";
import { Character } from "@/components/CharacterManager";
import { CharacterSelection } from "@/components/CharacterSelection";
import { StoryBreakdown } from "@/components/StoryBreakdown";
import { StoryboardGeneration } from "@/components/StoryboardGeneration";
import { SimpleVideoGeneration } from "@/components/SimpleVideoGeneration";
import { ImageGenerationStep } from "@/components/ImageGenerationStep";
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
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const stepTitles = {
    config: 'Choose Creation Type',
    characters: 'Character Setup',
    story: videoConfig?.mediaType === 'image' ? 'Image Description' : 'Story & Scene Breakdown',
    storyboard: 'Storyboard Generation',
    generation: videoConfig?.mediaType === 'image' ? 'Image Generation' : 'Video Generation',
    complete: 'Complete'
  };

  // Dynamic steps based on configuration
  const getSteps = (): WorkflowStep[] => {
    if (videoConfig?.mediaType === 'image') {
      return ['config', 'characters', 'story', 'generation'];
    } else {
      return ['config', 'characters', 'story', 'storyboard', 'generation'];
    }
  };

  const steps = getSteps();
  const currentStepIndex = steps.indexOf(currentStep);

  const handleConfigurationComplete = (config: VideoConfig) => {
    setVideoConfig(config);
    setCurrentStep('characters');
  };

  const handleCharactersSelected = (characters: Character[]) => {
    setSelectedCharacters(characters);
    setCurrentStep('story');
  };

  const handleSkipCharacters = () => {
    setSelectedCharacters([]);
    setCurrentStep('story');
  };

  const handleScenesApproved = (scenes: Scene[], projectId?: string) => {
    setApprovedScenes(scenes);
    if (projectId) {
      setCurrentProjectId(projectId);
    }
    
    if (videoConfig?.mediaType === 'image') {
      // For images, go directly to image generation
      setCurrentStep('generation');
    } else {
      // For videos, go to storyboard generation
      setCurrentStep('storyboard');
    }
  };

  const handleStoryboardApproved = (sceneImages: SceneImage[]) => {
    setApprovedStoryboard(sceneImages);
    setCurrentStep('generation');
  };

  const handleGenerationComplete = () => {
    const mediaType = videoConfig?.mediaType === 'image' ? 'image' : 'video';
    toast.success(`Your ${mediaType} has been generated successfully!`);
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
        return (
          <CharacterSelection 
            onCharactersSelected={handleCharactersSelected}
            onSkipCharacters={handleSkipCharacters}
          />
        );
      
      case 'story':
        return (
          <StoryBreakdown 
            config={videoConfig!}
            characters={selectedCharacters}
            onScenesApproved={handleScenesApproved}
          />
        );
      
      case 'storyboard':
        return currentProjectId && videoConfig?.mediaType === 'video' ? (
          <StoryboardGeneration 
            scenes={approvedScenes}
            projectId={currentProjectId}
            onStoryboardApproved={handleStoryboardApproved}
          />
        ) : null;
      
      case 'generation':
        if (!currentProjectId) return null;
        
        if (videoConfig?.mediaType === 'image') {
          return (
            <ImageGenerationStep 
              scenes={approvedScenes}
              projectId={currentProjectId}
              onComplete={handleGenerationComplete}
            />
          );
        } else {
          return (
            <SimpleVideoGeneration 
              projectId={currentProjectId}
              scenes={approvedScenes}
              onComplete={handleGenerationComplete}
            />
          );
        }
      
      default:
        return null;
    }
  };

  return (
    <PortalLayout title={`Create a New ${videoConfig?.mediaType === 'image' ? 'Image' : 'Video'}`}>
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
