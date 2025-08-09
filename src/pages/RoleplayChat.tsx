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
      inputRef.current?.focus();
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
    <div className="min-h-screen bg-black text-white flex">
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
        className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 lg:translate-x-0`}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden"
            >
              {showSidebar ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
            </Button>
            
            {character && (
              <>
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={character.reference_image_url || character.image_url} 
                    alt={character.name}
                  />
                  <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{character.name}</h3>
                  <p className="text-xs text-gray-400">
                    {isTyping ? 'Typing...' : 'Online'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSceneGenerator(true)}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/roleplay')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-medium mb-2">
                    Start chatting with {character?.name || 'your character'}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Share your thoughts, ask questions, or begin a roleplay scenario.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => inputRef.current?.focus()}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
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
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">{character?.name} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message ${character?.name || 'character'}...`}
              className="flex-1 min-h-[40px] max-h-[120px] bg-gray-800 border-gray-700 resize-none"
              disabled={isTyping || state.isLoadingMessage}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping || state.isLoadingMessage}
              className="bg-purple-600 hover:bg-purple-700 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scene Generator Modal */}
      {showSceneGenerator && (
        <SceneImageGenerator
          messageContent={`Generate a scene for ${character?.name || 'character'}`}
          mode="roleplay"
          onImageGenerated={(assetId, imageUrl, bucket) => {
            console.log('Scene generated:', { assetId, imageUrl, bucket });
            setShowSceneGenerator(false);
          }}
          onGenerationStart={() => console.log('Scene generation started')}
        />
      )}
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