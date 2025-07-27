import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QualityValidationResult {
  tokenEfficiency: number;
  promptCoherence: number;
  compressionQuality: number;
  overallScore: number;
  recommendations: string[];
}

export const useEnhancementQuality = () => {
  const validateEnhancement = useCallback((
    originalPrompt: string,
    enhancedPrompt: string,
    finalPrompt: string,
    compressionApplied: boolean
  ): QualityValidationResult => {
    const originalWords = originalPrompt.trim().split(/\s+/).filter(w => w.length > 0);
    const enhancedWords = enhancedPrompt.trim().split(/\s+/).filter(w => w.length > 0);
    const finalWords = finalPrompt.trim().split(/\s+/).filter(w => w.length > 0);

    // Token efficiency: How well important terms are preserved
    const importantTerms = originalWords.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'with', 'that', 'this', 'very', 'really'].includes(word.toLowerCase())
    );
    
    const preservedTerms = importantTerms.filter(term => 
      enhancedPrompt.toLowerCase().includes(term.toLowerCase()) ||
      finalPrompt.toLowerCase().includes(term.toLowerCase())
    );
    
    const tokenEfficiency = importantTerms.length > 0 ? 
      (preservedTerms.length / importantTerms.length) * 100 : 100;

    // Prompt coherence: Basic structure and readability
    const hasSubject = /\b(a|an|the|portrait|image|photo|picture|scene|view)\b/i.test(enhancedPrompt);
    const hasDescriptors = enhancedWords.filter(w => 
      /\b(beautiful|stunning|detailed|high|quality|professional|cinematic)\b/i.test(w)
    ).length > 0;
    const reasonableLength = enhancedWords.length >= originalWords.length && enhancedWords.length <= originalWords.length * 3;
    
    const coherenceScore = (
      (hasSubject ? 30 : 0) +
      (hasDescriptors ? 40 : 0) +
      (reasonableLength ? 30 : 0)
    );

    // Compression quality: How well compression preserved quality terms
    let compressionQuality = 100;
    if (compressionApplied) {
      const qualityTermsInEnhanced = enhancedWords.filter(w => 
        /\b(high|quality|detailed|professional|cinematic|stunning|beautiful|masterpiece)\b/i.test(w)
      ).length;
      
      const qualityTermsInFinal = finalWords.filter(w => 
        /\b(high|quality|detailed|professional|cinematic|stunning|beautiful|masterpiece)\b/i.test(w)
      ).length;
      
      compressionQuality = qualityTermsInEnhanced > 0 ? 
        (qualityTermsInFinal / qualityTermsInEnhanced) * 100 : 80;
    }

    // Overall score
    const overallScore = (tokenEfficiency * 0.4 + coherenceScore * 0.4 + compressionQuality * 0.2);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (tokenEfficiency < 85) {
      recommendations.push("Some important terms from your original prompt may have been lost");
    }
    
    if (coherenceScore < 70) {
      recommendations.push("Enhanced prompt could benefit from more descriptive terms");
    }
    
    if (compressionQuality < 90 && compressionApplied) {
      recommendations.push("Compression removed some quality descriptors - consider shorter original prompt");
    }
    
    if (overallScore > 90) {
      recommendations.push("Excellent enhancement quality!");
    } else if (overallScore > 75) {
      recommendations.push("Good enhancement with minor improvements possible");
    }

    return {
      tokenEfficiency: Math.round(tokenEfficiency),
      promptCoherence: Math.round(coherenceScore),
      compressionQuality: Math.round(compressionQuality),
      overallScore: Math.round(overallScore),
      recommendations
    };
  }, []);

  const logQualityFeedback = useCallback(async (
    jobId: string,
    userRating: number,
    qualityMetrics: QualityValidationResult
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('job_enhancement_analysis')
        .update({
          quality_rating: userRating,
          quality_improvement: qualityMetrics.overallScore / 100
        })
        .eq('id', jobId);

      if (error) {
        console.error('❌ Failed to log quality feedback:', error);
      } else {
        console.log('✅ Quality feedback logged:', { jobId, rating: userRating });
      }
    } catch (error) {
      console.error('❌ Quality feedback logging failed:', error);
    }
  }, []);

  return {
    validateEnhancement,
    logQualityFeedback
  };
};