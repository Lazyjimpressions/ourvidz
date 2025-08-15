import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancementAnalytics } from './useEnhancementAnalytics';
import { toast } from 'sonner';

interface AutoEnhancementConfig {
  enabled: boolean;
  jobTypes: string[];
  minPromptLength: number;
  maxPromptLength: number;
  strategy: 'qwen_instruct' | 'qwen_base';
}

const DEFAULT_CONFIG: AutoEnhancementConfig = {
  enabled: false,
  jobTypes: ['sdxl_image_fast', 'sdxl_image_high', 'video_fast', 'video_high'],
  minPromptLength: 5,
  maxPromptLength: 150,
  strategy: 'qwen_instruct'
};

export const useAutoEnhancement = () => {
  const [config, setConfig] = useState<AutoEnhancementConfig>(DEFAULT_CONFIG);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { trackEnhancement } = useEnhancementAnalytics();

  const shouldAutoEnhance = useCallback((prompt: string, jobType: string): boolean => {
    if (!config.enabled) return false;
    if (!config.jobTypes.includes(jobType)) return false;
    
    const wordCount = prompt.trim().split(/\s+/).length;
    if (wordCount < config.minPromptLength || wordCount > config.maxPromptLength) return false;

    // Auto-enhance if prompt lacks quality descriptors
    const hasQualityTerms = /\b(high|quality|detailed|professional|cinematic|stunning|beautiful|masterpiece)\b/i.test(prompt);
    const hasStructure = /\b(portrait|landscape|scene|view|image|photo|picture)\b/i.test(prompt);
    
    return !hasQualityTerms || !hasStructure;
  }, [config]);

  const autoEnhance = useCallback(async (prompt: string, jobType: string): Promise<string | null> => {
    if (!shouldAutoEnhance(prompt, jobType)) {
      return null;
    }

    setIsEnhancing(true);
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: prompt.trim(),
          enhancement_only: true,
          jobType,
          format: jobType.includes('video') ? 'video' : 'image',
          selectedModel: config.strategy,
          selectedPresets: []
        }
      });

      if (error || !data?.success) {
        console.warn('⚠️ Auto-enhancement failed, using original prompt:', error?.message || data?.error);
        return null;
      }

      const enhancementTime = Date.now() - startTime;
      const enhanced = data.enhancedPrompt || data.enhanced_prompt;

      // Track analytics for auto-enhancement
      await trackEnhancement({
        originalPrompt: prompt,
        enhancedPrompt: enhanced,
        enhancementStrategy: `auto_${config.strategy}`,
        enhancementTimeMs: enhancementTime,
        jobType,
        tokenOptimization: {
          originalTokens: prompt.split(/\s+/).length,
          enhancedTokens: enhanced.split(/\s+/).length,
          finalTokens: enhanced.split(/\s+/).length,
          compressionApplied: false
        }
      });

      console.log('✅ Auto-enhancement successful:', {
        original: prompt.substring(0, 50) + '...',
        enhanced: enhanced.substring(0, 50) + '...',
        strategy: config.strategy,
        timeMs: enhancementTime
      });

      return enhanced;
    } catch (error) {
      console.error('❌ Auto-enhancement error:', error);
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [config, shouldAutoEnhance, trackEnhancement]);

  const updateConfig = useCallback((updates: Partial<AutoEnhancementConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleAutoEnhancement = useCallback(() => {
    setConfig(prev => {
      const newEnabled = !prev.enabled;
      toast.success(
        newEnabled 
          ? 'Auto-enhancement enabled - prompts will be enhanced automatically before generation' 
          : 'Auto-enhancement disabled'
      );
      return { ...prev, enabled: newEnabled };
    });
  }, []);

  return {
    config,
    isEnhancing,
    shouldAutoEnhance,
    autoEnhance,
    updateConfig,
    toggleAutoEnhancement
  };
};