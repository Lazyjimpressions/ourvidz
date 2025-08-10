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
  SidebarClose
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlayground, PlaygroundProvider } from '@/contexts/PlaygroundContext';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { GeneratedMediaProvider } from '@/contexts/GeneratedMediaContext';
import { SceneImageGenerator } from '@/components/playground/SceneImageGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { RoleplaySidebar } from '@/components/roleplay/RoleplaySidebar';
import { MessageBubble } from '@/components/playground/MessageBubble';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { RoleplayPromptInput } from '@/components/roleplay/RoleplayPromptInput';
import { RoleplaySettingsModal, RoleplaySettings } from '@/components/roleplay/RoleplaySettingsModal';

const RoleplayChatInterface = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Fixed Header */}
      <RoleplayHeader 
        title={character?.name ? `Chat with ${character.name}` : 'Roleplay Chat'}
        showBackButton={true}
        backPath="/roleplay"
      />

      {/* Main Content Area with proper top padding for fixed header */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <RoleplaySidebar
          characterId={characterId || undefined}
          userCharacterId={userCharacterId || undefined}
          activeConversationId={state.activeConversationId || undefined}
          onCharacterChange={handleCharacterChange}
          onUserCharacterChange={handleUserCharacterChange}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onGenerateScene={() => setShowSceneGenerator(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 lg:translate-x-0`}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Chat Messages - with bottom padding for floating input */}
          <ScrollArea className="flex-1 p-4 pb-32">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Card className="bg-card border border-border p-8 max-w-md mx-auto">
                    <h3 className="text-lg font-medium mb-2">
                      Start chatting with {character?.name || 'your character'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Share your thoughts, ask questions, or begin a roleplay scenario.
                    </p>
                    <Button variant="outline">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Conversation
                    </Button>
                  </Card>
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
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">{character?.name} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Floating Prompt Input */}
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
        <div className="bg-black">
          <RoleplayChatInterface />
        </div>
      </PlaygroundProvider>
    </GeneratedMediaProvider>
  );
};

export default RoleplayChat;