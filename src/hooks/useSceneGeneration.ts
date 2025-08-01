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
    
    // Collect all potential tokens with priorities
    const tokenGroups = {
      quality: ['score_9', 'score_8_up', 'masterpiece', 'best quality'],
      character: [] as string[],
      scene: [] as string[],
      nsfw: [] as string[],
      technical: ['professional photography', '4K', 'sharp focus', 'warm lighting']
    };

    // Build character tokens
    if (sceneContext.characters.length > 0) {
      const mainCharacter = sceneContext.characters[0];
      const characterDesc = mainCharacter.visualDescription
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .filter(token => token.length > 2)
        .slice(0, 4);
      tokenGroups.character = ['beautiful', 'attractive', ...characterDesc];
    }

    // Build scene tokens
    const sceneTokens = [
      sceneContext.mood,
      ...sceneContext.setting.split(' ').slice(0, 2),
      ...sceneContext.visualElements.slice(0, 2)
    ].filter(token => token && token.length > 2);
    tokenGroups.scene = sceneTokens;

    // Build NSFW tokens
    if (sceneContext.isNSFW) {
      tokenGroups.nsfw = [
        'anatomically correct',
        'detailed anatomy', 
        'lustify style',
        'professional adult photography',
        'intimate'
      ];
    }

    // Add quality-specific tokens
    if (quality === 'high') {
      tokenGroups.technical.push('shot on Canon EOS R5', 'f/1.8');
    }

    // Smart token assembly with deduplication
    const finalTokens: string[] = [];
    const usedTokens = new Set<string>();
    
    // Add tokens by priority, removing duplicates
    const addUniqueTokens = (tokens: string[], limit: number) => {
      for (const token of tokens) {
        if (finalTokens.length >= maxTokens) break;
        const normalizedToken = token.toLowerCase().trim();
        if (!usedTokens.has(normalizedToken) && normalizedToken.length > 0) {
          finalTokens.push(token);
          usedTokens.add(normalizedToken);
          if (finalTokens.length >= limit) break;
        }
      }
    };

    // Assemble in priority order
    addUniqueTokens(tokenGroups.quality, 15);      // Quality (15 tokens max)
    addUniqueTokens(tokenGroups.character, 35);    // Character (20 tokens max)
    addUniqueTokens(tokenGroups.nsfw, 50);         // NSFW (15 tokens max)  
    addUniqueTokens(tokenGroups.scene, 65);        // Scene (15 tokens max)
    addUniqueTokens(tokenGroups.technical, 75);    // Technical (10 tokens max)

    const prompt = finalTokens.join(', ');
    
    console.log('🎨 Optimized SDXL prompt generated:', {
      prompt,
      tokenCount: finalTokens.length,
      characterCount: sceneContext.characters.length,
      isNSFW: sceneContext.isNSFW,
      style,
      quality,
      tokenBreakdown: {
        quality: tokenGroups.quality.length,
        character: tokenGroups.character.length,
        nsfw: tokenGroups.nsfw.length,
        scene: tokenGroups.scene.length,
        technical: tokenGroups.technical.length
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

      // Always use high quality for scene generation
      const format = 'sdxl_image_high';

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