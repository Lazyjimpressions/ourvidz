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
      /\b(moves?|walks?|sits?|stands?|leans?|approaches?|steps?|turns?)\b/gi,
      
      // Physical interactions
      /\b(touches?|kisses?|embraces?|holds?|caresses?|grabs?|pulls?)\b/gi,
      
      // Environmental descriptions
      /\b(in the|at the|on the|near the)\s+\w+/gi,
      
      // Visual descriptions
      /\b(wearing|dressed|naked|nude|clothing|outfit|lingerie)\b/gi,
      
      // Emotional/sensual indicators
      /\b(passionate|intimate|romantic|seductive|sensual|aroused)\b/gi,
      
      // Setting indicators
      /\b(bedroom|bed|room|kitchen|bathroom|sofa|chair|hotel|car)\b/gi
    ];
    
    return patterns.some(pattern => pattern.test(content));
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

      // Enhanced NSFW detection
      const nsfwPatterns = [
        /\b(naked|nude|sex|intimate|breast|penis|vagina|orgasm|climax|aroused|erotic|lusty|masturbat|penetrat|thrust|moan)\b/gi,
        /\b(nipple|clit|pussy|cock|dick|cum|orgasm|pleasure|desire|lust)\b/gi
      ];
      const isNSFW = nsfwPatterns.some(pattern => pattern.test(content)) || 
                     roleplayTemplate?.isAdult || false;

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
    const tokens: string[] = [];
    let tokenCount = 0;
    const maxTokens = 75; // SDXL Lustify limit

    // Helper function to add tokens safely
    const addTokens = (newTokens: string[], priority: number = 1) => {
      const remaining = maxTokens - tokenCount;
      const tokensToAdd = newTokens.slice(0, Math.floor(remaining / priority));
      tokens.push(...tokensToAdd);
      tokenCount += tokensToAdd.length;
    };

    // 1. Quality tags (12 tokens - highest priority)
    addTokens(['score_9', 'score_8_up', 'masterpiece', 'best quality', 'ultra detailed'], 1);

    // 2. Character descriptions (15-20 tokens)
    if (sceneContext.characters.length > 0 && tokenCount < maxTokens) {
      const mainCharacter = sceneContext.characters[0];
      const characterTokens = [
        'beautiful',
        mainCharacter.visualDescription
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .split(' ')
          .filter(token => token.length > 2)
          .slice(0, 6)
      ].flat();
      addTokens(characterTokens, 1);
    }

    // 3. NSFW anatomical accuracy (if applicable)
    if (sceneContext.isNSFW && tokenCount < maxTokens) {
      addTokens(['perfect anatomy', 'natural proportions'], 1);
      if (tokenCount < maxTokens - 10) {
        addTokens(['detailed intimate anatomy'], 1);
      }
    }

    // 4. Scene context (10-15 tokens)
    if (tokenCount < maxTokens) {
      const sceneTokens = [
        sceneContext.mood,
        sceneContext.setting.split(' ').slice(0, 2),
        sceneContext.visualElements.slice(0, 2)
      ].flat().filter(token => token.length > 2);
      addTokens(sceneTokens, 1);
    }

    // 5. Technical specifications (remaining tokens)
    if (tokenCount < maxTokens) {
      const techTokens = [
        'professional photography',
        '4K',
        'sharp focus',
        'warm lighting'
      ];
      if (quality === 'high') {
        techTokens.push('shot on Canon EOS R5', 'f/1.8');
      }
      addTokens(techTokens, 2);
    }

    const prompt = tokens.join(', ');
    
    console.log('Generated SDXL prompt:', {
      prompt,
      tokenCount,
      characterCount: sceneContext.characters.length,
      isNSFW: sceneContext.isNSFW,
      style,
      quality
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

      // Determine generation format based on quality
      const format = options.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';

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