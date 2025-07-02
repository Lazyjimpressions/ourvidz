
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { WorkspaceInputControls } from '@/components/WorkspaceInputControls';
import { useGeneration } from '@/hooks/useGeneration';
import { useIsMobile } from '@/hooks/use-mobile';
import { GenerationFormat } from '@/types/generation';

const Workspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Generation state
  const [selectedMode, setSelectedMode] = useState<GenerationFormat>('sdxl_image_fast');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  
  const {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error: generationError,
    clearError
  } = useGeneration();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

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

  if (!user) {
    return null;
  }

  return (
    <OurVidzDashboardLayout>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Main Workspace Container */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">AI Generation Workspace</h1>
            <p className="text-gray-400">Create stunning images and videos with advanced AI models</p>
          </div>

          {/* Input Controls Section */}
          <div className="mb-8">
            <WorkspaceInputControls
              selectedMode={selectedMode}
              setSelectedMode={setSelectedMode}
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              referenceImage={referenceImage}
              setReferenceImage={setReferenceImage}
              referenceImageUrl={referenceImageUrl}
              setReferenceImageUrl={setReferenceImageUrl}
              generationProgress={generationProgress}
              currentJob={currentJob}
              generationError={generationError}
              onRegenerate={handleRegenerate}
              onClearError={clearError}
            />
          </div>

          {/* Generation Status Section */}
          {(isGenerating || currentJob) && (
            <div className="mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generation Status</h3>
                  <div className="flex items-center gap-2">
                    {isGenerating && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    <span className="text-sm text-gray-400">
                      {isGenerating ? 'Processing...' : 'Completed'}
                    </span>
                  </div>
                </div>
                
                {generationProgress > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                )}

                {currentJob && (
                  <div className="text-sm text-gray-300">
                    <p>Job ID: <span className="font-mono text-blue-400">{currentJob.id}</span></p>
                    <p>Format: <span className="text-green-400">{currentJob.format}</span></p>
                    {currentJob.estimatedTimeRemaining && (
                      <p>Estimated time: <span className="text-yellow-400">{currentJob.estimatedTimeRemaining}s</span></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {generationError && (
            <div className="mb-8">
              <div className="bg-red-900/20 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-red-400">Generation Error</h3>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-red-300">{generationError}</p>
              </div>
            </div>
          )}

          {/* Results Area - Placeholder for future implementation */}
          <div className="min-h-[400px] bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-gray-700/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Your creations will appear here</h3>
              <p className="text-gray-500">Generate your first image or video to get started</p>
            </div>
          </div>
        </div>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Workspace;
