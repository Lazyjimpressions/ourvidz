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
import { Character, Message, CharacterScene } from '@/types/roleplay';
import { imageConsistencyService, ConsistencySettings } from '@/services/ImageConsistencyService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MobileRoleplayChat: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
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

  // Hooks
  const { user } = useAuth();

  // Initialize conversation and load data
  useEffect(() => {
    const initializeConversation = async () => {
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

        // Check for existing conversation
        const { data: existingConversations, error: queryError } = await supabase
          .from('conversations')
          .select('id, title, messages(*)')
          .eq('user_id', user.id)
          .eq('character_id', characterId)
          .eq('conversation_type', 'character_roleplay')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (queryError) throw queryError;

        let conversation;
        if (existingConversations && existingConversations.length > 0) {
          conversation = existingConversations[0];
          setConversationId(conversation.id);
          
          // Load existing messages
          if (conversation.messages && conversation.messages.length > 0) {
            const loadedMessages = conversation.messages.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender as 'user' | 'character',
              timestamp: msg.created_at
            }));
            setMessages(loadedMessages);
          } else {
            // Add initial greeting
            const initialMessage: Message = {
              id: '1',
              content: `Hello! I'm ${loadedCharacter.name}. How can I assist you today?`,
              sender: 'character',
              timestamp: new Date().toISOString()
            };
            setMessages([initialMessage]);
          }
        } else {
          // Create new conversation
          const { data: newConversation, error: insertError } = await supabase
            .from('conversations')
            .insert({
              user_id: user.id,
              character_id: characterId,
              conversation_type: 'character_roleplay',
              title: `Roleplay: ${loadedCharacter.name}`,
              status: 'active',
              memory_tier: memoryTier
            })
            .select()
            .single();

          if (insertError) throw insertError;
          
          setConversationId(newConversation.id);
          
          // Add initial greeting
          const initialMessage: Message = {
            id: '1',
            content: `Hello! I'm ${loadedCharacter.name}. How can I assist you today?`,
            sender: 'character',
            timestamp: new Date().toISOString()
          };
          setMessages([initialMessage]);
        }

      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initializeConversation();
  }, [user, characterId, memoryTier]);

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

      // Call the roleplay-chat edge function
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: content.trim(),
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: 'sfw',
          scene_generation: false,
          user_id: user.id
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
      
      // Call queue-job directly for SDXL generation
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: `Generate a scene showing ${character.name} in the current conversation context: ${conversationContext}`,
          job_type: 'sdxl_image_fast',
          metadata: {
            destination: 'roleplay_scene',
            character_id: character.id,
            scene_type: 'chat_scene',
            consistency_method: consistencySettings.method,
            conversation_id: conversationId,
            reference_mode: 'modify',
            contentType: 'sfw'
          }
        }
      });

      if (error) throw error;

      if (data && data.job_id) {
        setSceneJobId(data.job_id);
        setSceneJobStatus('processing');
        
        // Add queued message to chat
        const queuedMessage: Message = {
          id: Date.now().toString(),
          content: 'Scene generation queued! I\'m creating a visual representation of our conversation...',
          sender: 'character',
          timestamp: new Date().toISOString(),
          metadata: {
            scene_generated: false,
            job_id: data.job_id,
            consistency_method: consistencySettings.method
          }
        };
        setMessages(prev => [...prev, queuedMessage]);
        
        // Start polling for job completion
        pollJobCompletion(data.job_id);
      } else {
        throw new Error('No job ID returned from queue-job');
      }
    } catch (error) {
      console.error('Error generating scene:', error);
      setSceneJobStatus('failed');
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error while generating the scene. Please try again.',
        sender: 'character',
        timestamp: new Date().toISOString()
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

          // Update the last message with the image
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.metadata?.job_id === jobId) {
              lastMessage.content = 'Scene generated successfully! Here\'s a visual representation of our conversation.';
              lastMessage.metadata = {
                ...lastMessage.metadata,
                scene_generated: true,
                image_url: assetData.temp_storage_path
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

  // Context menu handlers
  const handleClearConversation = () => {
    setMessages([messages[0]]); // Keep the initial greeting
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
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-white hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                <img 
                  src={character.image_url} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{character.name}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {character.content_rating || 'sfw'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {character.consistency_method}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Worker Health Indicator */}
            <div className="flex items-center gap-1">
              <div 
                className={`w-2 h-2 rounded-full ${
                  // chatWorker.isHealthy ? 'bg-green-500' : 'bg-gray-500' // Removed useWorkerStatus
                  true ? 'bg-green-500' : 'bg-gray-500' // Placeholder for now
                }`} 
                title={true ? 'Chat Worker Online' : 'Chat Worker Offline'} // Placeholder for now
              />
              <span className="text-xs text-gray-400">
                {true ? 'Online' : 'Offline'} {/* Placeholder for now */}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCharacterSheet(!showCharacterSheet)}
              className="text-white hover:bg-gray-800"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContextMenu(!showContextMenu)}
              className="text-white hover:bg-gray-800"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              character={character}
              onGenerateScene={handleGenerateScene}
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
