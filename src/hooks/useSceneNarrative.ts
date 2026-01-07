import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Scene narrative generation hook - directly calls roleplay-chat edge function

interface CharacterParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
  reference_image_url?: string;
  description?: string;
}

interface SceneNarrativeOptions {
  includeNarrator?: boolean;
  includeUserCharacter?: boolean;
  characterId?: string;
  conversationId?: string;
  userCharacterId?: string;
  sceneName?: string;
  sceneDescription?: string;
}

export const useSceneNarrative = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSceneNarrative = useCallback(async (
    scenePrompt: string,
    characters: CharacterParticipant[] = [],
    options: SceneNarrativeOptions = {}
  ): Promise<string | undefined> => {
    if (!scenePrompt.trim()) {
      toast.error('Please provide a scene description');
      return;
    }

    if (!options.sceneName?.trim()) {
      toast.error('Please provide a scene name');
      return;
    }

    if (!options.characterId) {
      toast.error('Character ID is required');
      return;
    }

    setIsGenerating(true);

    try {
      // Determine scene_type based on context:
      // - 'preset' = Creator-defined scenario (no conversation_id, public on character card)
      // - 'conversation' = Generated during active chat (has conversation_id, private)
      const sceneType = options.conversationId ? 'conversation' : 'preset';

      // Create scene record first with name and description
      const { data: sceneRecord, error: sceneError } = await supabase
        .from('character_scenes')
        .insert({
          character_id: options.characterId,
          conversation_id: options.conversationId || null,
          scene_type: sceneType,
          scene_name: options.sceneName.trim(),
          scene_description: options.sceneDescription?.trim() || null,
          scene_prompt: scenePrompt.trim(),
          system_prompt: null,
          priority: 0,
          generation_metadata: {
            scene_type: 'narrative_scene',
            characters: characters.map(c => ({ id: c.id, name: c.name, role: c.role })),
            include_narrator: options.includeNarrator || false,
            include_user_character: options.includeUserCharacter || false
          }
        })
        .select('id')
        .single();

      if (sceneError || !sceneRecord) {
        console.error('Failed to create scene record:', sceneError);
        toast.error('Failed to create scene record');
        throw sceneError || new Error('Failed to create scene record');
      }

      const sceneId = sceneRecord.id;
      console.log('✅ Scene record created with ID:', sceneId);

      // Build the enhanced scene prompt with proper markers for detection
      let enhancedPrompt = `[SCENE_GENERATION] ${scenePrompt}`;
      
      // Add character information
      if (characters.length > 0) {
        const characterNames = characters.map(c => c.name).join(', ');
        enhancedPrompt += ` [CHARACTERS: ${characterNames}]`;
      }
      
      // Add context information
      const context = [];
      if (options.includeNarrator) context.push('narrator');
      if (options.includeUserCharacter) context.push('user');
      if (context.length > 0) {
        enhancedPrompt += ` [CONTEXT: ${context.join(',')}]`;
      }

      // Add scene ID to the prompt so the edge function can link it
      enhancedPrompt += ` [SCENE_ID: ${sceneId}]`;

      console.log('Sending scene generation prompt:', enhancedPrompt);

      // Call roleplay-chat edge function directly for scene generation
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: enhancedPrompt,
          conversation_id: options.conversationId || null,
          character_id: options.characterId,
          model_provider: 'openrouter', // Default to openrouter for scene generation
          memory_tier: 'conversation',
          content_tier: 'nsfw', // Default to NSFW for scene generation
          scene_generation: true,
          user_id: user?.id,
          scene_name: options.sceneName.trim(),
          scene_description: options.sceneDescription?.trim() || null,
        }
      });

      if (error) {
        console.error('Scene generation request failed:', error);
        throw error;
      }

      toast.success('Scene created successfully!', {
        description: `"${options.sceneName.trim()}" has been created and is ready to use.`
      });

      return sceneId;
    } catch (error) {
      console.error('Scene narrative generation failed:', error);
      toast.error('Failed to generate scene narrative');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id]);

  return {
    generateSceneNarrative,
    isGenerating
  };
};