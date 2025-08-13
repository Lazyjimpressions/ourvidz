import { useState, useCallback } from 'react';
import { useGeneration } from './useGeneration';
import { RoleplayTemplate } from '@/components/playground/RoleplaySetup';
import { toast } from 'sonner';

interface SceneContext {
  characters: Array<{
    name: string;
    visualDescription: string;
    role: string;
  }>;
  setting: string;
  mood: string;
  actions: string[];
  isNSFW: boolean;
  visualElements: string[];
}

interface SceneGenerationOptions {
  useCharacterReference?: boolean;
  referenceStrength?: number;
  style?: 'realistic' | 'artistic' | 'anime' | 'lustify';
  quality?: 'fast' | 'high';
  sceneId?: string;
  characterId?: string;
  conversationId?: string;
  referenceImageUrl?: string;
}

export const useSceneGeneration = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSceneContext, setLastSceneContext] = useState<SceneContext | null>(null);
  const { generateContent, isGenerating, currentJob } = useGeneration();

  // Enhanced scene detection with roleplay patterns
  const detectScene = useCallback((content: string): boolean => {
    const patterns = [
      // Roleplay action patterns
      /\*[^*]+\*/g,
      /\([^)]*action[^)]*\)/gi,
      
      // Movement and positioning
      /\b(moves?|walks?|sits?|stands?|leans?|approaches?|steps?|turns?|enters?|exits?|comes?|goes?)\b/gi,
      
      // Physical interactions
      /\b(touches?|kisses?|embraces?|holds?|caresses?|grabs?|pulls?|strokes?|runs?.*hands?|fingers?)\b/gi,
      
      // Environmental descriptions
      /\b(in the|at the|on the|near the|inside|outside|around|behind|beside)\s+\w+/gi,
      
      // Visual descriptions
      /\b(wearing|dressed|naked|nude|clothing|outfit|lingerie|appearance|looks?|beautiful|attractive|eyes?|hair|smile)\b/gi,
      
      // Emotional/sensual indicators
      /\b(passionate|intimate|romantic|seductive|sensual|aroused|desire|longing|breathless|whispers?|moans?|gasps?)\b/gi,
      
      // Setting indicators
      /\b(bedroom|bed|room|kitchen|bathroom|sofa|chair|hotel|car|office|house|apartment|couch|table|window|door)\b/gi,
      
      // Character indicators
      /\b(she|he|her|his|him|they|their)\s+(looks?|appears?|seems?|feels?|notices?|sees?|watches?)/gi,
      
      // Descriptive language common in roleplay
      /\b(gentle|soft|warm|cool|bright|dark|dim|quiet|loud|smooth|rough|silk|lace|leather)\b/gi,
      
      // Body language and expressions
      /\b(smiles?|blushes?|laughs?|giggles?|nods?|shakes?.*head|raises?.*eyebrow|winks?)\b/gi
    ];
    
    const matchCount = patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    const hasScene = matchCount > 0;
    
    console.log('🔍 Scene detection analysis:', {
      content: content.slice(0, 100),
      matchCount,
      hasScene,
      contentLength: content.length
    });
    
    return hasScene;
  }, []);

  // Advanced scene analysis using roleplay context
  const analyzeScene = useCallback(async (
    content: string,
    roleplayTemplate?: RoleplayTemplate | null
  ): Promise<SceneContext> => {
    setIsAnalyzing(true);
    
    try {
      // Extract characters from roleplay template with enhanced details
      const characters = roleplayTemplate?.characters?.map(char => ({
        name: char.name,
        visualDescription: char.visualDescription || 'attractive person',
        role: char.role
      })) || [];

      // Enhanced action extraction
      const actionPatterns = [
        /\*([^*]+)\*/g,  // Actions in asterisks
        /\b(she|he|they|[A-Z][a-z]+)\s+(moves?|walks?|sits?|stands?|leans?|touches?|kisses?|embraces?)[^.!?]*/gi
      ];
      
      const actions: string[] = [];
      for (const pattern of actionPatterns) {
        const matches = content.match(pattern) || [];
        actions.push(...matches.map(match => match.replace(/[*()]/g, '').trim()));
      }

      // Enhanced setting detection with context
      const settingPatterns = [
        /\b(?:in|at|on|near)\s+(?:the\s+)?([^,.!?]+(?:room|bed|kitchen|bathroom|sofa|chair|house|hotel|office|car|outdoor|garden|beach|restaurant))/gi,
        /\b(bedroom|living room|kitchen|bathroom|office|hotel room|car|outdoor|garden|beach|restaurant|apartment|house)\b/gi
      ];
      
      let setting = 'intimate indoor setting';
      for (const pattern of settingPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          setting = matches[0].toLowerCase().replace(/^(in|at|on|near)\s+/, '');
          break;
        }
      }

      // Enhanced mood detection
      const moodPattern = /\b(romantic|passionate|intimate|seductive|tender|gentle|intense|playful|sultry|sensual|loving|caring|lustful|aroused)\b/gi;
      const moodMatches = content.match(moodPattern) || [];
      const mood = moodMatches[0]?.toLowerCase() || 'intimate';

      // Enhanced visual element extraction
      const visualPatterns = [
        // Lighting and atmosphere
        /\b(lighting|light|shadow|glow|dim|bright|candlelight|soft light|warm light|moonlight|sunlight)\b/gi,
        // Clothing and appearance
        /\b(dress|outfit|lingerie|clothing|naked|nude|undressed|shirt|pants|skirt|bra|panties|silk|lace)\b/gi,
        // Physical features
        /\b(hair|eyes|skin|body|face|lips|hands|curves|muscles|chest|legs)\b/gi,
        // Objects and props
        /\b(bed|pillow|sheet|blanket|mirror|window|door|table|chair|wine|candle)\b/gi
      ];
      
      const visualElements: string[] = [];
      for (const pattern of visualPatterns) {
        const matches = content.match(pattern) || [];
        visualElements.push(...matches.map(match => match.toLowerCase()));
      }

      // Enhanced NSFW detection - force NSFW for adult roleplay templates
      const nsfwPatterns = [
        /\b(naked|nude|sex|intimate|breast|penis|vagina|orgasm|climax|aroused|erotic|lusty|masturbat|penetrat|thrust|moan)\b/gi,
        /\b(nipple|clit|pussy|cock|dick|cum|orgasm|pleasure|desire|lust)\b/gi
      ];
      const isNSFW = roleplayTemplate?.isAdult === true || 
                     nsfwPatterns.some(pattern => pattern.test(content));

      const sceneContext: SceneContext = {
        characters: characters.slice(0, 2), // Limit to main characters for prompt efficiency
        setting,
        mood,
        actions: actions.slice(0, 3), // Top 3 most relevant actions
        isNSFW,
        visualElements: Array.from(new Set(visualElements)).slice(0, 5) // Top 5 unique elements
      };

      setLastSceneContext(sceneContext);
      return sceneContext;
      
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Convert scene context to optimized SDXL Lustify prompt
  const generateSDXLPrompt = useCallback((
    sceneContext: SceneContext,
    options: SceneGenerationOptions = {}
  ): string => {
    const { style = 'lustify', quality = 'fast' } = options;
    const maxTokens = 75; // SDXL Lustify limit
    
    // Build quality tokens
    const qualityTokens = ['score_9', 'score_8_up', 'masterpiece', 'best quality'];
    
    // Build character tokens from roleplay context
    const characterTokens: string[] = [];
    if (sceneContext.characters.length > 0) {
      const mainCharacter = sceneContext.characters[0];
      // Extract clean character description tokens
      const characterDesc = mainCharacter.visualDescription
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 2 && !['the', 'and', 'with', 'her', 'his', 'has'].includes(token))
        .slice(0, 6);
      
      characterTokens.push('1girl', 'beautiful woman', ...characterDesc);
    }

    // Build scene and action tokens
    const sceneTokens: string[] = [];
    
    // Add mood and setting
    if (sceneContext.mood) {
      sceneTokens.push(sceneContext.mood + ' atmosphere');
    }
    
    // Add setting details
    const cleanSetting = sceneContext.setting
      .replace(/^(intimate |indoor |outdoor )/i, '')
      .trim();
    if (cleanSetting && cleanSetting !== 'setting') {
      sceneTokens.push(cleanSetting);
    }
    
    // Add key visual elements
    const relevantVisuals = sceneContext.visualElements
      .filter(element => element.length > 2 && !['skin', 'body', 'face'].includes(element))
      .slice(0, 3);
    sceneTokens.push(...relevantVisuals);

    // Add action context if available
    if (sceneContext.actions.length > 0) {
      const mainAction = sceneContext.actions[0]
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 2)
        .join(' ');
      
      if (mainAction) {
        sceneTokens.push(mainAction);
      }
    }

    // Build NSFW/adult tokens
    const nsfwTokens: string[] = [];
    if (sceneContext.isNSFW) {
      nsfwTokens.push(
        'lustify style',
        'anatomically correct',
        'detailed anatomy',
        'intimate scene',
        'sensual'
      );
    }

    // Build technical quality tokens
    const technicalTokens = [
      'professional photography',
      'cinematic lighting',
      'high detail',
      'sharp focus'
    ];
    
    if (quality === 'high') {
      technicalTokens.push('ultra detailed', '8k resolution');
    }

    // Smart token assembly with strict deduplication
    const allTokenGroups = [
      { tokens: qualityTokens, priority: 1, maxCount: 4 },
      { tokens: characterTokens, priority: 2, maxCount: 8 },
      { tokens: sceneTokens, priority: 3, maxCount: 6 },
      { tokens: nsfwTokens, priority: 4, maxCount: 5 },
      { tokens: technicalTokens, priority: 5, maxCount: 4 }
    ];

    const finalTokens: string[] = [];
    const usedTokensSet = new Set<string>();
    
    // Add tokens by priority while avoiding duplicates
    for (const group of allTokenGroups) {
      let addedFromGroup = 0;
      
      for (const token of group.tokens) {
        if (finalTokens.length >= maxTokens) break;
        if (addedFromGroup >= group.maxCount) break;
        
        const normalizedToken = token.toLowerCase().trim();
        
        // Skip if already used or too similar to existing tokens
        if (usedTokensSet.has(normalizedToken)) continue;
        if (Array.from(usedTokensSet).some(used => 
          used.includes(normalizedToken) || normalizedToken.includes(used)
        )) continue;
        
        finalTokens.push(token);
        usedTokensSet.add(normalizedToken);
        addedFromGroup++;
      }
      
      if (finalTokens.length >= maxTokens) break;
    }

    const prompt = finalTokens.join(', ');
    
    console.log('🎨 Optimized SDXL prompt generated:', {
      prompt,
      tokenCount: finalTokens.length,
      maxTokens,
      sceneContext: {
        characters: sceneContext.characters.length,
        isNSFW: sceneContext.isNSFW,
        mood: sceneContext.mood,
        setting: sceneContext.setting,
        actions: sceneContext.actions.length,
        visualElements: sceneContext.visualElements.length
      },
      tokenBreakdown: {
        quality: qualityTokens.length,
        character: characterTokens.length,
        scene: sceneTokens.length,
        nsfw: nsfwTokens.length,
        technical: technicalTokens.length,
        final: finalTokens.length
      }
    });

    return prompt;
  }, []);

  // Generate scene image with enhanced options
  const generateSceneImage = useCallback(async (
    content: string,
    roleplayTemplate?: RoleplayTemplate | null,
    options: SceneGenerationOptions = {}
  ) => {
    try {
      // Analyze scene if not already done
      let sceneContext = lastSceneContext;
      if (!sceneContext || lastSceneContext === null) {
        sceneContext = await analyzeScene(content, roleplayTemplate);
      }

      // Generate optimized prompt
      const prompt = generateSDXLPrompt(sceneContext, options);

      // Use appropriate format based on quality setting
      const format = options.quality === 'fast' ? 'image_fast' : 'image_high';

      // Use character reference if available and requested
      let referenceImages = undefined;
      if (options.useCharacterReference && roleplayTemplate?.characters?.[0]) {
        // TODO: Implement character reference image lookup
        console.log('Character reference requested but not yet implemented');
      }

      await generateContent({
        format,
        prompt,
        ...(referenceImages && { referenceImages }),
        metadata: {
          source: 'scene_generator',
          originalContent: content.slice(0, 200),
          sceneContext,
          characterContext: roleplayTemplate?.characters?.map(c => c.name).join(', ') || 'none',
          options
        }
      });

      toast.success('Scene image generation started!', {
        description: `Creating ${options.quality || 'fast'} quality scene visualization...`
      });

      return sceneContext;

    } catch (error) {
      toast.error('Failed to generate scene image');
      console.error('Scene generation error:', error);
      throw error;
    }
  }, [lastSceneContext, analyzeScene, generateSDXLPrompt, generateContent]);

  return {
    detectScene,
    analyzeScene,
    generateSDXLPrompt,
    generateSceneImage,
    isAnalyzing,
    isGenerating,
    currentJob,
    lastSceneContext
  };
};