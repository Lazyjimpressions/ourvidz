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
  MoreVertical,
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
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { Character, Message, CharacterScene } from '@/types/roleplay';
import { imageConsistencyService, ConsistencySettings } from '@/services/ImageConsistencyService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const [modelProvider, setModelProvider] = useState<'chat_worker' | 'openrouter' | 'claude' | 'gpt'>('chat_worker');
  const [consistencySettings, setConsistencySettings] = useState<ConsistencySettings>({
    method: 'hybrid',
    reference_strength: 0.35,
    denoise_strength: 0.25,
    modify_strength: 0.5
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sceneJobId, setSceneJobId] = useState<string | null>(null);
  const [sceneJobStatus, setSceneJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [kickoffError, setKickoffError] = useState<string | null>(null);

  // Idempotency ref to prevent multiple initializations
  const hasInitialized = useRef(false);
  const currentRouteRef = useRef<string>('');

  // Hooks
  const { user, profile } = useAuth();
  const { getSignedUrl } = useSignedImageUrls();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
      currentRouteRef.current = '';
    };
  }, []);

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
            quick_start: characterData.quick_start || false
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

        // Mark route as initialized
        hasInitialized.current = true;
        currentRouteRef.current = routeKey;
        setKickoffError(null);

        // Always create new conversation for fresh start
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
        setConversationId(newConversation.id);

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
            conversation_id: newConversation.id,
            character_id: characterId,
            model_provider: modelProvider,
            memory_tier: memoryTier,
            content_tier: contentTier,
            scene_context: loadedScene?.scene_prompt || null,
            scene_system_prompt: loadedScene?.system_prompt || null,
            user_id: user.id
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

      // ✅ FORCE NSFW MODE FOR CHAT:
      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      console.log('🎭 Content tier (forced):', contentTier);

      // Call the roleplay-chat edge function
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: content.trim(),
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier, // ✅ DYNAMIC CONTENT TIER
          scene_generation: false,
          user_id: user.id,
          // ✅ ADD SCENE CONTEXT:
            scene_context: selectedScene?.scene_prompt || null,
            scene_system_prompt: selectedScene?.system_prompt || null
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
      // Build scene prompt from conversation context
      const recentMessages = messages.slice(-3); // Last 3 messages for context
      const conversationContext = recentMessages
        .map(msg => `${msg.sender === 'user' ? 'You' : character.name}: ${msg.content}`)
        .join(' | ');
      
      // ✅ FORCE NSFW MODE FOR SCENE GENERATION:
      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      
      // Call queue-job directly for SDXL generation
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: `Generate a scene showing ${character.name} in the current conversation context: ${conversationContext}`,
          job_type: 'sdxl_image_high', // ✅ HIGH QUALITY INSTEAD OF FAST
          metadata: {
            destination: 'roleplay_scene',
            character_id: character.id,
            scene_type: 'chat_scene',
            consistency_method: consistencySettings.method,
            conversation_id: conversationId,
            reference_mode: 'modify',
            contentType: contentTier // ✅ USE DYNAMIC CONTENT TIER
          }
        }
      });

      if (error) throw error;

      if (data && (data.job_id || data.jobId)) {
        const jobId = data.job_id || data.jobId; // ✅ FIX CAMEL/SNAKE CASE MISMATCH
        console.log('🔧 Scene job queued with ID:', jobId);
        setSceneJobId(jobId);
        setSceneJobStatus('processing');
        
        // Add queued message to chat
        const queuedMessage: Message = {
          id: Date.now().toString(),
          content: 'Scene generation queued! I\'m creating a visual representation of our conversation...',
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: false,
            job_id: jobId, // ✅ USE NORMALIZED JOB ID
            consistency_method: consistencySettings.method
          }
        };
        setMessages(prev => [...prev, queuedMessage]);
        
        // Start polling for job completion
        pollJobCompletion(jobId);
      } else {
        throw new Error('No job ID returned from queue-job');
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

          // Sign the scene image URL
          let signedImageUrl = assetData.temp_storage_path;
          try {
            if (!signedImageUrl.startsWith('http')) {
              const bucket = signedImageUrl.includes('workspace-temp') ? 'workspace-temp' : 'user-library';
              const signed = await getSignedUrl(signedImageUrl, bucket);
              if (signed) signedImageUrl = signed;
            }
          } catch (error) {
            console.error('Error signing scene image URL:', error);
          }

          // Update the last message with the image
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.metadata?.job_id === jobId) {
              lastMessage.content = 'Scene generated successfully! Here\'s a visual representation of our conversation.';
              lastMessage.metadata = {
                ...lastMessage.metadata,
                scene_generated: true,
                image_url: signedImageUrl
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
          user_id: user.id
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
          user_id: user.id
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
      console.error('Error clearing conversation:', error);
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
