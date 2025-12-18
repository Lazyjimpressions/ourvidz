import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Image as ImageIcon, 
  Settings, 
  ArrowLeft,
  Sparkles,
  User,
  Bot
} from 'lucide-react';
import { MobileChatInput } from '@/components/roleplay/MobileChatInput';
import { MobileCharacterSheet } from '@/components/roleplay/MobileCharacterSheet';
import { ChatMessage } from '@/components/roleplay/ChatMessage';
import { ContextMenu } from '@/components/roleplay/ContextMenu';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { CharacterInfoDrawer } from '@/components/roleplay/CharacterInfoDrawer';
import { RoleplaySettingsModal } from '@/components/roleplay/RoleplaySettingsModal';
import { ModelSelector } from '@/components/roleplay/ModelSelector';
import { useToast } from '@/hooks/use-toast';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { Character, Message, CharacterScene } from '@/types/roleplay';
import { imageConsistencyService, ConsistencySettings } from '@/services/ImageConsistencyService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';

// Add prompt template interface
interface PromptTemplate {
  id: string;
  template_name: string;
  system_prompt: string;
  use_case: string;
  content_mode: string;
  enhancer_model: string;
}

const MobileRoleplayChat: React.FC = () => {
  const { characterId, sceneId } = useParams<{ characterId: string; sceneId?: string }>();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [selectedScene, setSelectedScene] = useState<CharacterScene | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [signedCharacterImage, setSignedCharacterImage] = useState<string | null>(null);
  const [memoryTier, setMemoryTier] = useState<'conversation' | 'character' | 'profile'>('conversation');
  
  // Load models from database
  const { allModelOptions: roleplayModelOptions, isLoading: roleplayModelsLoading } = useRoleplayModels();
  const { modelOptions: imageModelOptions, isLoading: imageModelsLoading } = useImageModels();
  
  // Initialize settings with saved values or database defaults (API models only, not local)
  const initializeSettings = () => {
    const savedSettings = localStorage.getItem('roleplay-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Validate saved settings against available models
        const savedChatModel = parsed.modelProvider;
        const savedImageModel = parsed.selectedImageModel;
        
        // Validate chat model - must be an API model (model_key), not local
        const isValidChatModel = roleplayModelOptions.some(m => 
          m.value === savedChatModel && !m.isLocal
        );
        
        // Validate image model - must be an API model (UUID) or 'sdxl' if local worker available
        const isValidImageModel = imageModelOptions.some(m => 
          m.value === savedImageModel
        ) || (savedImageModel === 'sdxl' && imageModelOptions.some(m => m.value === 'sdxl'));
        
        if (isValidChatModel && isValidImageModel) {
          return {
            modelProvider: savedChatModel,
            selectedImageModel: savedImageModel,
            consistencySettings: parsed.consistencySettings || {
              method: 'hybrid',
              reference_strength: 0.35,
              denoise_strength: 0.25,
              modify_strength: 0.5
            }
          };
        }
      } catch (error) {
        console.warn('Failed to parse saved roleplay settings:', error);
      }
    }
    
    // Default to first available API model (not local)
    const defaultChatModel = roleplayModelOptions.find(m => !m.isLocal)?.value || 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free';
    // Default to first available API image model (UUID), not 'sdxl'
    // IMPORTANT: Only use API models (type === 'api'), never default to 'sdxl' local model
    const defaultImageModel = imageModelOptions.find(m => m.type === 'api')?.value || null;
    
    if (!defaultImageModel) {
      console.error('❌ No API image models available - image generation will fail. Please configure Replicate models in database.');
    }
    
    return {
      modelProvider: defaultChatModel,
      selectedImageModel: defaultImageModel || '', // Empty string if no API models - edge function will handle gracefully
      consistencySettings: {
        method: 'hybrid',
        reference_strength: 0.35,
        denoise_strength: 0.25,
        modify_strength: 0.5
      }
    };
  };
  
  // Initialize settings after models are loaded
  const [modelProvider, setModelProvider] = useState<string>('cognitivecomputations/dolphin-mistral-24b-venice-edition:free');
  const [selectedImageModel, setSelectedImageModel] = useState<string>(''); // Will be set from database API models (not 'sdxl')
  const [consistencySettings, setConsistencySettings] = useState<ConsistencySettings>({
    method: 'hybrid',
    reference_strength: 0.35,
    denoise_strength: 0.25,
    modify_strength: 0.5
  });
  
  // Update defaults when models are loaded (only once)
  const hasInitializedModelDefaults = useRef(false);
  useEffect(() => {
    if (!roleplayModelsLoading && !imageModelsLoading && !hasInitializedModelDefaults.current && roleplayModelOptions.length > 0 && imageModelOptions.length > 0) {
      const settings = initializeSettings();
      setModelProvider(settings.modelProvider);
      setSelectedImageModel(settings.selectedImageModel);
      setConsistencySettings(settings.consistencySettings);
      hasInitializedModelDefaults.current = true;
      console.log('✅ Initialized model defaults from database:', {
        chatModel: settings.modelProvider,
        imageModel: settings.selectedImageModel,
        chatModelType: roleplayModelOptions.find(m => m.value === settings.modelProvider)?.isLocal ? 'local' : 'api',
        imageModelType: imageModelOptions.find(m => m.value === settings.selectedImageModel)?.type || 'unknown'
      });
    }
  }, [roleplayModelsLoading, imageModelsLoading, roleplayModelOptions, imageModelOptions]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sceneJobId, setSceneJobId] = useState<string | null>(null);
  const [sceneJobStatus, setSceneJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [kickoffError, setKickoffError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  // Add prompt template state
  const [promptTemplate, setPromptTemplate] = useState<PromptTemplate | null>(null);

  // Idempotency ref to prevent multiple initializations
  const hasInitialized = useRef(false);
  const currentRouteRef = useRef<string>('');

  // Hooks
  const { user, profile } = useAuth();
  const { getSignedUrl } = useSignedImageUrls();
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
      currentRouteRef.current = '';
    };
  }, []);

  // Load prompt template for roleplay
  const loadPromptTemplate = async (contentTier: string) => {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('use_case', 'character_roleplay')
        .eq('content_mode', contentTier)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading prompt template:', error);
        return null;
      }

      console.log('✅ Loaded prompt template:', data.template_name);
      return data;
    } catch (error) {
      console.error('Error in loadPromptTemplate:', error);
      return null;
    }
  };

  // Initialize conversation and load data
  useEffect(() => {
    const initializeConversation = async () => {
      const routeKey = `${characterId}-${sceneId || 'none'}`;
      
      // Prevent reinitialization for same route
      if (hasInitialized.current && currentRouteRef.current === routeKey) {
        console.log('🔒 Preventing duplicate initialization for route:', routeKey);
        return;
      }

      if (!user || !characterId) {
        setIsInitializing(false);
        return;
      }

      try {
        setIsInitializing(true);
        // Load character data first
        const { data: characterData, error: characterError } = await supabase
          .from('characters')
          .select('*')
          .eq('id', characterId)
          .single();

        let loadedCharacter: Character;
        if (characterError) {
          console.error('Error loading character:', characterError);
          // Fallback to mock data
          loadedCharacter = {
            id: characterId || '1',
            name: 'Character',
            description: 'A character in the roleplay system',
            image_url: '/placeholder.svg',
            consistency_method: 'i2i_reference',
            base_prompt: 'You are a helpful character.',
            quick_start: true
          };
        } else {
          loadedCharacter = {
            ...characterData,
            image_url: characterData.image_url || characterData.preview_image_url || '/placeholder.svg',
            consistency_method: characterData.consistency_method || 'i2i_reference',
            base_prompt: characterData.base_prompt || 'You are a helpful character.',
            quick_start: characterData.quick_start || false,
            // Include new voice-related fields with type assertion
            voice_examples: (characterData as any).voice_examples || [],
            forbidden_phrases: (characterData as any).forbidden_phrases || [],
            scene_behavior_rules: (characterData as any).scene_behavior_rules || {}
          };
        }
        setCharacter(loadedCharacter);

        // Sign character image URL for display
        if (loadedCharacter.image_url && !loadedCharacter.image_url.startsWith('http')) {
          try {
            const signedUrl = await getSignedUrl(loadedCharacter.image_url, 'user-library');
            setSignedCharacterImage(signedUrl);
          } catch (error) {
            console.error('Error signing character image:', error);
          }
        } else {
          setSignedCharacterImage(loadedCharacter.image_url);
        }

        // Load scene data - auto-select if no sceneId provided
        let loadedScene = null;
        if (sceneId) {
          // Load specific scene if provided in URL
          try {
            const { data: sceneData, error: sceneError } = await supabase
              .from('character_scenes')
              .select('*')
              .eq('id', sceneId)
              .eq('character_id', characterId)
              .single();

            if (!sceneError && sceneData) {
              loadedScene = sceneData;
              setSelectedScene(sceneData);
              console.log('🎬 Loaded scene context:', sceneData.scene_prompt.substring(0, 50) + '...');
            }
          } catch (error) {
            console.error('Error loading scene:', error);
          }
        } else {
          // Auto-select first available scene if no sceneId provided
          // This makes scenes optional - can start without scene
          try {
            const { data: scenes, error: scenesError } = await supabase
              .from('character_scenes')
              .select('*')
              .eq('character_id', characterId)
              .order('priority', { ascending: false })
              .limit(1);

            if (!scenesError && scenes && scenes.length > 0) {
              loadedScene = scenes[0];
              setSelectedScene(scenes[0]);
              console.log('🎬 Auto-selected scene:', scenes[0].scene_prompt.substring(0, 50) + '...');
            } else {
              // No scenes available - that's okay, can start without scene
              console.log('ℹ️ No scenes available for character, starting without scene context');
            }
          } catch (error) {
            console.error('Error loading scenes for auto-select:', error);
            // Continue without scene - it's optional
          }
        }

        // Load prompt template for roleplay
        const loadedPromptTemplate = await loadPromptTemplate('nsfw');
        setPromptTemplate(loadedPromptTemplate);
        console.log('📝 Loaded prompt template:', loadedPromptTemplate?.template_name || 'none');

        // Mark route as initialized
        hasInitialized.current = true;
        currentRouteRef.current = routeKey;
        setKickoffError(null);

        // Check for existing active conversation first
        let conversation = null;
        
        // First try localStorage cache for quick lookup
        const cacheKey = `conversation_${characterId}_${sceneId || 'general'}`;
        const cachedConversationId = localStorage.getItem(cacheKey);
        
        if (cachedConversationId) {
          console.log('🔍 Checking cached conversation:', cachedConversationId);
          const { data: cachedConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', cachedConversationId)
            .eq('status', 'active')
            .single();
          
          if (cachedConv) {
            conversation = cachedConv;
            console.log('✅ Using cached conversation:', conversation.id);
          } else {
            // Remove invalid cache
            localStorage.removeItem(cacheKey);
          }
        }
        
        // Fallback to database query if no cached conversation
        if (!conversation) {
          const conversationQuery = supabase
            .from('conversations')
            .select('*')
            .eq('user_id', user.id)
            .eq('character_id', characterId)
            .eq('conversation_type', sceneId ? 'scene_roleplay' : 'character_roleplay')
            .eq('status', 'active');

        // Add scene filter if sceneId exists  
        if (sceneId) {
          conversationQuery.filter('memory_data->>scene_id', 'eq', sceneId);
        } else {
          conversationQuery.is('memory_data->>scene_id', null);
        }

          const { data: existingConversations, error: queryError } = await conversationQuery.order('updated_at', { ascending: false }).limit(1);

          if (queryError) {
            console.error('Error querying conversations:', queryError);
          } else if (existingConversations && existingConversations.length > 0) {
            conversation = existingConversations[0];
            console.log('🔄 Reusing existing conversation:', conversation.id);
            
            // Cache for future use
            localStorage.setItem(cacheKey, conversation.id);
          }
        }
        
        if (conversation) {
          setConversationId(conversation.id);

          // Load existing messages for this conversation
          const { data: existingMessages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (!messagesError && existingMessages && existingMessages.length > 0) {
            const formattedMessages: Message[] = existingMessages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender === 'assistant' ? 'character' : msg.sender as 'user' | 'character',
              timestamp: msg.created_at
            }));
            setMessages(formattedMessages);
            console.log(`📝 Loaded ${formattedMessages.length} existing messages`);
            
            // Cache conversation ID in localStorage for quick reuse
            localStorage.setItem(`conversation_${characterId}_${sceneId || 'general'}`, conversation.id);
            
            return; // Exit early - no need to kickoff for existing conversation
          }
        }

        // Create new conversation if none exists
        if (!conversation) {
          console.log('🆕 Creating new conversation');
          const conversationTitle = loadedScene
            ? `${loadedCharacter.name} - ${loadedScene.scene_prompt.substring(0, 30)}...`
            : `Roleplay: ${loadedCharacter.name}`;

          const { data: newConversation, error: insertError } = await supabase
            .from('conversations')
            .insert({
              user_id: user.id,
              character_id: characterId,
              conversation_type: sceneId ? 'scene_roleplay' : 'character_roleplay',
              title: conversationTitle,
              status: 'active',
              memory_tier: memoryTier,
              memory_data: sceneId ? { scene_id: sceneId } : {}
            })
            .select()
            .single();

          if (insertError) throw insertError;
          conversation = newConversation;
          setConversationId(newConversation.id);
        }

        // Show "Setting the scene..." indicator
        setIsLoading(true);
        setMessages([{
          id: 'temp-kickoff',
          content: 'Setting the scene...',
          sender: 'character',
          timestamp: new Date().toISOString()
        }]);

        // Make kickoff call to get character's opening message - FORCE NSFW MODE
        const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
        
        console.log('🎬 Kickoff call with scene context:', {
          character_id: characterId,
          scene_context: loadedScene?.scene_prompt?.substring(0, 50) + '...' || 'none',
          scene_system_prompt: loadedScene?.system_prompt?.substring(0, 50) + '...' || 'none',
          content_tier: contentTier
        });

        const { data, error } = await supabase.functions.invoke('roleplay-chat', {
          body: {
            kickoff: true,
            conversation_id: conversation.id,
            character_id: characterId,
            model_provider: modelProvider,
            memory_tier: memoryTier,
            content_tier: contentTier,
            scene_context: loadedScene?.scene_prompt || null,
            scene_system_prompt: loadedScene?.system_prompt || null,
            user_id: user.id,
            // Add prompt template integration
            prompt_template_id: loadedPromptTemplate?.id || null,
            prompt_template_name: loadedPromptTemplate?.template_name || null,
            // Add image model selection
            selected_image_model: selectedImageModel
          }
        });

        if (error) {
          console.error('Kickoff error:', error);
          throw error;
        }

        // Replace loading message with actual opener
        const openerMessage: Message = {
          id: data.message_id || Date.now().toString(),
          content: data.response || `Hello! I'm ${loadedCharacter.name}.`,
          sender: 'character',
          timestamp: new Date().toISOString()
        };
        setMessages([openerMessage]);

      } catch (error) {
        console.error('Error initializing conversation:', error);
        setKickoffError(error.message || 'Failed to start conversation');
        
        // Show retry message instead of fallback greeting
        setMessages([{
          id: 'retry-needed',
          content: "Couldn't set the scene. Tap retry to try again.",
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: { needsRetry: true }
        }]);
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    initializeConversation();
  }, [characterId, sceneId]); // Remove user to prevent auth-triggered resets

  // Separate effect to update memory tier without recreating conversation
  useEffect(() => {
    const updateMemoryTier = async () => {
      if (!conversationId || !user) return;

      try {
        await supabase
          .from('conversations')
          .update({ memory_tier: memoryTier })
          .eq('id', conversationId);
      } catch (error) {
        console.error('Error updating memory tier:', error);
      }
    };

    updateMemoryTier();
  }, [memoryTier, conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to workspace asset updates for job completion
  const subscribeToJobCompletion = (jobId: string, messageId: string) => {
    console.log('🔄 Subscribing to workspace_assets for job:', jobId);
    
    const channel = supabase
      .channel(`job-completion-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_assets',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('✅ Workspace asset created for job:', jobId, payload.new);
          
          const assetData = payload.new;
          if (assetData?.temp_storage_path) {
            // Update the message with the image URL
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  scene_image: assetData.temp_storage_path,
                  content: msg.content.replace('Generating scene...', 'Here\'s your scene!'),
                  metadata: {
                    ...msg.metadata,
                    image_url: assetData.temp_storage_path,
                    asset_id: assetData.id,
                    job_completed: true
                  }
                };
              }
              return msg;
            }));
            
            toast({
              title: 'Scene completed!',
              description: 'Your scene image has been generated.',
            });
          }
          
          // Cleanup subscription after success
          supabase.removeChannel(channel);
        }
      )
      .subscribe();

    // Fallback cleanup after 2 minutes
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 120000);
  };

  const handleSendMessage = async (content: string) => {
    console.log('📤 handleSendMessage called:', { 
      content: content.trim(), 
      hasCharacter: !!character, 
      conversationId, 
      hasUser: !!user 
    });
    
    if (!content.trim() || !character || !conversationId || !user) {
      console.error('❌ Cannot send message - missing required data:', {
        hasContent: !!content.trim(),
        hasCharacter: !!character,
        hasConversationId: !!conversationId,
        hasUser: !!user
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Insert user message into database
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'user',
          content: content.trim(),
          message_type: 'text'
        });

      if (insertError) throw insertError;
      
      // Update conversation updated_at timestamp after user message
      try {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .eq('user_id', user.id);
        console.log('✅ Updated conversation timestamp after user message');
      } catch (error) {
        console.error('Failed to update conversation timestamp:', error);
      }

      // ✅ FORCE NSFW MODE FOR CHAT:
      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      console.log('🎭 Content tier (forced):', contentTier);

      // Validate image model - must be a valid UUID (API model), not 'sdxl' or empty
      const validImageModel = selectedImageModel && selectedImageModel !== 'sdxl' && selectedImageModel.trim() !== '' 
        ? selectedImageModel 
        : null;
      
      if (!validImageModel) {
        console.warn('⚠️ No valid API image model selected - scene generation will be skipped');
      }

      // Call the roleplay-chat edge function with prompt template
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: content.trim(),
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier, // ✅ DYNAMIC CONTENT TIER
          scene_generation: !!validImageModel, // ✅ Only enable if valid API model available
          user_id: user.id,
          // ✅ ADD SCENE CONTEXT:
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          // ✅ ADD PROMPT TEMPLATE INTEGRATION:
          prompt_template_id: promptTemplate?.id || null,
          prompt_template_name: promptTemplate?.template_name || null,
          // ✅ ADD IMAGE MODEL SELECTION (only if valid):
          selected_image_model: validImageModel
        }
      });

      if (error) throw error;

      if (data && data.response) {
        // Normalize job ID from various possible response fields
        const newJobId = data.scene_job_id || data.job_id || data?.jobId || data?.data?.jobId;
        
        const characterMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: Boolean(newJobId),
            consistency_method: character.consistency_method,
            job_id: newJobId
          }
        };
        setMessages(prev => [...prev, characterMessage]);
        
        // Start job polling if scene generation was initiated
        if (newJobId) {
          console.log('🎬 Starting polling for auto-generated scene job:', newJobId);
          subscribeToJobCompletion(newJobId, characterMessage.id);
        }
      } else {
        throw new Error('No response from roleplay-chat function');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        context: error.context,
        status: error.status,
        body: error.body
      });
      
      // Show user-friendly error message
      const errorDetails = error.message || 'Unknown error';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I apologize, but I'm having trouble connecting right now. Error: ${errorDetails}. Please check your model settings or try again.`,
        sender: 'character',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Show toast notification
      toast({
        title: 'Chat Error',
        description: errorDetails,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScene = async () => {
    if (!character || !conversationId || !user) return;
    
    setIsLoading(true);
    setSceneJobStatus('queued');
    
    try {
      // ✅ ENHANCED: Use roleplay-chat edge function for scene generation
      // This will use the enhanced scene generation logic with character visual context
      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: 'Generate a scene based on our current conversation context.',
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_generation: true, // ✅ Enable scene generation
          user_id: user.id,
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          prompt_template_id: promptTemplate?.id || null,
          prompt_template_name: promptTemplate?.template_name || null,
          selected_image_model: selectedImageModel // ✅ Use selected image model
        }
      });

      if (error) throw error;

      // Normalize job ID from various possible response fields
      const newJobId = data?.job_id || data?.scene_job_id || data?.data?.jobId || data?.data?.job_id;
      
      if (newJobId) {
        // Add placeholder message that will be updated when job completes
        const placeholderMessage: Message = {
          id: Date.now().toString(),
          content: 'Generating scene...',
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: true,
            job_id: newJobId,
            consistency_method: consistencySettings.method
          }
        };
        setMessages(prev => [...prev, placeholderMessage]);
        
        // Start polling for job completion
        console.log('🎬 Starting polling for manual scene generation job:', newJobId);
        subscribeToJobCompletion(newJobId, placeholderMessage.id);
        
        // Show request confirmation toast
        toast({
          title: 'Scene requested',
          description: "I'll post it here when it's ready."
        });
      } else {
        throw new Error('No job ID returned from scene generation request');
      }
    } catch (error) {
      console.error('Error generating scene:', error);
      setSceneJobStatus('failed');
      
      // Show friendly error message with retry option
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Scene generation failed. Want to try again?',
        sender: 'character',
        timestamp: new Date().toISOString(),
        metadata: { 
          sceneError: true,
          canRetryScene: true 
        }
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Scene generation failed',
        description: 'Could not generate scene from current conversation context',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/roleplay');
  };

  // Retry kickoff function
  const handleRetryKickoff = async () => {
    if (!user || !characterId || !character) return;

    try {
      setIsLoading(true);
      setKickoffError(null);
      
      setMessages([{
        id: 'temp-retry',
        content: 'Setting the scene...',
        sender: 'character',
        timestamp: new Date().toISOString()
      }]);

      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          kickoff: true,
          conversation_id: conversationId,
          character_id: characterId,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          user_id: user.id,
          selected_image_model: selectedImageModel
        }
      });

      if (error) throw error;

      const openerMessage: Message = {
        id: data.message_id || Date.now().toString(),
        content: data.response || `Hello! I'm ${character.name}.`,
        sender: 'character',
        timestamp: new Date().toISOString()
      };
      setMessages([openerMessage]);
    } catch (error) {
      console.error('Retry kickoff error:', error);
      setKickoffError(error.message || 'Failed to retry');
    } finally {
      setIsLoading(false);
    }
  };

  // Context menu handlers
  const handleClearConversation = async () => {
    if (!user || !characterId || !character) {
      console.warn('Cannot clear conversation: missing user, characterId, or character');
      toast({
        title: 'Error',
        description: 'Cannot reset conversation. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('🔄 Clearing conversation...');
      
      // Archive ALL active conversations for this character/user
      const { error: archiveError } = await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('character_id', characterId)
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (archiveError) {
        console.error('Error archiving conversations:', archiveError);
      } else {
        console.log('✅ Archived all active conversations');
      }

      // Clear ALL localStorage conversation caches for this character
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`conversation_${characterId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`✅ Cleared ${keysToRemove.length} conversation cache(s)`);

      // Show success message
      toast({
        title: 'Conversation Reset',
        description: 'Starting a new conversation...',
      });
      
      // Small delay to show toast, then reload
      setTimeout(() => {
        window.location.reload();
      }, 500);

      // Create brand new conversation
      const conversationTitle = selectedScene
        ? `${character.name} - ${selectedScene.scene_prompt.substring(0, 30)}...`
        : `Roleplay: ${character.name}`;

      const { data: newConversation, error: insertError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          character_id: characterId,
          conversation_type: sceneId ? 'scene_roleplay' : 'character_roleplay',
          title: conversationTitle,
          status: 'active',
          memory_tier: memoryTier,
          memory_data: sceneId ? { scene_id: sceneId } : {}
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setConversationId(newConversation.id);

      // Cache new conversation ID
      localStorage.setItem(cacheKey, newConversation.id);

      // Reset messages and do kickoff again
      setIsLoading(true);
      setMessages([{
        id: 'temp-kickoff',
        content: 'Setting the scene...',
        sender: 'character',
        timestamp: new Date().toISOString()
      }]);

      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          kickoff: true,
          conversation_id: newConversation.id,
          character_id: characterId,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          user_id: user.id,
          selected_image_model: selectedImageModel
        }
      });

      if (error) throw error;

      const openerMessage: Message = {
        id: data.message_id || Date.now().toString(),
        content: data.response || `Hello! I'm ${character.name}.`,
        sender: 'character',
        timestamp: new Date().toISOString()
      };
      setMessages([openerMessage]);

      // Show success toast
      toast({
        title: "Conversation Restarted",
        description: "A fresh conversation has been started with " + character.name,
      });

    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: "Error",
        description: "Failed to restart conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportConversation = () => {
    const conversationText = messages.map(msg => 
      `${msg.sender === 'user' ? 'You' : character?.name}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${character?.name}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareConversation = () => {
    // TODO: Implement sharing functionality
    console.log('Share conversation');
  };

  const handleViewScenes = () => {
    // TODO: Navigate to scenes view
    console.log('View scenes');
  };

  const handleSaveToLibrary = () => {
    // TODO: Save conversation to library
    console.log('Save to library');
  };

  const handleEditCharacter = () => {
    // TODO: Navigate to character editor
    console.log('Edit character');
  };

  const handleReportCharacter = () => {
    // TODO: Implement report functionality
    console.log('Report character');
  };

  if (!character || isInitializing) {
    return (
      <OurVidzDashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-white text-lg">Loading character...</div>
            {kickoffError && (
              <div className="text-red-400 text-sm max-w-md">
                <p>Error: {kickoffError}</p>
                <Button 
                  onClick={handleRetryKickoff}
                  className="mt-2"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="relative">
          <RoleplayHeader
            backTo="/roleplay"
            characterName={character.name}
            characterImage={signedCharacterImage || '/placeholder.svg'}
            onMenuClick={() => setShowCharacterInfo(true)}
            onSettingsClick={() => setShowSettingsModal(true)}
            onResetClick={handleClearConversation}
          />
          {/* Model Selector removed - available in Settings drawer to prevent header overlap */}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={message}
                character={character}
                signedCharacterImageUrl={signedCharacterImage}
                onGenerateScene={handleGenerateScene}
                onRetry={message.metadata?.needsRetry ? handleRetryKickoff : undefined}
              />
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <span className="text-sm">{character?.name} is thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-card">
          {/* Model Selector removed - available in Settings drawer to prevent overlap */}
          <MobileChatInput 
            onSend={handleSendMessage}
            onGenerateScene={handleGenerateScene}
            isLoading={isLoading}
            isMobile={isMobile}
          />
        </div>

        {/* Character Info Drawer - Non-blocking sidebar */}
        <CharacterInfoDrawer
          character={character}
          isOpen={showCharacterInfo}
          onClose={() => setShowCharacterInfo(false)}
          onSceneSelect={(scene) => {
            setSelectedScene(scene);
            // Optionally navigate to scene URL
            if (scene.id) {
              navigate(`/roleplay/chat/${characterId}/scene/${scene.id}`, { replace: true });
            }
          }}
          selectedSceneId={selectedScene?.id}
        />

        {/* Settings Modal */}
        <RoleplaySettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          memoryTier={memoryTier}
          onMemoryTierChange={setMemoryTier}
          modelProvider={modelProvider}
          onModelProviderChange={setModelProvider}
          selectedImageModel={selectedImageModel}
          onSelectedImageModelChange={setSelectedImageModel}
          consistencySettings={consistencySettings}
          onConsistencySettingsChange={setConsistencySettings}
        />

        {/* Context Menu */}
        <ContextMenu
          isOpen={showContextMenu}
          onClose={() => setShowContextMenu(false)}
          onClearConversation={handleClearConversation}
          onExportConversation={handleExportConversation}
          onShareConversation={handleShareConversation}
          onViewScenes={handleViewScenes}
          onSaveToLibrary={handleSaveToLibrary}
          onEditCharacter={handleEditCharacter}
          onReportCharacter={handleReportCharacter}
          canEditCharacter={false} // TODO: Check if user owns character
        />
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayChat;
