import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Image as ImageIcon, 
  Menu, 
  X, 
  Heart, 
  MoreHorizontal,
  ArrowLeft,
  Sparkles,
  User,
  LogOut,
  SidebarOpen,
  SidebarClose,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlayground, PlaygroundProvider } from '@/contexts/PlaygroundContext';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { GeneratedMediaProvider } from '@/contexts/GeneratedMediaContext';
import { SceneImageGenerator } from '@/components/playground/SceneImageGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { RoleplayLeftSidebar } from '@/components/roleplay/RoleplayLeftSidebar';
import { CharacterDetailPane } from '@/components/roleplay/CharacterDetailPane';
import { MessageBubble } from '@/components/playground/MessageBubble';
import { RoleplayPromptInput } from '@/components/roleplay/RoleplayPromptInput';
import { RoleplaySettingsModal, RoleplaySettings } from '@/components/roleplay/RoleplaySettingsModal';

const RoleplayChatInterface = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  // UI State
  const [showRightPane, setShowRightPane] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSceneGenerator, setShowSceneGenerator] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inputMode, setInputMode] = useState<'chat' | 'scene'>('chat');
  
  // Roleplay Settings
  const [roleplaySettings, setRoleplaySettings] = useState<RoleplaySettings>({
    contentMode: 'sfw',
    responseStyle: 'detailed',
    responseLength: 'medium',
    autoSceneGeneration: false,
    voiceModel: 'none',
    enhancementModel: 'qwen_instruct',
    sceneQuality: 'fast',
    messageFrequency: 5
  });
  
  // Get character data
  const characterId = searchParams.get('character');
  const userCharacterId = searchParams.get('userCharacter');
  const contentMode = searchParams.get('mode') as 'sfw' | 'nsfw' || 'sfw';
  
  const { character, isLoading: characterLoading } = useCharacterData(characterId || undefined);
  const { scenes, isLoading: scenesLoading } = useCharacterScenes(characterId || undefined);

  // Playground context for conversations and messages
  const {
    state,
    conversations,
    messages,
    isLoadingMessages,
    createConversation,
    setActiveConversation,
    sendMessage,
  } = usePlayground();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-load character and initialize conversation when character is selected
  useEffect(() => {
    if (characterId && !character && !characterLoading) {
      // Character will be loaded by useCharacterData hook
    }
  }, [characterId, character, characterLoading]);

  // Initialize conversation when character is loaded
  useEffect(() => {
    if (character && !state.activeConversationId && conversations.length === 0) {
      handleNewConversation();
    }
  }, [character, state.activeConversationId, conversations]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNewConversation = async () => {
    if (!character) return;
    
    try {
      await createConversation(
        `Chat with ${character.name}`,
        undefined, // no project
        'character_roleplay',
        character.id
      );
      
      toast({
        title: "New conversation started",
        description: `Ready to chat with ${character.name}`,
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const handleCharacterChange = (newCharacterId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('character', newCharacterId);
    setSearchParams(params);
  };

  const handleUserCharacterChange = (newUserCharacterId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (newUserCharacterId) {
      params.set('userCharacter', newUserCharacterId);
    } else {
      params.delete('userCharacter');
    }
    setSearchParams(params);
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    setIsTyping(true);
    try {
      await sendMessage(inputMessage, { 
        characterId: characterId || undefined,
        conversationId: state.activeConversationId 
      });
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateScene = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    // Trigger scene generation with the current input
    setShowSceneGenerator(true);
    // Don't clear input in case user wants to modify the prompt
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Redirect to character selection if no character is selected
  if (!characterId && !characterLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">No Character Selected</h2>
          <p className="text-gray-400 mb-6">Please select a character to start chatting.</p>
          <Button onClick={() => navigate('/roleplay')}>
            Select Character
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar */}
      <RoleplayLeftSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="h-12 border-b border-gray-200 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            {character && (
              <>
                <img
                  src={character.reference_image_url || character.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${character.name}`}
                  alt={character.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <div>
                  <h1 className="font-medium text-gray-900 text-sm">{character.name}</h1>
                  <p className="text-xs text-gray-500">AI Character</p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRightPane(!showRightPane)}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              {showRightPane ? (
                <PanelRightClose className="w-3 h-3" />
              ) : (
                <PanelRightOpen className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Chat Messages - with bottom padding for input */}
        <ScrollArea className="flex-1 p-3 pb-16">
          <div className="max-w-2xl mx-auto space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="text-base font-medium mb-2 text-gray-900">
                    Start chatting with {character?.name || 'your character'}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Share your thoughts, ask questions, or begin a roleplay scenario.
                  </p>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Start Conversation
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    mode="roleplay"
                    roleplayTemplate={true}
                  />
                ))}
              </>
            )}
            
            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500 text-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs">{character?.name} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Right Character Detail Pane */}
      {characterId && showRightPane && (
        <CharacterDetailPane
          characterId={characterId}
          isOpen={showRightPane}
          onClose={() => setShowRightPane(false)}
        />
      )}

      {/* Fixed Input Footer */}
      <div className="absolute bottom-0 left-64 right-0">
        <RoleplayPromptInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={handleSendMessage}
          onGenerateScene={handleGenerateScene}
          onOpenSettings={() => setShowSettingsModal(true)}
          isDisabled={isTyping || state.isLoadingMessage}
          characterName={character?.name}
          mode={inputMode}
          onModeChange={setInputMode}
        />
      </div>

      {/* Modals */}
      {showSceneGenerator && (
        <SceneImageGenerator
          messageContent={inputMessage || `Generate a scene for ${character?.name || 'character'}`}
          mode="roleplay"
          onImageGenerated={(assetId, imageUrl, bucket) => {
            console.log('Scene generated:', { assetId, imageUrl, bucket });
            setShowSceneGenerator(false);
            // Clear input after successful scene generation
            setInputMessage('');
          }}
          onGenerationStart={() => console.log('Scene generation started')}
        />
      )}

      <RoleplaySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={roleplaySettings}
        onSettingsChange={setRoleplaySettings}
      />
    </div>
  );
};

// Wrapper component with providers
const RoleplayChat = () => {
  return (
    <GeneratedMediaProvider>
      <PlaygroundProvider>
        <div className="bg-white">
          <RoleplayChatInterface />
        </div>
      </PlaygroundProvider>
    </GeneratedMediaProvider>
  );
};

export default RoleplayChat;