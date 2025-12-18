import { useState, useCallback } from 'react';
import { useGeneration } from './useGeneration';
import { RoleplayTemplate } from '@/components/playground/RoleplaySetup';
import { toast } from 'sonner';
import { GenerationFormat } from '@/types/generation';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';

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
  const { generateContent, isGenerating, currentJob, cancelGeneration } = useGeneration();

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
      // Pre-clean content: strip role labels like "**Narrator:**", "Mei:", etc. while keeping the text
      const cleanedContent = content
        .replace(/^\s*\*{2}?[A-Za-z][A-Za-z0-9 _-]{0,30}\*{2}?:\s*/gm, '') // **Name:**
        .replace(/^\s*[A-Za-z][A-Za-z0-9 _-]{0,30}:\s*/gm, '')               // Name:
        .replace(/\*\*/g, '');                                              // remove stray bold markers
      const text = cleanedContent;

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
        const matches = text.match(pattern) || [];
        actions.push(...matches.map(match => match.replace(/[*()]/g, '').trim()));
      }

      // Enhanced setting detection with context
      const settingPatterns = [
        /\b(?:in|at|on|near)\s+(?:the\s+)?([^,.!?]+(?:room|bed|kitchen|bathroom|sofa|chair|house|hotel|office|car|outdoor|garden|beach|restaurant))/gi,
        /\b(bedroom|living room|kitchen|bathroom|office|hotel room|car|outdoor|garden|beach|restaurant|apartment|house)\b/gi
      ];
      
      let setting = 'intimate indoor setting';
      for (const pattern of settingPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          setting = matches[0].toLowerCase().replace(/^(in|at|on|near)\s+/, '');
          break;
        }
      }

      // Enhanced mood detection
      const moodPattern = /\b(romantic|passionate|intimate|seductive|tender|gentle|intense|playful|sultry|sensual|loving|caring|lustful|aroused)\b/gi;
      const moodMatches = text.match(moodPattern) || [];
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
        const matches = text.match(pattern) || [];
        visualElements.push(...matches.map(match => match.toLowerCase()));
      }

      // Enhanced NSFW detection - force NSFW for adult roleplay templates
      const nsfwPatterns = [
        /\b(naked|nude|sex|intimate|breast|penis|vagina|orgasm|climax|aroused|erotic|lusty|masturbat|penetrat|thrust|moan)\b/gi,
        /\b(nipple|clit|pussy|cock|dick|cum|orgasm|pleasure|desire|lust)\b/gi
      ];
      const isNSFW = roleplayTemplate?.isAdult === true || 
                     nsfwPatterns.some(pattern => pattern.test(text));

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

  // Generate simplified SDXL prompt using existing character builder + scene context
  const generateSDXLPrompt = useCallback((
    sceneContext: SceneContext,
    options: SceneGenerationOptions = {}
  ): string => {
    const { quality = 'fast' } = options;
    
    // Extract 2-3 key scene keywords from content
    const sceneKeywords: string[] = [];
    
    // Add mood if present
    if (sceneContext.mood && sceneContext.mood !== 'intimate') {
      sceneKeywords.push(sceneContext.mood);
    }
    
    // Add setting if specific
    const cleanSetting = sceneContext.setting
      .replace(/^(intimate |indoor |outdoor )/i, '')
      .trim();
    if (cleanSetting && cleanSetting !== 'setting' && cleanSetting.length < 15) {
      sceneKeywords.push(cleanSetting);
    }
    
    // Add one key visual element if present
    const keyVisual = sceneContext.visualElements
      .filter(element => element.length > 2 && !['skin', 'body', 'face'].includes(element))[0];
    if (keyVisual) {
      sceneKeywords.push(keyVisual);
    }

    // Use existing character portrait builder as base
    let basePrompt = '';
    if (sceneContext.characters.length > 0) {
      const character = sceneContext.characters[0];
      // Convert to character format for existing builder
      const characterData = {
        name: character.name,
        appearance_tags: character.visualDescription.split(' ').filter(tag => tag.length > 2),
        gender: character.role.includes('female') || character.name.toLowerCase() === 'mei' ? 'female' : 'unspecified'
      };
      
      // Import and use existing character prompt builder
      basePrompt = buildCharacterPortraitPrompt(characterData);
    } else {
      basePrompt = 'score_9, score_8_up, masterpiece, best quality, 1girl, beautiful woman, portrait, photorealistic';
    }

    // Add scene keywords to base prompt if there's room
    const baseTokens = basePrompt.split(', ');
    const maxTokens = 77; // SDXL limit
    const availableTokens = maxTokens - baseTokens.length;
    
    if (availableTokens > 0 && sceneKeywords.length > 0) {
      const finalKeywords = sceneKeywords.slice(0, Math.min(availableTokens, 3));
      basePrompt += ', ' + finalKeywords.join(', ');
    }

    console.log('🎨 Simplified SDXL scene prompt:', {
      basePrompt,
      tokenCount: basePrompt.split(', ').length,
      maxTokens,
      sceneKeywords,
      character: sceneContext.characters[0]?.name || 'none'
    });

    return basePrompt;
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

      // Check selected model from localStorage to determine format
      const selectedModel = localStorage.getItem('workspace-selected-model');
      let format: GenerationFormat;
      let apiModelId: string | undefined;
      
      if (selectedModel) {
        try {
          const parsed = JSON.parse(selectedModel);
          if (parsed.type === 'replicate') {
            // Use Replicate formats for RV5.1
            format = options.quality === 'high' ? 'rv51_high' : 'rv51_fast';
            apiModelId = parsed.id;
            console.log('🎭 Using Replicate model for scene generation:', { format, apiModelId: parsed.id, displayName: parsed.display_name });
            
            // Show toast for missing apiModelId
            if (!apiModelId || apiModelId === 'legacy-rv51') {
              toast.error('Replicate model not properly configured. Please reselect your model in settings.');
              return;
            }
          } else {
            // Default to SDXL
            format = options.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
            console.log('🎭 Using SDXL model for scene generation:', { format });
          }
        } catch (e) {
          console.warn('Failed to parse selected model, defaulting to SDXL');
          format = options.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
        }
      } else {
        // Default to SDXL if no model selected
        format = options.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      }

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
          options,
          contentType: sceneContext.isNSFW ? 'nsfw' : 'sfw',
          ...(apiModelId && { apiModelId })
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