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
import { RoleplaySettingsModal } from '@/components/roleplay/RoleplaySettingsModal';
import { useToast } from '@/hooks/use-toast';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { Character, Message, CharacterScene } from '@/types/roleplay';
import { imageConsistencyService, ConsistencySettings } from '@/services/ImageConsistencyService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';

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
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [signedCharacterImage, setSignedCharacterImage] = useState<string | null>(null);
  const [memoryTier, setMemoryTier] = useState<'conversation' | 'character' | 'profile'>('conversation');
  // Initialize settings with saved values or defaults
  const initializeSettings = () => {
    const savedSettings = localStorage.getItem('roleplay-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return {
          modelProvider: parsed.modelProvider || 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
          selectedImageModel: parsed.selectedImageModel || 'sdxl',
          consistencySettings: parsed.consistencySettings || {
            method: 'hybrid',
            reference_strength: 0.35,
            denoise_strength: 0.25,
            modify_strength: 0.5
          }
        };
      } catch (error) {
        console.warn('Failed to parse saved roleplay settings:', error);
      }
    }
    
    // Default values
    return {
      modelProvider: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
      selectedImageModel: 'sdxl',
      consistencySettings: {
        method: 'hybrid',
        reference_strength: 0.35,
        denoise_strength: 0.25,
        modify_strength: 0.5
      }
    };
  };
  
  const initialSettings = initializeSettings();
  const [modelProvider, setModelProvider] = useState<string>(initialSettings.modelProvider);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(initialSettings.selectedImageModel);
  const [consistencySettings, setConsistencySettings] = useState<ConsistencySettings>(initialSettings.consistencySettings);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sceneJobId, setSceneJobId] = useState<string | null>(null);
  const [sceneJobStatus, setSceneJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [kickoffError, setKickoffError] = useState<string | null>(null);
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

      if (!user || !characterId) return;

      try {
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

        // Load scene data if sceneId is provided
        let loadedScene = null;
        if (sceneId) {
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

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !character || !conversationId || !user) return;

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

      // Call the roleplay-chat edge function with prompt template
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: content.trim(),
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier, // ✅ DYNAMIC CONTENT TIER
          scene_generation: true, // ✅ Enable automatic scene generation
          user_id: user.id,
          // ✅ ADD SCENE CONTEXT:
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          // ✅ ADD PROMPT TEMPLATE INTEGRATION:
          prompt_template_id: promptTemplate?.id || null,
          prompt_template_name: promptTemplate?.template_name || null,
          // ✅ ADD IMAGE MODEL SELECTION:
          selected_image_model: selectedImageModel
        }
      });

      if (error) throw error;

      if (data && data.response) {
        const characterMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: data.scene_generated || false,
            consistency_method: character.consistency_method
          }
        };
        setMessages(prev => [...prev, characterMessage]);
      } else {
        throw new Error('No response from roleplay-chat function');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I seem to be having trouble connecting right now. Could you try again in a moment?',
        sender: 'character',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
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

      // ✅ ENHANCED: Handle edge function response
      if (data && data.success) {
        if (data.scene_generated) {
          setSceneJobStatus('completed');
          console.log('🎬 Scene generated successfully with consistency score:', data.consistency_score);
          
          // Add success message to chat
          const successMessage: Message = {
            id: Date.now().toString(),
            content: 'Scene generated successfully! I\'ve created a visual representation of our conversation.',
            sender: 'character',
            timestamp: new Date().toISOString(),
            metadata: {
              scene_generated: true,
              consistency_method: consistencySettings.method
            }
          };
          setMessages(prev => [...prev, successMessage]);
          
          toast({
            title: 'Scene generated successfully!',
            description: `Scene created for ${character.name} with consistency score: ${data.consistency_score || 'N/A'}`
          });
        } else {
          setSceneJobStatus('failed');
          toast({
            title: 'Scene generation failed',
            description: 'Could not generate scene from current conversation context',
            variant: 'destructive'
          });
        }
      } else {
        throw new Error('Scene generation failed - no response from edge function');
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
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for job completion
  const pollJobCompletion = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setSceneJobStatus('completed');
          
          // Get the generated image from workspace_assets
          const { data: assetData, error: assetError } = await supabase
            .from('workspace_assets')
            .select('temp_storage_path')
            .eq('job_id', jobId)
            .single();

          if (assetError) throw assetError;

          // Use WorkspaceAssetService for reliable URL signing
          let signedImageUrl = assetData.temp_storage_path;
          const rawImagePath = assetData.temp_storage_path;
          
          try {
            if (!signedImageUrl.startsWith('http')) {
              // Use WorkspaceAssetService for consistent signing
              const signed = await WorkspaceAssetService.generateSignedUrl({
                temp_storage_path: assetData.temp_storage_path
              });
              if (signed) {
                signedImageUrl = signed;
              }
            }
          } catch (error) {
            console.error('Error signing scene image URL:', error);
          }

          // Update the correct message by job_id (not just the last message)
          setMessages(prev => {
            const updatedMessages = [...prev];
            
            // Find the message with matching job_id
            const messageIndex = updatedMessages.findIndex(msg => 
              msg.metadata?.job_id === jobId
            );
            
            if (messageIndex !== -1) {
              const targetMessage = updatedMessages[messageIndex];
              targetMessage.content = 'Scene generated successfully! Here\'s a visual representation of our conversation.';
              targetMessage.metadata = {
                ...targetMessage.metadata,
                scene_generated: true,
                image_url: signedImageUrl,
                raw_image_path: rawImagePath // Store raw path as fallback
              };
            }
            
            return updatedMessages;
          });
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setSceneJobStatus('failed');
          
          // Update the last message with error
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.metadata?.job_id === jobId) {
              lastMessage.content = 'Scene generation failed. Please try again.';
            }
            return updatedMessages;
          });
        }
      } catch (error) {
        console.error('Error polling job completion:', error);
        clearInterval(pollInterval);
        setSceneJobStatus('failed');
      }
    }, 2000); // Poll every 2 seconds

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setSceneJobStatus('failed');
    }, 300000);
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
    if (!user || !characterId || !character) return;

    try {
      // Archive existing conversation if it exists
      if (conversationId) {
        await supabase
          .from('conversations')
          .update({ status: 'archived' })
          .eq('id', conversationId)
          .eq('user_id', user.id);
      }

      // Clear localStorage cache
      const cacheKey = `conversation_${characterId}_${sceneId || 'general'}`;
      localStorage.removeItem(cacheKey);

      // Reset initialization state to allow fresh start
      hasInitialized.current = false;
      currentRouteRef.current = '';

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

  if (!character) {
    return (
      <OurVidzDashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading character...</div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <RoleplayHeader
          backTo="/roleplay"
          characterName={character.name}
          characterImage={signedCharacterImage || '/placeholder.svg'}
          onMenuClick={() => setShowContextMenu(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
        />

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
          <MobileChatInput 
            onSend={handleSendMessage}
            onGenerateScene={handleGenerateScene}
            isLoading={isLoading}
            isMobile={isMobile}
          />
        </div>

        {/* Character Sheet - Bottom Sheet (Mobile) or Sidebar (Desktop) */}
        {showCharacterSheet && (
          <MobileCharacterSheet 
            character={character}
            onClose={() => setShowCharacterSheet(false)}
            memoryTier={memoryTier}
            onMemoryTierChange={setMemoryTier}
            modelProvider={modelProvider}
            onModelProviderChange={setModelProvider}
            consistencySettings={consistencySettings}
            onConsistencySettingsChange={(settings) => setConsistencySettings(settings)}
          />
        )}

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
