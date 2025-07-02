
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { DesktopLayoutContainer } from '@/components/workspace/DesktopLayoutContainer';
import { MobileLayoutContainer } from '@/components/workspace/MobileLayoutContainer';
import { useGeneration } from '@/hooks/useGeneration';
import { useMobile } from '@/hooks/use-mobile';
import { GenerationFormat } from '@/types/generation';

const Workspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMobile();
  
  // Generation state
  const [selectedMode, setSelectedMode] = useState<GenerationFormat>('sdxl_image_fast');
  const [selectedQuality, setSelectedQuality] = useState<'fast' | 'high'>('fast');
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

  // Update quality when mode changes
  useEffect(() => {
    if (selectedMode.includes('fast')) {
      setSelectedQuality('fast');
    } else if (selectedMode.includes('high')) {
      setSelectedQuality('high');
    }
  }, [selectedMode]);

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

  const layoutProps = {
    selectedMode,
    setSelectedMode,
    selectedQuality,
    setSelectedQuality,
    prompt,
    setPrompt,
    referenceImage,
    setReferenceImage,
    referenceImageUrl,
    setReferenceImageUrl,
    isGenerating,
    generationProgress,
    currentJob,
    generationError,
    onGenerate: handleGenerate,
    onRegenerate: handleRegenerate,
    onClearError: clearError
  };

  if (!user) {
    return null;
  }

  return (
    <OurVidzDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
        {isMobile ? (
          <MobileLayoutContainer {...layoutProps} />
        ) : (
          <DesktopLayoutContainer {...layoutProps} />
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Workspace;
