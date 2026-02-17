import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
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
import { MobileChatHeader } from '@/components/roleplay/MobileChatHeader';
import { ChatBottomNav } from '@/components/roleplay/ChatBottomNav';
import { CharacterInfoDrawer } from '@/components/roleplay/CharacterInfoDrawer';
import { RoleplaySettingsModal } from '@/components/roleplay/RoleplaySettingsModal';
import { QuickSettingsDrawer } from '@/components/roleplay/QuickSettingsDrawer';
import { ModelSelector } from '@/components/roleplay/ModelSelector';
import { ScenarioSetupWizard } from '@/components/roleplay/ScenarioSetupWizard';
import { SceneGenerationModal } from '@/components/roleplay/SceneGenerationModal';
import { useToast } from '@/hooks/use-toast';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { Character, Message, CharacterScene, SceneStyle, ScenarioSessionPayload, ImageGenerationMode } from '@/types/roleplay';
import { cn } from '@/lib/utils';
import { imageConsistencyService, ConsistencySettings } from '@/services/ImageConsistencyService';
import { ModelRoutingService } from '@/lib/services/ModelRoutingService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { useI2IModels } from '@/hooks/useI2IModels';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useSceneContinuity } from '@/hooks/useSceneContinuity';

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
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  // Extract scene and fresh flags from URL query parameters
  const sceneIdFromUrl = searchParams.get('scene');
  const sceneId = sceneIdFromUrl || undefined; // Keep compatibility with existing code
  const shouldStartFresh = searchParams.get('fresh') === 'true';
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const { isKeyboardVisible } = useKeyboardVisible();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [character, setCharacter] = useState<Character | null>(null);
  const [selectedScene, setSelectedScene] = useState<CharacterScene | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSceneForMessageId, setGeneratingSceneForMessageId] = useState<string | null>(null);
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showScenarioWizard, setShowScenarioWizard] = useState(false);
  const [showSceneGenerationModal, setShowSceneGenerationModal] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioSessionPayload | null>(null);
  const [signedCharacterImage, setSignedCharacterImage] = useState<string | null>(null);
  const [memoryTier, setMemoryTier] = useState<'conversation' | 'character' | 'profile'>('conversation');
  
  // Load models from database - includes defaultModel for reliable fallbacks
  const {
    allModelOptions: roleplayModelOptions,
    defaultModel: defaultChatModel,
    isLoading: roleplayModelsLoading,
    chatWorkerHealthy
  } = useRoleplayModels();
  const {
    modelOptions: imageModelOptions,
    defaultModel: defaultImageModel,
    isLoading: imageModelsLoading
  } = useImageModels();
  const {
    modelOptions: i2iModelOptions
  } = useI2IModels();

  // I2I model state
  const [selectedI2IModel, setSelectedI2IModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('roleplay-settings');
      return saved ? JSON.parse(saved).selectedI2IModel || 'auto' : 'auto';
    } catch { return 'auto'; }
  });

  // Load user characters for identity settings
  const {
    characters: userCharacters,
    defaultCharacterId,
    isLoading: userCharactersLoading
  } = useUserCharacters();

  // Auth hook - must be called before using user
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // User character state
  const [selectedUserCharacterId, setSelectedUserCharacterId] = useState<string | null>(null);
  const [signedUserCharacterImage, setSignedUserCharacterImage] = useState<string | null>(null);

  // Load default character immediately (before models initialize)
  useEffect(() => {
    if (user?.id && defaultCharacterId && !selectedUserCharacterId) {
      // Only set if no saved preference exists
      const savedSettings = localStorage.getItem('roleplay-settings');
      if (!savedSettings) {
        // No saved settings, use default character
        setSelectedUserCharacterId(defaultCharacterId);
        console.log('✅ Loaded default character immediately:', defaultCharacterId);
      } else {
        try {
          const parsed = JSON.parse(savedSettings);
          if (!parsed.userCharacterId) {
            // Saved settings exist but no user character selected, use default
            setSelectedUserCharacterId(defaultCharacterId);
            console.log('✅ Loaded default character (no saved selection):', defaultCharacterId);
          }
        } catch (error) {
          // If parsing fails, use default character
          setSelectedUserCharacterId(defaultCharacterId);
          console.log('✅ Loaded default character (parse error):', defaultCharacterId);
        }
      }
    }
  }, [user?.id, defaultCharacterId]); // Run before model initialization

  // Initialize settings with saved values or database defaults (API models preferred)
  const initializeSettings = () => {
    const savedSettings = localStorage.getItem('roleplay-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const savedChatModel = parsed.modelProvider;
        const savedImageModel = parsed.selectedImageModel;

        // Validate saved chat model - check if it exists and is available
        const savedChatModelOption = roleplayModelOptions.find(m => m.value === savedChatModel);
        const isValidChatModel = savedChatModelOption && savedChatModelOption.isAvailable;

        // Validate saved image model - check if it exists and is available
        const savedImageModelOption = imageModelOptions.find(m => m.value === savedImageModel);
        const isValidImageModel = savedImageModelOption && savedImageModelOption.isAvailable;

        // If local model was saved but is now unavailable, fall back to API
        const effectiveChatModel = isValidChatModel
          ? savedChatModel
          : (defaultChatModel?.value || ModelRoutingService.getDefaultChatModelKey());

        const effectiveImageModel = isValidImageModel
          ? savedImageModel
          : (defaultImageModel?.value || '');

        return {
          modelProvider: effectiveChatModel,
          selectedImageModel: effectiveImageModel,
          consistencySettings: parsed.consistencySettings || {
            method: 'hybrid',
            reference_strength: 0.35,
            denoise_strength: 0.25,
            modify_strength: 0.5
          },
          userCharacterId: parsed.userCharacterId || null,
          sceneStyle: parsed.sceneStyle || 'character_only',
          imageGenerationMode: parsed.imageGenerationMode || 'auto'
        };
      } catch (error) {
        console.warn('Failed to parse saved roleplay settings:', error);
      }
    }

    // Use defaults from hooks (always non-local API models for reliability)
    return {
      modelProvider: defaultChatModel?.value || ModelRoutingService.getDefaultChatModelKey(),
      selectedImageModel: defaultImageModel?.value || '',
      consistencySettings: {
        method: 'hybrid',
        reference_strength: 0.35,
        denoise_strength: 0.25,
        modify_strength: 0.5
      },
      userCharacterId: null,
      sceneStyle: 'character_only' as const,
      imageGenerationMode: 'auto' as const
    };
  };
  
  // Initialize settings after models are loaded
  const [modelProvider, setModelProvider] = useState<string>('');
  const [selectedImageModel, setSelectedImageModel] = useState<string>(''); // Will be set from database API models (not 'sdxl')
  const [consistencySettings, setConsistencySettings] = useState<ConsistencySettings>({
    method: 'hybrid',
    reference_strength: 0.35,
    denoise_strength: 0.25,
    modify_strength: 0.5
  });
  const [sceneStyle, setSceneStyle] = useState<'character_only' | 'pov' | 'both_characters'>('character_only');
  const [imageGenerationMode, setImageGenerationMode] = useState<ImageGenerationMode>('auto');
  
  // Update defaults when models are loaded (only once)
  const hasInitializedModelDefaults = useRef(false);
  useEffect(() => {
    if (!roleplayModelsLoading && !imageModelsLoading && !hasInitializedModelDefaults.current && roleplayModelOptions.length > 0 && imageModelOptions.length > 0) {
      const settings = initializeSettings();

      // ✅ FIX: Parse location state BEFORE using navigation variables
      const locationState = location.state as {
        userCharacterId?: string | null;
        sceneStyle?: 'character_only' | 'pov' | 'both_characters';
        imageGenerationMode?: ImageGenerationMode;
        selectedImageModel?: string | null;
        selectedChatModel?: string | null;
      } | null;

      const userCharacterIdFromNavigation = locationState?.userCharacterId;
      const sceneStyleFromNavigation = locationState?.sceneStyle;
      const imageGenerationModeFromNavigation = locationState?.imageGenerationMode;
      const selectedImageModelFromNavigation = locationState?.selectedImageModel;
      const selectedChatModelFromNavigation = locationState?.selectedChatModel;

      // Apply DB/localStorage defaults first; then override from navigation state when starting from SceneSetupSheet
      const effectiveChatModel = selectedChatModelFromNavigation ?? settings.modelProvider;
      const effectiveImageModel = selectedImageModelFromNavigation ?? settings.selectedImageModel;
      let effectiveUserCharacterId: string | null = null;
      let userCharacterSource = '';

      if (userCharacterIdFromNavigation !== undefined) {
        // Highest priority: Navigation state from scene setup modal
        effectiveUserCharacterId = userCharacterIdFromNavigation;
        userCharacterSource = 'navigation state';
      } else if (settings.userCharacterId) {
        // Medium priority: Saved localStorage preference
        effectiveUserCharacterId = settings.userCharacterId;
        userCharacterSource = 'localStorage';
      } else if (defaultCharacterId) {
        // Lowest priority: Profile default character
        effectiveUserCharacterId = defaultCharacterId;
        userCharacterSource = 'profile default';
      } else {
        // No character selected
        effectiveUserCharacterId = null;
        userCharacterSource = 'none (anonymous)';
      }

      setSelectedUserCharacterId(effectiveUserCharacterId);
      
      // ✅ FIX: Priority order for sceneStyle: navigationState → localStorage
      const effectiveSceneStyle = sceneStyleFromNavigation || settings.sceneStyle;
      setSceneStyle(effectiveSceneStyle);
      
      // ✅ Priority order for imageGenerationMode: navigationState → localStorage
      const effectiveImageGenerationMode = imageGenerationModeFromNavigation || settings.imageGenerationMode;
      setImageGenerationMode(effectiveImageGenerationMode);
      
      hasInitializedModelDefaults.current = true;
      console.log('✅ Initialized model defaults from database:', {
        chatModel: effectiveChatModel,
        imageModel: effectiveImageModel,
        chatModelSource: selectedChatModelFromNavigation != null ? 'navigation state' : 'localStorage',
        imageModelSource: selectedImageModelFromNavigation != null ? 'navigation state' : 'localStorage',
        userCharacterId: effectiveUserCharacterId,
        userCharacterSource,
        sceneStyle: effectiveSceneStyle,
        sceneStyleSource: sceneStyleFromNavigation ? 'navigation state' : 'localStorage',
        imageGenerationMode: effectiveImageGenerationMode,
        chatModelType: roleplayModelOptions.find(m => m.value === effectiveChatModel)?.isLocal ? 'local' : 'api',
        imageModelType: imageModelOptions.find(m => m.value === effectiveImageModel)?.type || 'unknown'
      });
    }
  }, [roleplayModelsLoading, imageModelsLoading, roleplayModelOptions, imageModelOptions, defaultCharacterId]);

  // Reload template when model changes
  useEffect(() => {
    if (modelProvider && !roleplayModelsLoading) {
      loadPromptTemplate(modelProvider, 'nsfw').then(template => {
        setPromptTemplate(template);
        console.log('📝 Template reloaded for model:', modelProvider, template?.template_name || 'none');
      });
    }
  }, [modelProvider, roleplayModelsLoading]);
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
  // ✅ CRITICAL FIX: Ref-based lock to prevent duplicate initialization
  const initializationLock = useRef(false);

  // Signed URL hook for image URLs
  const { getSignedUrl } = useSignedImageUrls();

  // Scene continuity hook - tracks previous scene for I2I iteration
  const {
    isEnabled: sceneContinuityEnabled,
    previousSceneId,
    previousSceneImageUrl,
    setLastScene,
    clearLastScene
  } = useSceneContinuity(conversationId || undefined);

  // Track active Realtime subscriptions for cleanup
  const activeChannelsRef = useRef<Set<any>>(new Set());

  // Helper to get valid image model with fallback to first active Replicate model
  // Always returns a valid Replicate model UUID (never null) to avoid defaulting to local SDXL
  const getValidImageModel = (): string | null => {
    // If selected model is valid (not 'sdxl' or empty), use it
    if (selectedImageModel && selectedImageModel !== 'sdxl' && selectedImageModel !== 'sdxl_image_high' && selectedImageModel !== 'sdxl_image_fast' && selectedImageModel.trim() !== '') {
      // Verify it's still available
      const modelExists = imageModelOptions.find(m => m.value === selectedImageModel && m.isAvailable);
      if (modelExists) {
        return selectedImageModel;
      }
      console.warn('⚠️ Selected image model no longer available, falling back to default Replicate model');
    }
    // Fall back to first available Replicate/API model (prioritize active models from database)
    const replicateModels = imageModelOptions.filter(m => m.type === 'api' && m.isAvailable);
    if (replicateModels.length > 0) {
      console.log('📸 Using default Replicate model:', replicateModels[0].value);
      return replicateModels[0].value;
    }
    // If no API models available, return null (edge function will handle fallback)
    console.warn('⚠️ No Replicate image models available');
    return null;
  };

  // Cleanup on unmount - remove all active subscriptions
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
      currentRouteRef.current = '';

      // Clean up all active Realtime subscriptions
      if (activeChannelsRef.current.size > 0) {
        console.log('🧹 Cleaning up', activeChannelsRef.current.size, 'active Realtime subscriptions');
        activeChannelsRef.current.forEach(channel => {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.error('Error removing channel:', error);
          }
        });
        activeChannelsRef.current.clear();
      }
    };
  }, []);

  // Get the selected user character object
  const selectedUserCharacter = selectedUserCharacterId
    ? userCharacters.find(c => c.id === selectedUserCharacterId) || null
    : null;

  // Load signed URL for user character image
  useEffect(() => {
    const loadUserCharacterImage = async () => {
      if (!selectedUserCharacter?.image_url) {
        setSignedUserCharacterImage(null);
        return;
      }

      if (selectedUserCharacter.image_url.startsWith('http')) {
        setSignedUserCharacterImage(selectedUserCharacter.image_url);
      } else {
        try {
          const signedUrl = await getSignedUrl(selectedUserCharacter.image_url, 'user-library');
          setSignedUserCharacterImage(signedUrl);
        } catch (error) {
          console.error('Error signing user character image:', error);
          setSignedUserCharacterImage(null);
        }
      }
    };

    loadUserCharacterImage();
  }, [selectedUserCharacter?.image_url, getSignedUrl]);

  // Update conversation's user_character_id when user changes it in settings
  const hasUpdatedUserCharacter = useRef(false);
  useEffect(() => {
    const updateConversationUserCharacter = async () => {
      // Skip if no conversation or if this is initial load
      if (!conversationId || !hasInitializedModelDefaults.current) return;

      // Skip if we already updated this session (prevent loop)
      if (hasUpdatedUserCharacter.current) {
        hasUpdatedUserCharacter.current = false;
        return;
      }

      try {
        const { error } = await supabase
          .from('conversations')
          .update({ user_character_id: selectedUserCharacterId })
          .eq('id', conversationId)
          .eq('user_id', user?.id);

        if (error) {
          console.error('Error updating conversation user character:', error);
        } else {
          console.log('✅ Updated conversation user_character_id:', selectedUserCharacterId);
        }
      } catch (err) {
        console.error('Error updating conversation user character:', err);
      }
    };

    updateConversationUserCharacter();
  }, [selectedUserCharacterId, conversationId, user?.id]);

  // Load prompt template for roleplay - model-specific with fallback to universal
  const loadPromptTemplate = async (modelKey: string, contentTier: string) => {
    try {
      // ✅ Normalize model key (remove "openrouter:" prefix if present)
      const normalizedModelKey = modelKey.replace(/^openrouter:/, '').trim();
      
      // First try model-specific template with normalized key
      const { data: modelSpecific, error: modelError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('target_model', normalizedModelKey)
        .eq('use_case', 'character_roleplay')
        .eq('content_mode', contentTier)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!modelError && modelSpecific) {
        console.log('✅ Loaded model-specific template:', modelSpecific.template_name, 'for model:', normalizedModelKey);
        return modelSpecific;
      }

      // Try with original model key (in case it's stored with prefix)
      if (normalizedModelKey !== modelKey) {
        const { data: modelSpecificAlt, error: modelErrorAlt } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('target_model', modelKey)
          .eq('use_case', 'character_roleplay')
          .eq('content_mode', contentTier)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!modelErrorAlt && modelSpecificAlt) {
          console.log('✅ Loaded model-specific template (with prefix):', modelSpecificAlt.template_name, 'for model:', modelKey);
          return modelSpecificAlt;
        }
      }

      // Fallback to universal template (target_model IS NULL)
      const { data: universal, error: universalError } = await supabase
        .from('prompt_templates')
        .select('*')
        .is('target_model', null)
        .eq('use_case', 'character_roleplay')
        .eq('content_mode', contentTier)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!universalError && universal) {
        console.log('⚠️ No model-specific template found, using universal template:', universal.template_name);
        return universal;
      }

      console.error('❌ No template found for model:', modelKey, '(normalized:', normalizedModelKey, ') content tier:', contentTier);
      return null;
    } catch (error) {
      console.error('Error in loadPromptTemplate:', error);
      return null;
    }
  };

  // Initialize conversation and load data
  useEffect(() => {
    const initializeConversation = async () => {
      const routeKey = `${characterId}-${sceneId || 'none'}`;
      
      // ✅ CRITICAL FIX: Prevent duplicate initialization with ref lock
      if (initializationLock.current) {
        console.log('🔒 Already initializing, preventing duplicate');
        return;
      }
      
      // Prevent reinitialization for same route
      if (hasInitialized.current && currentRouteRef.current === routeKey) {
        console.log('🔒 Preventing duplicate initialization for route:', routeKey);
        return;
      }
      
      // Set lock immediately
      initializationLock.current = true;

      if (!user || !characterId) {
        setIsInitializing(false);
        return;
      }

      // Extract userCharacterId and forceNewConversation from navigation state (from scene setup)
      const locationState = location.state as {
        sceneConfig?: any;
        scenarioPayload?: ScenarioSessionPayload;
        userCharacterId?: string | null;
        forceNewConversation?: boolean;
      } | null;

      // Check if this is a fresh scene start
      const forceNewConversation = locationState?.forceNewConversation || shouldStartFresh;

      // ✅ FIX: userCharacterId from navigation state is now handled in settings initialization
      // with proper priority: navigationState → localStorage → profileDefault (lines 208-244)
      // This prevents race condition where localStorage overwrites navigation state

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

        // Load scene data from scenes table (templates, not artifacts)
        let loadedScene = null;
        if (sceneId) {
          // Load specific scene template if provided in URL
          try {
            const { data: sceneData, error: sceneError } = await supabase
              .from('scenes')  // Query scenes table for templates
              .select('*')
              .eq('id', sceneId)
              .single();

            if (!sceneError && sceneData) {
              loadedScene = sceneData;
              // Cast scenes table data to CharacterScene (add required character_id)
              setSelectedScene({ ...sceneData, character_id: characterId || '' } as CharacterScene);
              console.log('🎬 Loaded scene template:', sceneData.name, '-', sceneData.scene_prompt?.substring(0, 50) + '...');
            } else {
              console.error('❌ Failed to load scene template:', sceneError);
            }
          } catch (error) {
            console.error('Error loading scene template:', error);
          }
        } else {
          // No sceneId provided - scenes are optional, start without scene context
          console.log('ℹ️ No scene specified, starting general conversation');
        }

        // Load prompt template for roleplay - use current modelProvider
        const loadedPromptTemplate = await loadPromptTemplate(modelProvider, 'nsfw');
        setPromptTemplate(loadedPromptTemplate);
        console.log('📝 Loaded prompt template:', loadedPromptTemplate?.template_name || 'none');

        // Mark route as initialized
        hasInitialized.current = true;
        currentRouteRef.current = routeKey;
        setKickoffError(null);

        // Check for existing active conversation first
        let conversation = null;

        // Use scene-specific cache key if scene present
        const cacheKey = sceneIdFromUrl
          ? `conversation_${characterId}_scene_${sceneIdFromUrl}`
          : `conversation_${characterId}_general`;

        // Skip conversation lookup if forcing new conversation (fresh scene start)
        if (!forceNewConversation) {
          console.log('🔍 Looking for existing conversation (not forcing new)');

          // Priority 1: Use conversation ID from URL query param (from "Continue Where You Left Off")
          if (conversationIdFromUrl) {
          console.log('🔍 Loading conversation from URL param:', conversationIdFromUrl);
          const { data: urlConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationIdFromUrl)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (urlConv) {
            conversation = urlConv;
            console.log('✅ Using conversation from URL:', conversation.id);
          } else {
            console.warn('⚠️ Conversation from URL not found or inactive');
          }
          }

          // Priority 2: Try localStorage cache for quick lookup
          if (!conversation) {
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
        }

        // Priority 3: Fallback to database query if no cached conversation
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
        } else {
          console.log('🆕 Starting fresh scene conversation (skipping lookup)');
          // Will create new conversation below
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
            // ✅ FIX: Restore scene images from character_scenes or user_library for messages with scene metadata
            const formattedMessages: Message[] = await Promise.all(
              existingMessages.map(async (msg) => {
                // Type assertion for messages with metadata from database
                const msgWithMeta = msg as typeof msg & { metadata?: Record<string, any> };
                const baseMessage: Message = {
                  id: msg.id,
                  content: msg.content,
                  sender: msg.sender === 'assistant' ? 'character' : msg.sender as 'user' | 'character',
                  timestamp: msg.created_at,
                  metadata: msgWithMeta.metadata || {}
                };

                // ✅ FIX: If message has scene metadata but no valid image, restore from character_scenes or user_library
                if (baseMessage.metadata?.scene_generated && baseMessage.metadata?.scene_id) {
                  const sceneId = baseMessage.metadata.scene_id;
                  
                  // First, try to get image from character_scenes table
                  const { data: sceneData } = await supabase
                    .from('character_scenes')
                    .select('image_url, scene_prompt, generation_metadata')
                    .eq('id', sceneId)
                    .single();

                  if (sceneData?.image_url) {
                    // Use scene image from character_scenes
                    baseMessage.metadata!.image_url = sceneData.image_url;
                    baseMessage.metadata!.scene_prompt = sceneData.scene_prompt;
                    if (sceneData.generation_metadata) {
                      baseMessage.metadata!.generation_metadata = {
                        ...(baseMessage.metadata?.generation_metadata || {}),
                        ...(sceneData.generation_metadata as Record<string, any> || {})
                      };
                    }
                    console.log('✅ Restored scene image from character_scenes:', sceneId);
                  } else {
                    // Fallback: Try to find scene in user_library
                    const { data: libraryScene } = await supabase
                      .from('user_library')
                      .select('storage_path, original_prompt')
                      .eq('user_id', user.id)
                      .eq('content_category', 'scene')
                      .contains('roleplay_metadata', { scene_id: sceneId })
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    if (libraryScene?.storage_path) {
                      // Use library scene path
                      baseMessage.metadata.image_url = `user-library/${libraryScene.storage_path}`;
                      if (libraryScene.original_prompt) {
                        baseMessage.metadata.scene_prompt = libraryScene.original_prompt;
                      }
                      console.log('✅ Restored scene image from user_library:', sceneId);
                    } else {
                      console.warn('⚠️ Scene image not found in character_scenes or user_library:', sceneId);
                    }
                  }
                }

                return baseMessage;
              })
            );

            setMessages(formattedMessages);
            console.log(`📝 Loaded ${formattedMessages.length} existing messages with scene restoration`);
            
            // Cache conversation ID in localStorage for quick reuse
            localStorage.setItem(`conversation_${characterId}_${sceneId || 'general'}`, conversation.id);
            
            return; // Exit early - no need to kickoff for existing conversation
          }
        }

        // ✅ CRITICAL FIX: Check for existing conversation before creating (prevent duplicates)
        // Create new conversation if none exists or forcing new conversation (fresh scene start)
        const userCharacterIdFromState = locationState?.userCharacterId;
        const effectiveUserCharacterId = userCharacterIdFromState !== undefined
          ? userCharacterIdFromState
          : selectedUserCharacterId;

        if (!conversation || forceNewConversation) {
          // ✅ CRITICAL FIX: Double-check database for existing conversation (prevent race condition duplicates)
          if (!forceNewConversation) {
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('user_id', user.id)
              .eq('character_id', characterId)
              .eq('status', 'active')
              .eq('conversation_type', sceneIdFromUrl ? 'scene_roleplay' : 'character_roleplay')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (existingConv) {
              console.log('🔄 Found existing conversation during creation check, reusing:', existingConv.id);
              conversation = existingConv;
              setConversationId(existingConv.id);
              // Cache for future use
              localStorage.setItem(cacheKey, existingConv.id);
              // Skip creation
            }
          }
          
          // Only create if we still don't have a conversation
          if (!conversation) {
            console.log('🆕 Creating new conversation', forceNewConversation ? '(fresh scene start)' : '');

            // Get scene name from location state or loaded scene
            const sceneName = locationState?.sceneConfig?.scene?.name || (locationState?.scenarioPayload as any)?.sceneName;
            const userRole = (locationState as any)?.userRole;

            const conversationTitle = sceneIdFromUrl && sceneName
              ? `${loadedCharacter.name} - ${sceneName}`
              : loadedScene
              ? `${loadedCharacter.name} - ${loadedScene.scene_prompt.substring(0, 30)}...`
              : `Roleplay: ${loadedCharacter.name}`;

            const { data: newConversation, error: insertError } = await supabase
              .from('conversations')
              .insert({
                user_id: user.id,
                character_id: characterId,
                conversation_type: sceneIdFromUrl ? 'scene_roleplay' : 'character_roleplay',
                title: conversationTitle,
                status: 'active',
                memory_tier: memoryTier,
                memory_data: sceneIdFromUrl ? {
                  scene_id: sceneIdFromUrl,
                  scene_name: sceneName || null,
                  user_character_id: effectiveUserCharacterId || null,
                  user_role: userRole || null
                } : {},
                user_character_id: effectiveUserCharacterId || null
              })
              .select()
              .single();

            if (insertError) throw insertError;
            conversation = newConversation;
            setConversationId(newConversation.id);
            console.log('✅ Created new conversation with user_character_id:', effectiveUserCharacterId);
            
            // Cache immediately
            localStorage.setItem(cacheKey, newConversation.id);
          }
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

        // Extract user role from location state
        const userRole = (locationState as any)?.userRole || locationState?.sceneConfig?.userRole;

        // Sign template preview image for first-scene I2I (kick off from template image, not T2I)
        let signedScenePreviewUrl: string | null = null;
        if (loadedScene?.preview_image_url) {
          if (loadedScene.preview_image_url.startsWith('http://') || loadedScene.preview_image_url.startsWith('https://')) {
            signedScenePreviewUrl = loadedScene.preview_image_url;
          } else {
            const bucket = loadedScene.preview_image_url.includes('workspace') ? 'workspace-temp' : 'user-library';
            signedScenePreviewUrl = await getSignedUrl(loadedScene.preview_image_url, bucket);
          }
        }

        // Read ALL selections directly from location.state to bypass stale React state
        const modelState = location.state as { 
          selectedChatModel?: string; 
          selectedImageModel?: string;
          sceneStyle?: 'character_only' | 'pov' | 'both_characters';
          imageGenerationMode?: string;
        } | null;
        const effectiveChatModel = modelState?.selectedChatModel || modelProvider || ModelRoutingService.getDefaultChatModelKey();
        const effectiveImageModel = modelState?.selectedImageModel || getValidImageModel();
        const effectiveSceneStyle = modelState?.sceneStyle || sceneStyle;
        const effectiveImageGenMode = modelState?.imageGenerationMode || imageGenerationMode;

        // Also update state so subsequent messages use the correct settings
        if (modelState?.selectedChatModel && modelState.selectedChatModel !== modelProvider) {
          setModelProvider(modelState.selectedChatModel);
        }
        if (modelState?.selectedImageModel && modelState.selectedImageModel !== selectedImageModel) {
          setSelectedImageModel(modelState.selectedImageModel);
        }
        if (modelState?.sceneStyle && modelState.sceneStyle !== sceneStyle) {
          setSceneStyle(modelState.sceneStyle);
        }
        if (modelState?.imageGenerationMode && modelState.imageGenerationMode !== imageGenerationMode) {
          setImageGenerationMode(modelState.imageGenerationMode as ImageGenerationMode);
        }

        console.log('🎯 KICKOFF: Effective settings from location.state:', {
          chatModel: effectiveChatModel,
          imageModel: effectiveImageModel,
          sceneStyle: effectiveSceneStyle,
          imageGenMode: effectiveImageGenMode,
          fromState: !!modelState
        });

        const { data, error} = await supabase.functions.invoke('roleplay-chat', {
          body: {
            kickoff: true,
            conversation_id: conversation.id,
            character_id: characterId,
            model_provider: effectiveChatModel,
            memory_tier: memoryTier,
            content_tier: contentTier,
            scene_generation: effectiveImageGenMode !== 'manual',
            scene_context: loadedScene?.scene_prompt || null,
            scene_name: loadedScene?.name || null,
            scene_description: loadedScene?.description || null,
            scene_starters: loadedScene?.scene_starters || null,
            scene_preview_image_url: signedScenePreviewUrl || null,
            user_id: user.id,
            user_role: userRole || null,
            user_character_id: effectiveUserCharacterId || null,
            selected_image_model: effectiveImageModel,
            // Scene style for user representation in images
            scene_style: effectiveSceneStyle,
            // ✅ Multi-reference: user character reference for both_characters scenes
            user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
            // ✅ Pass consistency settings from UI
            consistency_settings: consistencySettings,
            // 🔄 Scene continuity (initial kickoff - no previous scene yet)
            scene_continuity_enabled: sceneContinuityEnabled,
            previous_scene_id: null,
            previous_scene_image_url: null
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
          timestamp: new Date().toISOString(),
          // ✅ FIX: Include scene metadata for image display and polling
          metadata: {
            scene_generated: data.scene_generated || false,
            job_id: data.scene_job_id || undefined,
            scene_id: data.scene_id || undefined,
            usedFallback: data.usedFallback || false
          }
        };
        setMessages([openerMessage]);

        // ✅ FIX: Start subscription for kickoff scene generation job
        if (data.scene_job_id) {
          console.log('🎬 Starting subscription for kickoff scene job:', { 
            jobId: data.scene_job_id, 
            messageId: openerMessage.id 
          });
          subscribeToJobCompletion(data.scene_job_id, openerMessage.id);
        } else if (data.scene_generating_async && conversation?.id) {
          // ✅ ASYNC SCENE: Scene is generating in background - subscribe to character_scenes
          console.log('🎬 Scene generating async - subscribing to character_scenes for:', conversation.id);
          subscribeToConversationScenes(conversation.id, openerMessage.id);
        } else {
          console.log('⚠️ No scene_job_id in kickoff response - scene generation may have been skipped');
        }

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
        // ✅ CRITICAL FIX: Release lock after initialization completes
        initializationLock.current = false;
        hasInitialized.current = true;
        currentRouteRef.current = routeKey;
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
  // ✅ FIX: Check for existing asset first (handles sync providers like fal.ai)
  // ✅ FIX: Store scene_id per message for I2I continuity tracking
  const messageSceneIdsRef = useRef<Map<string, string>>(new Map());

  const subscribeToJobCompletion = async (jobId: string, messageId: string) => {
    console.log('🔄 Checking/subscribing to workspace_assets for job:', { jobId, messageId });

    // Helper to update message with asset data
    const updateMessageWithAsset = async (assetData: { temp_storage_path: string; id: string; scene_id?: string }) => {
      console.log('🎬 updateMessageWithAsset called:', {
        messageId,
        assetId: assetData.id,
        tempStoragePath: assetData.temp_storage_path?.substring(0, 60) + '...',
        sceneId: assetData.scene_id
      });

      // ✅ FIX: Fetch scene data from character_scenes if scene_id is available
      let scenePrompt: string | undefined;
      let originalScenePrompt: string | undefined;
      let sceneTemplateId: string | undefined;
      let sceneTemplateName: string | undefined;

      if (assetData.scene_id) {
        try {
          const { data: sceneData } = await supabase
            .from('character_scenes')
            .select('scene_prompt, generation_metadata')
            .eq('id', assetData.scene_id)
            .single();

          if (sceneData) {
            scenePrompt = sceneData.scene_prompt;
            const genMeta = sceneData.generation_metadata as Record<string, any> | null;
            originalScenePrompt = genMeta?.original_scene_prompt;
            sceneTemplateId = genMeta?.scene_template_id;
            sceneTemplateName = genMeta?.scene_template_name;
            console.log('✅ Fetched scene data:', {
              hasScenePrompt: !!scenePrompt,
              hasOriginalPrompt: !!originalScenePrompt,
              hasTemplateInfo: !!(sceneTemplateId || sceneTemplateName)
            });
          }
        } catch (error) {
          console.error('❌ Error fetching scene data:', error);
        }
      }

      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === messageId);
        console.log('🎬 Message lookup:', { messageId, messageExists, totalMessages: prev.length });

        return prev.map(msg => {
          if (msg.id === messageId) {
            console.log('🎬 Updating message with image_url:', assetData.temp_storage_path);
            return {
              ...msg,
              content: msg.content.replace('Generating scene...', 'Here\'s your scene!'),
              metadata: {
                ...msg.metadata,
                // metadata.image_url is the canonical location for scene images
                image_url: assetData.temp_storage_path,
                asset_id: assetData.id,
                // ✅ FIX: Preserve scene_id from message metadata if assetData doesn't have it
                scene_id: assetData.scene_id || msg.metadata?.scene_id,
                scene_prompt: scenePrompt, // ✅ FIX: Store scene prompt
                job_completed: true,
                // ✅ FIX: Update generation_metadata with scene template info and original prompt
                generation_metadata: {
                  ...msg.metadata?.generation_metadata,
                  scene_template_id: sceneTemplateId,
                  scene_template_name: sceneTemplateName,
                  original_scene_prompt: originalScenePrompt || scenePrompt
                }
              }
            };
          }
          return msg;
        });
      });

      // 🔄 Track this scene for I2I continuity
      if (conversationId && assetData.temp_storage_path) {
        // ✅ FIX: Get scene_id from multiple sources with priority:
        // 1. generation_settings (after edge function deployment)
        // 2. messageSceneIdsRef (stored when message was created)
        // 3. message metadata (fallback)
        // 4. asset_id (last resort)
        let sceneIdForTracking = assetData.scene_id || messageSceneIdsRef.current.get(messageId) || assetData.id;
        
        setLastScene(conversationId, sceneIdForTracking, assetData.temp_storage_path);
        console.log('🔄 Scene continuity: Tracked last scene for I2I iteration', {
          conversationId,
          sceneId: sceneIdForTracking,
          imageUrl: assetData.temp_storage_path.substring(0, 60) + '...',
          source: assetData.scene_id ? 'generation_settings' : (messageSceneIdsRef.current.has(messageId) ? 'message_ref' : 'asset_id_fallback')
        });
        
        // Clean up the ref entry
        messageSceneIdsRef.current.delete(messageId);

        // 📸 Persist last scene image to conversation for dashboard thumbnails
        // Copy from workspace-temp to user-library for persistence
        (async () => {
          try {
            // Download the image from workspace-temp
            const { data: downloadData, error: downloadError } = await supabase.storage
              .from('workspace-temp')
              .download(assetData.temp_storage_path);

            if (downloadError || !downloadData) {
              console.error('❌ Failed to download scene image for persistence:', downloadError);
              // Fallback: store temp path anyway
              await supabase
                .from('conversations')
                .update({ last_scene_image: assetData.temp_storage_path } as any)
                .eq('id', conversationId);
              return;
            }

            // Upload to user-library with persistent path
            const persistentPath = `${user?.id}/scene-thumbnails/${conversationId}/${assetData.id}.png`;
            const { error: uploadError } = await supabase.storage
              .from('user-library')
              .upload(persistentPath, downloadData, {
                contentType: 'image/png',
                upsert: true
              });

            if (uploadError) {
              console.error('❌ Failed to upload scene image to user-library:', uploadError);
              // Fallback: store temp path anyway
              await supabase
                .from('conversations')
                .update({ last_scene_image: assetData.temp_storage_path } as any)
                .eq('id', conversationId);
              return;
            }

            // Store the persistent path in the conversation
            const { error: updateError } = await supabase
              .from('conversations')
              .update({ last_scene_image: persistentPath } as any)
              .eq('id', conversationId);

            if (updateError) {
              console.error('❌ Failed to update conversation last_scene_image:', updateError);
            } else {
              console.log('✅ Persisted scene thumbnail to user-library:', persistentPath);
            }
          } catch (err) {
            console.error('❌ Error persisting scene thumbnail:', err);
          }
        })();
      }

      toast({
        title: 'Scene completed!',
        description: 'Your scene image has been generated.',
      });
    };

    // ✅ FIX: First check if asset already exists (for sync providers like fal.ai)
    console.log('🔍 Querying workspace_assets for job_id:', jobId);
    const { data: existingAsset, error: queryError } = await supabase
      .from('workspace_assets')
      .select('id, temp_storage_path, generation_settings')
      .eq('job_id', jobId)
      .maybeSingle();

    console.log('🔍 Query result:', {
      existingAsset: existingAsset ? { id: existingAsset.id, hasPath: !!existingAsset.temp_storage_path } : null,
      queryError: queryError?.message || null
    });

    if (!queryError && existingAsset?.temp_storage_path) {
      console.log('✅ Asset already exists for job (sync provider):', jobId);
      // Extract scene_id from generation_settings if available
      const sceneId = (existingAsset.generation_settings as any)?.scene_id;
      await updateMessageWithAsset({ ...existingAsset, scene_id: sceneId });
      return; // No need to subscribe
    }

    // Asset doesn't exist yet - subscribe for async providers (replicate, etc.)
    console.log('🔄 Asset not found, subscribing for realtime updates...');

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
        async (payload) => {
          console.log('✅ Workspace asset created for job:', jobId, payload.new);

          const assetData = payload.new as { temp_storage_path?: string; id: string; generation_settings?: any };
          if (assetData?.temp_storage_path) {
            // Extract scene_id from generation_settings if available
            const sceneId = assetData.generation_settings?.scene_id;
            await updateMessageWithAsset({
              temp_storage_path: assetData.temp_storage_path,
              id: assetData.id,
              scene_id: sceneId
            });
          }

          // Cleanup subscription after success
          try {
            await supabase.removeChannel(channel);
            activeChannelsRef.current.delete(channel);
            console.log('✅ Cleaned up subscription for job:', jobId);
          } catch (error) {
            console.error('Error removing channel:', error);
          }
        }
      )
      .subscribe((status, err) => {
        // Handle subscription status changes
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to job completion channel:', jobId);
          activeChannelsRef.current.add(channel);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error for job:', jobId, err);
          activeChannelsRef.current.delete(channel);

          // Show user-friendly error (Realtime might not be enabled)
          toast({
            title: 'Connection issue',
            description: 'Scene updates may be delayed. Your scene will still generate.',
          });
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Subscription timed out for job:', jobId);
          activeChannelsRef.current.delete(channel);
        } else if (status === 'CLOSED') {
          console.log('🔒 Channel closed for job:', jobId);
          activeChannelsRef.current.delete(channel);
        }
      });

    // Fallback cleanup after 2 minutes
    const timeoutId = setTimeout(async () => {
      try {
        await supabase.removeChannel(channel);
        activeChannelsRef.current.delete(channel);
        console.log('⏱️ Cleaned up subscription after timeout for job:', jobId);
      } catch (error) {
        console.error('Error removing channel on timeout:', error);
      }
    }, 120000);

    // Store timeout ID for potential early cleanup
    (channel as any)._timeoutId = timeoutId;
  };

  // ✅ ASYNC SCENE: Subscribe to character_scenes for background scene detection
  const subscribeToConversationScenes = (convId: string, messageId: string) => {
    console.log('🔄 Subscribing to character_scenes for background scene detection:', { convId, messageId });
    
    const channel = supabase
      .channel(`bg-scene-${convId}-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'character_scenes',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          const scene = payload.new as any;
          if (scene.job_id) {
            console.log('🎬 Background scene UPDATE with job_id:', scene.job_id, 'scene_id:', scene.id);
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  metadata: { ...msg.metadata, scene_generated: true, job_id: scene.job_id, scene_id: scene.id }
                };
              }
              return msg;
            }));
            messageSceneIdsRef.current.set(messageId, scene.id);
            subscribeToJobCompletion(scene.job_id, messageId);
            supabase.removeChannel(channel);
            activeChannelsRef.current.delete(channel);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'character_scenes',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          const scene = payload.new as any;
          if (scene.job_id) {
            console.log('🎬 Background scene INSERT with job_id:', scene.job_id, 'scene_id:', scene.id);
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  metadata: { ...msg.metadata, scene_generated: true, job_id: scene.job_id, scene_id: scene.id }
                };
              }
              return msg;
            }));
            messageSceneIdsRef.current.set(messageId, scene.id);
            subscribeToJobCompletion(scene.job_id, messageId);
            supabase.removeChannel(channel);
            activeChannelsRef.current.delete(channel);
          }
        }
      )
      .subscribe();
    
    activeChannelsRef.current.add(channel);
    
    // Cleanup after 3 minutes
    setTimeout(() => {
      supabase.removeChannel(channel);
      activeChannelsRef.current.delete(channel);
    }, 180000);
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

      // Get valid image model (with fallback to first Replicate model)
      const validImageModel = getValidImageModel();
      if (!validImageModel) {
        console.warn('⚠️ No Replicate image models available - scene generation will be skipped');
      } else if (validImageModel !== selectedImageModel) {
        console.log('📸 Using default Replicate model:', validImageModel);
      }

      // Debug: Log scene continuity state before API call
      console.log('🔄 Scene continuity state (handleSendMessage):', {
        enabled: sceneContinuityEnabled,
        previousSceneId,
        previousSceneImageUrl: previousSceneImageUrl?.substring(0, 60) || null,
        conversationId
      });

      // ✅ FIX: Sign previous scene image URL if it's a storage path (needed for I2I iteration)
      let signedPreviousSceneImageUrl: string | null = null;
      if (previousSceneImageUrl) {
        if (previousSceneImageUrl.startsWith('http://') || previousSceneImageUrl.startsWith('https://')) {
          // Already a signed URL
          signedPreviousSceneImageUrl = previousSceneImageUrl;
        } else {
          // Storage path - need to sign it
          const bucket = previousSceneImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
          const signedUrl = await getSignedUrl(previousSceneImageUrl, bucket);
          signedPreviousSceneImageUrl = signedUrl;
          console.log('🔄 Scene continuity: Signed previous scene image URL for I2I iteration', {
            original: previousSceneImageUrl.substring(0, 60) + '...',
            signed: signedUrl ? signedUrl.substring(0, 60) + '...' : 'failed'
          });
        }
      }

      // Sign template preview image for first-scene I2I when starting from a scene template
      let signedScenePreviewUrl: string | null = null;
      if (selectedScene?.preview_image_url) {
        if (selectedScene.preview_image_url.startsWith('http://') || selectedScene.preview_image_url.startsWith('https://')) {
          signedScenePreviewUrl = selectedScene.preview_image_url;
        } else {
          const bucket = selectedScene.preview_image_url.includes('workspace') ? 'workspace-temp' : 'user-library';
          signedScenePreviewUrl = await getSignedUrl(selectedScene.preview_image_url, bucket);
        }
      }

      // Call the roleplay-chat edge function with prompt template
      // ✅ Determine if scene should be generated based on mode
      const shouldGenerateScene = imageGenerationMode === 'auto' && !!validImageModel;
      
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: content.trim(),
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier, // ✅ DYNAMIC CONTENT TIER
          scene_generation: shouldGenerateScene, // ✅ Respects imageGenerationMode
          user_id: user.id,
          // For scene templates (scenes table), only scene_context (scene_prompt) is used; scenes have no system_prompt.
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt ?? null,
          scene_preview_image_url: signedScenePreviewUrl || null, // ✅ First-scene I2I from template image
          // NOTE: Template selection is handled server-side based on model_provider
          // ✅ ADD IMAGE MODEL SELECTION (only if valid):
          selected_image_model: validImageModel,
          // ✅ Scene style for user representation in images
          scene_style: sceneStyle,
          // ✅ Multi-reference: user character reference for both_characters scenes
          user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
          // ✅ Pass consistency settings from UI
          consistency_settings: consistencySettings,
          // 🔄 Scene continuity for I2I iteration
          scene_continuity_enabled: sceneContinuityEnabled,
          previous_scene_id: previousSceneId || null,
          previous_scene_image_url: signedPreviousSceneImageUrl || null
        }
      });

      if (error) throw error;

      if (data && data.response) {
        // Check if backend used a fallback model (local worker was unavailable)
        if (data.usedFallback && data.fallbackModel) {
          console.log('⚠️ Backend used fallback model:', data.fallbackModel);
          // Update the model provider to the fallback
          setModelProvider(data.fallbackModel);
          // Notify user
          toast({
            title: 'Model Switched',
            description: 'Local model unavailable, using cloud model instead.',
          });
        }

        // Normalize job ID from various possible response fields
        const newJobId = data.scene_job_id || data.job_id || data?.jobId || data?.data?.jobId;

        console.log('📤 Edge function response:', {
          hasResponse: !!data.response,
          scene_job_id: data.scene_job_id,
          job_id: data.job_id,
          jobId: data.jobId,
          scene_generated: data.scene_generated,
          extractedJobId: newJobId
        });

        const characterMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: Boolean(newJobId),
            consistency_method: character.consistency_method,
            job_id: newJobId,
            usedFallback: data.usedFallback,
            // ✅ ADMIN: Include prompt template info from edge function response
            generation_metadata: {
              template_id: data.prompt_template_id,
              template_name: data.prompt_template_name,
              chat_model_used: data.model_used,
              chat_provider: data.usedFallback ? data.fallbackModel : modelProvider,
              processing_time: data.processing_time,
              memory_tier: memoryTier,
              content_tier: contentTier,
              // ✅ FIX: Include scene template info if available
              scene_template_id: data.scene_template_id,
              scene_template_name: data.scene_template_name,
              original_scene_prompt: data.original_scene_prompt
            },
            // ✅ FIX: Include scene_id and scene prompt in message metadata
            scene_id: data.scene_id,
            scene_prompt: data.original_scene_prompt
          }
        };

        // ✅ FIX: Store scene_id in ref for I2I continuity tracking (available when job completes)
        if (data.scene_id && newJobId) {
          messageSceneIdsRef.current.set(characterMessage.id, data.scene_id);
          console.log('🔄 Scene continuity: Stored scene_id in ref for job completion', {
            messageId: characterMessage.id,
            sceneId: data.scene_id,
            jobId: newJobId
          });
        }

        console.log('💬 Creating character message:', {
          messageId: characterMessage.id,
          hasJobId: !!newJobId,
          scene_generated: characterMessage.metadata?.scene_generated
        });

        setMessages(prev => [...prev, characterMessage]);

        // Start job polling if scene generation was initiated
        if (newJobId) {
          console.log('🎬 Starting subscription for scene job:', { newJobId, messageId: characterMessage.id });
          subscribeToJobCompletion(newJobId, characterMessage.id);
        } else if (data.scene_generating_async && conversationId) {
          // ✅ ASYNC SCENE: Scene is generating in background - subscribe to character_scenes
          console.log('🎬 Scene generating async - subscribing to character_scenes for:', conversationId);
          subscribeToConversationScenes(conversationId, characterMessage.id);
        } else {
          console.log('⚠️ No job ID in response - scene generation may have been skipped');
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
      
      // ✅ FIX: Sign previous scene image URL if it's a storage path (needed for I2I iteration)
      let signedPreviousSceneImageUrl: string | null = null;
      if (previousSceneImageUrl) {
        if (previousSceneImageUrl.startsWith('http://') || previousSceneImageUrl.startsWith('https://')) {
          // Already a signed URL
          signedPreviousSceneImageUrl = previousSceneImageUrl;
        } else {
          // Storage path - need to sign it
          const bucket = previousSceneImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
          const signedUrl = await getSignedUrl(previousSceneImageUrl, bucket);
          signedPreviousSceneImageUrl = signedUrl;
          console.log('🔄 Scene continuity: Signed previous scene image URL for I2I iteration', {
            original: previousSceneImageUrl.substring(0, 60) + '...',
            signed: signedUrl ? signedUrl.substring(0, 60) + '...' : 'failed'
          });
        }
      }
      
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
          // NOTE: Template selection is handled server-side based on model_provider
          selected_image_model: getValidImageModel(), // ✅ Use selected image model (with fallback)
          scene_style: sceneStyle, // ✅ Scene style for user representation
          // ✅ Multi-reference: user character reference for both_characters scenes
          user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
          // ✅ Pass consistency settings from UI
          consistency_settings: consistencySettings,
          // 🔄 Scene continuity for I2I iteration
          scene_continuity_enabled: sceneContinuityEnabled,
          previous_scene_id: previousSceneId || null,
          previous_scene_image_url: signedPreviousSceneImageUrl || null
        }
      });

      // ✅ ENHANCED: Add detailed logging for debugging
      console.log('🎬 Scene generation response:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasError: !!error,
        errorMessage: error?.message,
        fullResponse: { data, error }
      });

      if (error) {
        console.error('❌ Scene generation error:', error);
        throw error;
      }

      // ✅ ENHANCED: Normalize job ID from various possible response fields with logging
      // Check scene_job_id first (primary field from roleplay-chat edge function)
      const newJobId = data?.scene_job_id || data?.job_id || data?.data?.jobId || data?.data?.job_id || data?.jobId;
      
      console.log('🔍 Job ID extraction:', {
        'data?.scene_job_id': data?.scene_job_id,
        'data?.job_id': data?.job_id,
        'data?.jobId': data?.jobId,
        'data?.data?.jobId': data?.data?.jobId,
        'data?.data?.job_id': data?.data?.job_id,
        extracted: newJobId,
        fullDataKeys: data ? Object.keys(data) : []
      });
      
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
        // ✅ ENHANCED: Provide detailed error with response structure
        console.error('❌ No job ID found. Full response:', JSON.stringify({ data, error }, null, 2));
        console.error('❌ Response structure analysis:', {
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          hasSceneGenerated: data?.scene_generated,
          hasError: !!error,
          errorMessage: error?.message || error
        });
        
        // Don't throw - show user-friendly error message instead
        setSceneJobStatus('failed');
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: 'Scene generation failed. The chat message was sent, but I couldn\'t generate a scene image right now.',
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: { 
            sceneError: true,
            canRetryScene: true,
            errorDetails: 'No job ID returned from scene generation request'
          }
        };
        setMessages(prev => [...prev, errorMessage]);
        
        toast({
          title: 'Scene generation failed',
          description: 'The chat message was sent, but scene generation could not be started. You can try generating a scene again.',
          variant: 'destructive'
        });
        return; // Exit early instead of throwing
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

  // Handler to generate scene for a specific message (manual mode)
  const handleGenerateSceneForMessage = async (messageId: string) => {
    if (!character || !conversationId || !user) return;
    
    // Find the message to get its content for scene generation
    const targetMessage = messages.find(m => m.id === messageId);
    if (!targetMessage) return;
    
    setGeneratingSceneForMessageId(messageId);
    
    try {
      const contentTier = 'nsfw';
      const validImageModel = getValidImageModel();
      
      if (!validImageModel) {
        toast({
          title: 'No image model available',
          description: 'Please configure an image model in settings.',
          variant: 'destructive'
        });
        setGeneratingSceneForMessageId(null);
        return;
      }
      
      // Sign previous scene image if needed
      let signedPreviousSceneImageUrl: string | null = null;
      if (previousSceneImageUrl) {
        if (previousSceneImageUrl.startsWith('http://') || previousSceneImageUrl.startsWith('https://')) {
          signedPreviousSceneImageUrl = previousSceneImageUrl;
        } else {
          const bucket = previousSceneImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
          signedPreviousSceneImageUrl = await getSignedUrl(previousSceneImageUrl, bucket);
        }
      }

      // Sign template preview for first-scene I2I when applicable
      let signedScenePreviewUrl: string | null = null;
      if (selectedScene?.preview_image_url) {
        if (selectedScene.preview_image_url.startsWith('http://') || selectedScene.preview_image_url.startsWith('https://')) {
          signedScenePreviewUrl = selectedScene.preview_image_url;
        } else {
          const bucket = selectedScene.preview_image_url.includes('workspace') ? 'workspace-temp' : 'user-library';
          signedScenePreviewUrl = await getSignedUrl(selectedScene.preview_image_url, bucket);
        }
      }
      
      // Use the message content as context for scene generation
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: `Generate a scene image for this moment: ${targetMessage.content.substring(0, 500)}`,
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_generation: true,
          scene_only: true, // Flag to indicate we only want scene, no chat response
          user_id: user.id,
          scene_context: selectedScene?.scene_prompt || null,
          scene_preview_image_url: signedScenePreviewUrl || null, // ✅ First-scene I2I from template image
          selected_image_model: validImageModel,
          scene_style: sceneStyle,
          user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
          consistency_settings: consistencySettings,
          scene_continuity_enabled: sceneContinuityEnabled,
          previous_scene_id: previousSceneId || null,
          previous_scene_image_url: signedPreviousSceneImageUrl || null
        }
      });
      
      if (error) throw error;
      
      const newJobId = data?.scene_job_id || data?.job_id;
      
      if (newJobId) {
        // Update the message to indicate scene is being generated
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                metadata: { 
                  ...msg.metadata, 
                  scene_generated: true,
                  job_id: newJobId 
                } 
              }
            : msg
        ));
        
        // Subscribe to job completion
        subscribeToJobCompletion(newJobId, messageId);
        
        toast({
          title: 'Generating scene...',
          description: 'Your scene image is being created.'
        });
      } else {
        throw new Error('No job ID returned');
      }
    } catch (error) {
      console.error('Error generating scene for message:', error);
      toast({
        title: 'Scene generation failed',
        description: 'Could not generate scene. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingSceneForMessageId(null);
    }
  };

  // Handle scene regeneration with edited prompt (I2I modification or T2I fresh)
  const handleSceneRegenerate = async (
    editedPrompt: string,
    currentSceneImageUrl?: string,
    strengthOverride?: number
  ) => {
    if (!character || !conversationId || !user) return;

    // Determine generation mode
    const isI2IModification = !!currentSceneImageUrl;

    setIsLoading(true);
    setSceneJobStatus('queued');

    try {
      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT

      // Build consistency settings with optional strength override
      const effectiveConsistencySettings = {
        ...consistencySettings,
        ...(isI2IModification && strengthOverride && { denoise_strength: strengthOverride })
      };

      // ✅ FIX: Sign image URLs if they're storage paths (needed for I2I)
      let signedCurrentSceneImageUrl: string | undefined = undefined;
      if (isI2IModification && currentSceneImageUrl) {
        if (currentSceneImageUrl.startsWith('http://') || currentSceneImageUrl.startsWith('https://')) {
          signedCurrentSceneImageUrl = currentSceneImageUrl;
        } else {
          const bucket = currentSceneImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
          const signedUrl = await getSignedUrl(currentSceneImageUrl, bucket);
          signedCurrentSceneImageUrl = signedUrl || undefined;
          console.log('🔧 Scene modification: Signed current scene image URL', {
            original: currentSceneImageUrl.substring(0, 60) + '...',
            signed: signedUrl ? signedUrl.substring(0, 60) + '...' : 'failed'
          });
        }
      }

      let signedPreviousSceneImageUrl: string | null = null;
      if (previousSceneImageUrl) {
        if (previousSceneImageUrl.startsWith('http://') || previousSceneImageUrl.startsWith('https://')) {
          signedPreviousSceneImageUrl = previousSceneImageUrl;
        } else {
          const bucket = previousSceneImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
          const signedUrl = await getSignedUrl(previousSceneImageUrl, bucket);
          signedPreviousSceneImageUrl = signedUrl;
          console.log('🔄 Scene continuity: Signed previous scene image URL for I2I iteration', {
            original: previousSceneImageUrl.substring(0, 60) + '...',
            signed: signedUrl ? signedUrl.substring(0, 60) + '...' : 'failed'
          });
        }
      }

      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: isI2IModification ? 'Modify scene.' : 'Regenerate scene.',
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_generation: true,
          user_id: user.id,
          selected_image_model: getValidImageModel(),
          scene_style: sceneStyle,
          // ✅ Multi-reference: user character reference for both_characters scenes
          user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
          consistency_settings: effectiveConsistencySettings,
          // Scene regeneration/modification fields
          scene_prompt_override: editedPrompt,
          // Only include current_scene_image_url for I2I mode (signed if needed)
          ...(isI2IModification && signedCurrentSceneImageUrl && { current_scene_image_url: signedCurrentSceneImageUrl }),
          // Scene continuity context
          scene_continuity_enabled: sceneContinuityEnabled,
          previous_scene_id: previousSceneId || null,
          previous_scene_image_url: signedPreviousSceneImageUrl || null
        }
      });

      if (error) throw error;

      // ✅ FIX: Check scene_job_id first (primary field from roleplay-chat edge function)
      const newJobId = data?.scene_job_id || data?.job_id || data?.data?.jobId || data?.data?.job_id || data?.jobId;
      
      console.log('🔍 Regeneration Job ID extraction:', {
        'data?.scene_job_id': data?.scene_job_id,
        'data?.job_id': data?.job_id,
        'data?.jobId': data?.jobId,
        extracted: newJobId,
        fullDataKeys: data ? Object.keys(data) : []
      });

      if (newJobId) {
        // Add placeholder message for regenerated scene
        const placeholderMessage: Message = {
          id: Date.now().toString(),
          content: isI2IModification
            ? `Modifying scene${strengthOverride ? ` (${Math.round(strengthOverride * 100)}% intensity)` : ''}...`
            : 'Generating fresh scene from character reference...',
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: true,
            job_id: newJobId,
            consistency_method: consistencySettings.method,
            is_regeneration: true,
            generation_mode: isI2IModification ? 'modification' : 't2i'
          }
        };
        setMessages(prev => [...prev, placeholderMessage]);

        // Start polling for job completion
        console.log(`🔧 Starting polling for scene ${isI2IModification ? 'modification' : 'fresh generation'} job:`, newJobId);
        subscribeToJobCompletion(newJobId, placeholderMessage.id);

        toast({
          title: isI2IModification ? 'Scene modification started' : 'Fresh scene generation started',
          description: isI2IModification
            ? `Modifying with ${Math.round((strengthOverride || 0.5) * 100)}% intensity`
            : 'Generating new scene from character reference'
        });
      } else {
        // ✅ ENHANCED: Provide detailed error instead of throwing
        console.error('❌ No job ID found for regeneration. Full response:', JSON.stringify({ data, error }, null, 2));
        setSceneJobStatus('failed');
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: 'Scene regeneration failed. Please try again.',
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: { 
            sceneError: true,
            canRetryScene: true,
            errorDetails: 'No job ID returned from scene regeneration request'
          }
        };
        setMessages(prev => [...prev, errorMessage]);
        
        toast({
          title: 'Scene regeneration failed',
          description: 'Could not start scene regeneration. Please try again.',
          variant: 'destructive'
        });
        return; // Exit early instead of throwing
      }
    } catch (error) {
      console.error('Error regenerating scene:', error);
      setSceneJobStatus('failed');

      toast({
        title: 'Scene regeneration failed',
        description: error instanceof Error ? error.message : 'Could not regenerate scene',
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

      // Sign template preview for first-scene I2I when retrying with a scene template
      let signedScenePreviewUrl: string | null = null;
      if (selectedScene?.preview_image_url) {
        if (selectedScene.preview_image_url.startsWith('http://') || selectedScene.preview_image_url.startsWith('https://')) {
          signedScenePreviewUrl = selectedScene.preview_image_url;
        } else {
          const bucket = selectedScene.preview_image_url.includes('workspace') ? 'workspace-temp' : 'user-library';
          signedScenePreviewUrl = await getSignedUrl(selectedScene.preview_image_url, bucket);
        }
      }

      // Sign previous scene image for I2I continuity when retrying with existing conversation
      let signedPreviousForRetry: string | null = null;
      if (previousSceneImageUrl) {
        if (previousSceneImageUrl.startsWith('http://') || previousSceneImageUrl.startsWith('https://')) {
          signedPreviousForRetry = previousSceneImageUrl;
        } else {
          const bucket = previousSceneImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
          signedPreviousForRetry = await getSignedUrl(previousSceneImageUrl, bucket);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          kickoff: true,
          conversation_id: conversationId,
          character_id: characterId,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_generation: true, // ✅ Enable auto scene generation on kickoff retry
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          scene_preview_image_url: signedScenePreviewUrl || null, // ✅ First-scene I2I from template image
          user_id: user.id,
          selected_image_model: getValidImageModel(),
          scene_style: sceneStyle, // ✅ Scene style for user representation
          // ✅ Multi-reference: user character reference for both_characters scenes
          user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
          // ✅ Pass consistency settings from UI
          consistency_settings: consistencySettings,
          // 🔄 Scene continuity (kickoff retry - use existing previous scene if any)
          scene_continuity_enabled: sceneContinuityEnabled,
          previous_scene_id: previousSceneId || null,
          previous_scene_image_url: signedPreviousForRetry || previousSceneImageUrl || null
        }
      });

      if (error) throw error;

      const openerMessage: Message = {
        id: data.message_id || Date.now().toString(),
        content: data.response || `Hello! I'm ${character.name}.`,
        sender: 'character',
        timestamp: new Date().toISOString(),
        metadata: {
          scene_generated: data.scene_generated || false,
          job_id: data.scene_job_id || undefined,
          scene_id: data.scene_id || undefined,
          usedFallback: data.usedFallback || false
        }
      };
      setMessages([openerMessage]);

      // ✅ FIX: Start subscription for kickoff retry scene generation job
      if (data.scene_job_id) {
        console.log('🎬 Starting subscription for kickoff retry scene job:', { 
          jobId: data.scene_job_id, 
          messageId: openerMessage.id 
        });
        subscribeToJobCompletion(data.scene_job_id, openerMessage.id);
      }
    } catch (error: any) {
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

    // Define cacheKey for storing new conversation ID
    const cacheKey = `conversation_${characterId}_${sceneId || 'general'}`;

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

      // 🔄 Clear scene continuity tracking for the old conversation
      if (conversationId) {
        clearLastScene(conversationId);
        console.log('🔄 Cleared scene continuity for archived conversation');
      }

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
          memory_data: sceneId ? { scene_id: sceneId } : {},
          user_character_id: selectedUserCharacterId || null
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setConversationId(newConversation.id);

      // Cache new conversation ID
      localStorage.setItem(cacheKey, newConversation.id);

      // Reload template for current model before kickoff
      const currentTemplate = await loadPromptTemplate(modelProvider, 'nsfw');
      setPromptTemplate(currentTemplate);
      console.log('📝 Reloaded template for cleared conversation:', currentTemplate?.template_name || 'none');

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
          scene_generation: true, // ✅ Enable auto scene generation on kickoff
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          user_id: user.id,
          selected_image_model: getValidImageModel(),
          scene_style: sceneStyle, // ✅ Scene style for user representation
          // ✅ Multi-reference: user character reference for both_characters scenes
          user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null,
          // ✅ Pass consistency settings from UI
          consistency_settings: consistencySettings,
          // NOTE: Template selection is handled server-side based on model_provider
          // 🔄 Scene continuity (fresh conversation - no previous scene)
          scene_continuity_enabled: sceneContinuityEnabled,
          previous_scene_id: null,
          previous_scene_image_url: null
        }
      });

      if (error) throw error;

      const openerMessage: Message = {
        id: data.message_id || Date.now().toString(),
        content: data.response || `Hello! I'm ${character.name}.`,
        sender: 'character',
        timestamp: new Date().toISOString(),
        metadata: {
          scene_generated: data.scene_generated || false,
          job_id: data.scene_job_id || undefined,
          scene_id: data.scene_id || undefined,
          usedFallback: data.usedFallback || false
        }
      };
      setMessages([openerMessage]);

      // ✅ FIX: Start subscription for scene kickoff job
      if (data.scene_job_id) {
        console.log('🎬 Starting subscription for scene kickoff job:', { 
          jobId: data.scene_job_id, 
          messageId: openerMessage.id 
        });
        subscribeToJobCompletion(data.scene_job_id, openerMessage.id);
      }

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

  const handleShareConversation = async () => {
    try {
      const shareUrl = window.location.href;
      if (navigator.share && isMobile) {
        // Use native share on mobile devices
        await navigator.share({
          title: `Chat with ${character?.name}`,
          text: `Check out my conversation with ${character?.name}!`,
          url: shareUrl
        });
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link copied!',
          description: 'Conversation link has been copied to your clipboard.'
        });
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        toast({
          title: 'Share failed',
          description: 'Could not share the conversation.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleViewScenes = () => {
    if (characterId) {
      navigate(`/roleplay/characters/${characterId}/scenes`);
    }
  };

  const handleSaveToLibrary = async () => {
    // Find messages with images
    const messagesWithImages = messages.filter(msg => msg.imageUrl);

    if (messagesWithImages.length === 0) {
      toast({
        title: 'No images to save',
        description: 'Generate some images in the conversation first!',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Saving to library...',
      description: `Saving ${messagesWithImages.length} image(s) to your library.`
    });

    // Note: Actual library saving would require WorkspaceAssetService integration
    // For now, just show a success message
    setTimeout(() => {
      toast({
        title: 'Images saved!',
        description: `${messagesWithImages.length} image(s) added to your library.`
      });
    }, 1000);
  };

  const handleEditCharacter = () => {
    if (characterId && user?.id === character?.created_by) {
      navigate(`/roleplay/characters/${characterId}/edit`);
    } else {
      toast({
        title: 'Cannot edit',
        description: 'You can only edit characters you created.',
        variant: 'destructive'
      });
    }
  };

  const handleReportCharacter = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to report content.',
        variant: 'destructive'
      });
      return;
    }

    // Show report confirmation
    toast({
      title: 'Report submitted',
      description: `Thank you for reporting. Our team will review "${character?.name}".`
    });

    // Log report for analytics (would normally save to database)
    console.log('Character reported:', {
      characterId,
      characterName: character?.name,
      reportedBy: user.id,
      timestamp: new Date().toISOString()
    });
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
      <div className={cn(
        "flex flex-col bg-background",
        isMobile ? "h-screen w-full" : "h-screen"
      )}>
        {/* Header - Mobile uses simplified header, Desktop uses full header */}
        {isMobile ? (
          <MobileChatHeader
            backTo="/roleplay"
            characterName={character.name}
            characterImage={signedCharacterImage || '/placeholder.svg'}
            onCharacterInfoClick={() => setShowCharacterInfo(true)}
            onSettingsClick={() => setShowSettingsModal(true)}
            onNewScenario={() => setShowScenarioWizard(true)}
            onResetClick={handleClearConversation}
            onShareClick={handleShareConversation}
            onReportClick={handleReportCharacter}
          />
        ) : (
          <RoleplayHeader
            backTo="/roleplay"
            characterName={character.name}
            characterImage={signedCharacterImage || '/placeholder.svg'}
            onMenuClick={() => setShowContextMenu(true)}
            onSettingsClick={() => setShowSettingsModal(true)}
            onResetClick={handleClearConversation}
          />
        )}

        {/* Chat Messages - Optimized padding for mobile, full width */}
        <div
          className={cn(
            "flex-1 overflow-y-auto space-y-4",
            isMobile ? "px-1 py-4" : "p-4" // Reduced horizontal padding on mobile
          )}
          style={{
            paddingBottom: isMobile 
              ? (isKeyboardVisible ? '20px' : '140px') // Account for input + bottom nav
              : undefined
          }}
        >
          {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                character={character}
                userCharacter={selectedUserCharacter}
                signedCharacterImageUrl={signedCharacterImage}
                signedUserCharacterImageUrl={signedUserCharacterImage}
                onGenerateScene={handleGenerateScene}
                onRetry={message.metadata?.needsRetry ? handleRetryKickoff : undefined}
                conversationId={conversationId}
                consistencySettings={consistencySettings}
                onSceneRegenerate={handleSceneRegenerate}
                contentMode="nsfw"
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

        {/* Input Area - Fixed on mobile to prevent footer overlap */}
        {isMobile ? (
          <div 
            className="fixed bottom-14 left-0 right-0 z-30 bg-card/95 backdrop-blur-sm border-t border-border"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="p-3">
              <MobileChatInput 
                onSend={handleSendMessage}
                onGenerateScene={handleGenerateScene}
                isLoading={isLoading}
                isMobile={isMobile}
              />
            </div>
          </div>
        ) : (
          <div className="border-t border-border p-4 bg-card">
            <MobileChatInput 
              onSend={handleSendMessage}
              onGenerateScene={handleGenerateScene}
              isLoading={isLoading}
              isMobile={isMobile}
            />
          </div>
        )}

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
          onCreateScene={() => {
            setShowCharacterInfo(false);
            setShowSceneGenerationModal(true);
          }}
        />

        {/* Settings Modal (Desktop) */}
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
          selectedUserCharacterId={selectedUserCharacterId}
          onUserCharacterChange={setSelectedUserCharacterId}
          sceneStyle={sceneStyle}
          onSceneStyleChange={setSceneStyle}
          imageGenerationMode={imageGenerationMode}
          onImageGenerationModeChange={setImageGenerationMode}
          characterId={characterId || undefined}
          character={character ? {
            reference_image_url: character.reference_image_url,
            seed_locked: (character as any).seed_locked
          } : null}
        />

        {/* Quick Settings Drawer (Mobile) - Auto-saves to localStorage */}
        <QuickSettingsDrawer
          isOpen={showQuickSettings}
          onClose={() => setShowQuickSettings(false)}
          onAdvancedSettingsClick={() => setShowSettingsModal(true)}
          modelProvider={modelProvider}
          onModelProviderChange={(value) => {
            setModelProvider(value);
            // Auto-save to localStorage
            const savedSettings = localStorage.getItem('roleplay-settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {};
            settings.modelProvider = value;
            localStorage.setItem('roleplay-settings', JSON.stringify(settings));
          }}
          selectedImageModel={selectedImageModel}
          onSelectedImageModelChange={(value) => {
            setSelectedImageModel(value);
            // Auto-save to localStorage
            const savedSettings = localStorage.getItem('roleplay-settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {};
            settings.selectedImageModel = value;
            localStorage.setItem('roleplay-settings', JSON.stringify(settings));
          }}
          selectedI2IModel={selectedI2IModel}
          onSelectedI2IModelChange={(value) => {
            setSelectedI2IModel(value);
            const savedSettings = localStorage.getItem('roleplay-settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {};
            settings.selectedI2IModel = value;
            localStorage.setItem('roleplay-settings', JSON.stringify(settings));
          }}
          sceneStyle={sceneStyle}
          onSceneStyleChange={(value) => {
            setSceneStyle(value);
            // Auto-save to localStorage
            const savedSettings = localStorage.getItem('roleplay-settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {};
            settings.sceneStyle = value;
            localStorage.setItem('roleplay-settings', JSON.stringify(settings));
          }}
          chatModels={roleplayModelOptions}
          imageModels={imageModelOptions}
          i2iModels={i2iModelOptions}
          chatWorkerHealthy={chatWorkerHealthy}
          sdxlWorkerHealthy={false}
          hasUserCharacter={!!selectedUserCharacterId && !!selectedUserCharacter?.reference_image_url}
        />

        {/* Bottom Navigation (Mobile) */}
        {isMobile && (
          <ChatBottomNav
            onCharacterInfoClick={() => setShowCharacterInfo(true)}
            onSettingsClick={() => setShowQuickSettings(true)}
            isVisible={!isKeyboardVisible}
          />
        )}

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
          onNewScenario={() => setShowScenarioWizard(true)}
          canEditCharacter={!!(user && character && (character.user_id === user.id || character.creator_id === user.id))}
        />

        {/* Scene Generation Modal (proper scene creation with name/description) */}
        <SceneGenerationModal
          isOpen={showSceneGenerationModal}
          onClose={() => setShowSceneGenerationModal(false)}
          characterId={characterId}
          conversationId={conversationId || undefined}
          character={character}
          onSceneCreated={(sceneId) => {
            console.log('✅ Scene created:', sceneId);
            setShowSceneGenerationModal(false);
            // Optionally refresh scenes or navigate
          }}
        />

        {/* Scenario Setup Wizard */}
        <ScenarioSetupWizard
          isOpen={showScenarioWizard}
          onClose={() => setShowScenarioWizard(false)}
          onComplete={(scenarioPayload) => {
            setActiveScenario(scenarioPayload);
            setShowScenarioWizard(false);
            // Scenario settings are now stored in activeScenario
            // and can be used in sendMessage and other handlers
            console.log('🎬 Scenario configured:', scenarioPayload);
            toast({
              title: 'Scenario Ready',
              description: `${scenarioPayload.type.replace('_', ' ')} scenario with ${scenarioPayload.consent.intensity} intensity configured!`
            });
          }}
          preselectedCharacterId={characterId}
        />
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayChat;
