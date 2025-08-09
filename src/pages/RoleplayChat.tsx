import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { PlaygroundProvider, usePlayground } from '@/contexts/PlaygroundContext';
import { GeneratedMediaProvider } from '@/contexts/GeneratedMediaContext';
import { useGeneratedMedia } from '@/contexts/GeneratedMediaContext';
import { supabase } from '@/integrations/supabase/client';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { useAutoSceneGeneration } from '@/hooks/useAutoSceneGeneration';
import { useJobQueue } from '@/hooks/useJobQueue';
import { useWorkerStatus } from '@/hooks/useWorkerStatus';
import { 
  Send, Image, RotateCcw, Settings, ChevronDown, Sparkles, 
  Camera, Play, Mic, MicOff, Volume2, VolumeX, MoreHorizontal, 
  Heart, Share, MessageSquare, Copy, Download, Menu, X, Plus,
  Star, UserPlus, Bell, ChevronLeft, ChevronRight, AlertTriangle, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SceneImageGenerator } from '@/components/playground/SceneImageGenerator';
import { InlineImageDisplay } from '@/components/playground/InlineImageDisplay';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationHistory } from '@/components/ConversationHistory';
import { MessageBubble } from '@/components/playground/MessageBubble';

// Mock character data - in real app this would come from database
const mockCharacters = {
  '1': {
    id: '1',
    name: "Elena Voss",
    creator: "@twilights_",
    interactions: "2.0m interactions",
    persona: "Mysterious, elegant vampire who runs a nightclub in modern times",
    system_prompt: "You are Elena, a 300-year-old vampire who owns an upscale nightclub. You're sophisticated, mysterious, with hints of danger beneath your elegant exterior. Speak with confidence and intrigue.",
    avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face",
    mood: "Intrigued",
    traits: ["Elegant", "Mysterious", "Confident", "Seductive"],
    voice_tone: "sultry",
    likes: 503,
    isLiked: false,
    reference_image: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400&h=600&fit=crop",
    generated_images: [
      "https://images.unsplash.com/photo-1494790108755-2616c4e2e8b2?w=300&h=400&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop",
    ]
  }
};

const RoleplayChatInterface = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const characterParam = searchParams.get('character');
  const isUuid = (s?: string | null) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
  const effectiveCharacterId = isUuid(characterParam) ? (characterParam as string) : undefined;
  
  // Load real character data from database (only if we have a valid UUID)
  const { character, isLoading: isLoadingCharacter, likeCharacter } = useCharacterData(effectiveCharacterId);
  const { scenes, isLoading: isLoadingScenes } = useCharacterScenes(effectiveCharacterId);
  const { queueJob } = useJobQueue();
  const { generateSceneFromMessage } = useAutoSceneGeneration();
  const { chatWorker, isLoading: workerLoading, runHealthCheck, lastUpdated } = useWorkerStatus();
  
  // Fallbacks for UI display while character loads
  const mock = mockCharacters['1'];
  const displayName = character?.name ?? mock.name;
  const displayAvatar = character?.image_url ?? mock.avatar;
  const displayCreator = character?.creator_id ?? mock.creator;
  const displayLikes = character?.likes_count ?? mock.likes;
  const displayMood = character?.mood ?? mock.mood;
  const displayTraits = Array.isArray(character?.appearance_tags)
    ? (character!.appearance_tags as string[])
    : (typeof character?.traits === 'string' && character?.traits)
      ? character!.traits.split(',').map(t => t.trim()).filter(Boolean)
      : mock.traits;
  
  const {
    state,
    conversations,
    messages,
    isLoadingMessages,
    createConversation,
    setActiveConversation,
    sendMessage,
  } = usePlayground();
  const { isAdmin } = useAuth();

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCharacterPanel, setShowCharacterPanel] = useState(true); // Show by default for better UX
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("A mysterious woman in an elegant nightclub, dramatic lighting, cinematic composition");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [generateImageForMessage, setGenerateImageForMessage] = useState(false);
  const [characterLiked, setCharacterLiked] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { getEntry } = useGeneratedMedia();

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    setIsTyping(true);
    try {
      await sendMessage(inputMessage, { 
        characterId: effectiveCharacterId,
        conversationId: state.activeConversationId 
      });
      setInputMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const handleToggleLike = async () => {
    setCharacterLiked(!characterLiked);
    if (character?.id) {
      await likeCharacter(character.id);
    }
  };

  const handleCreateConversation = async () => {
    try {
      await createConversation('New Chat', undefined, 'character_roleplay', effectiveCharacterId);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const CharacterPanel = ({ 
    character, displayName, displayAvatar, displayCreator, 
    displayLikes, displayMood, displayTraits, characterLiked, 
    onToggleLike, onTogglePanel, isLoadingCharacter, isLoadingScenes, scenes,
    conversations, activeConversationId, onCreateConversation, onSelectConversation
  }) => {
    return (
      <div className="p-4 space-y-4">
        {/* Header with close button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Chat & Character</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePanel}
            className="text-gray-400 hover:text-white h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Chat History Section */}
        <ConversationHistory
          conversations={conversations || []}
          activeConversationId={activeConversationId}
          onCreateConversation={onCreateConversation}
          onSelectConversation={onSelectConversation}
        />

        {/* Separator */}
        <div className="border-t border-gray-700"></div>

        {/* Character Info */}
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-gray-300">Character Details</h3>
          <div className="flex items-center space-x-3">
            <img 
              src={displayAvatar} 
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h4 className="font-semibold text-lg">{displayName}</h4>
              <p className="text-sm text-gray-400">{displayCreator}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">{displayLikes} likes</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleLike}
                  className={`p-1 h-6 w-6 ${characterLiked ? 'text-red-500' : 'text-gray-400'}`}
                >
                  <Heart className={`w-3 h-3 ${characterLiked ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Character traits */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">Mood: <span className="text-purple-400">{displayMood}</span></p>
            <div className="flex flex-wrap gap-1">
              {displayTraits.map((trait, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-800 text-xs rounded-full text-gray-300">
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Character description */}
          {character?.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-300">About</p>
              <p className="text-xs text-gray-400 leading-relaxed">{character.description}</p>
            </div>
          )}
        </div>

        {/* Scenes Gallery */}
        {scenes && scenes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-300">Character Scenes</h3>
            <div className="grid grid-cols-2 gap-2">
              {scenes.slice(0, 4).map((scene, idx) => (
                <div key={idx} className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                  {scene.image_url ? (
                    <img 
                      src={scene.image_url} 
                      alt={`Scene ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-black text-white relative overflow-hidden">
      <RoleplayHeader title={displayName} />
      
      {/* Character Panel - Fixed z-index and padding for header */}
      <div className={`${showCharacterPanel ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 fixed left-0 top-16 bottom-0 w-80 bg-gray-900 border-r border-gray-700 z-30 overflow-y-auto`}>
        <CharacterPanel 
          character={character}
          displayName={displayName}
          displayAvatar={displayAvatar}
          displayCreator={displayCreator}
          displayLikes={displayLikes}
          displayMood={displayMood}
          displayTraits={displayTraits}
          characterLiked={characterLiked}
          onToggleLike={handleToggleLike}
          onTogglePanel={() => setShowCharacterPanel(false)}
          isLoadingCharacter={isLoadingCharacter}
          isLoadingScenes={isLoadingScenes}
          scenes={scenes}
          conversations={conversations}
          activeConversationId={state.activeConversationId}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={setActiveConversation}
        />
      </div>

      {/* Main Chat Area - Fixed padding for header */}
      <div className={`flex-1 flex flex-col transition-all duration-300 pt-16 ${showCharacterPanel ? 'ml-80' : 'ml-0'}`}>
        {/* Toggle button for character panel */}
        {!showCharacterPanel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCharacterPanel(true)}
            className="fixed left-4 top-20 z-20 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Menu className="w-4 h-4 mr-1" />
            Character
          </Button>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-20 space-y-4">
          {/* Chat content */}
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Start your conversation with {displayName}</p>
              <p className="text-sm">Share your thoughts, ask questions, or begin a roleplay scenario.</p>
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
              <span className="text-sm">{displayName} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="bg-gray-900 border-t border-gray-700 p-4 space-y-3">
          {/* Controls Row */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 text-gray-400">
              <input
                type="checkbox"
                checked={generateImageForMessage}
                onChange={(e) => setGenerateImageForMessage(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-purple-600"
              />
              <span>Auto-generate scene</span>
            </label>
            
            <button 
              onClick={() => setIsListening(!isListening)}
              className={`p-1.5 rounded ${isListening ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </button>
          </div>
          
          {/* Input Row */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Message ${displayName}...`}
                className="w-full bg-gray-800 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm min-h-[40px] max-h-[100px] px-3 py-2"
                disabled={isTyping || state.isLoadingMessage}
              />
            </div>
            
            <div className="flex space-x-1">
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || state.isLoadingMessage}
                className="bg-purple-600 hover:bg-purple-700 p-2 h-10 w-10"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowPromptModal(true)}
                className="bg-gray-700 hover:bg-gray-600 p-2 h-10 w-10"
              >
                <Image className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-4 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3">Generate Scene Image</h3>
            <Textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-24 bg-gray-800 rounded p-3 text-white resize-none text-sm"
              placeholder="Describe the visual scene..."
            />
            
            <div className="flex justify-between mt-4 space-x-2">
              <Button
                onClick={() => setShowPromptModal(false)}
                variant="outline"
                className="text-sm"
              >
                Cancel
              </Button>
              <div className="flex space-x-2">
                <Button className="bg-purple-600 hover:bg-purple-700 text-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Enhance
                </Button>
                <Button
                  onClick={() => setShowPromptModal(false)}
                  className="bg-blue-600 hover:blue-700 text-sm"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RoleplayChat = () => {
  return (
    <div className="min-h-screen bg-black">
      <GeneratedMediaProvider>
        <PlaygroundProvider>
          <RoleplayChatInterface />
        </PlaygroundProvider>
      </GeneratedMediaProvider>
    </div>
  );
};

export default RoleplayChat;