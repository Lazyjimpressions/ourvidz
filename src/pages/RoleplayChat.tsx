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
  const characterId = searchParams.get('character') || '1';
  
  // Load real character data from database
  const { character, isLoading: isLoadingCharacter, likeCharacter } = useCharacterData(characterId);
  const { scenes, isLoading: isLoadingScenes } = useCharacterScenes(characterId);
  const { queueJob } = useJobQueue();
  const { generateSceneFromMessage } = useAutoSceneGeneration();
  const { chatWorker } = useWorkerStatus();
  
  // Fallback to mock data if no character loaded yet
  const selectedCharacter = character || mockCharacters[characterId] || mockCharacters['1'];
  
  const {
    state,
    messages,
    isLoadingMessages,
    createConversation,
    sendMessage,
  } = usePlayground();

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCharacterPanel, setShowCharacterPanel] = useState(false); // Changed to false by default
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("A mysterious woman in an elegant nightclub, dramatic lighting, cinematic composition");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [generateImageForMessage, setGenerateImageForMessage] = useState(false);
  const [characterLiked, setCharacterLiked] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Persist Auto-generate Scene toggle in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rp:autoGenScene');
    if (saved !== null) setGenerateImageForMessage(saved === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('rp:autoGenScene', generateImageForMessage ? '1' : '0');
  }, [generateImageForMessage]);

  // Inline image generation context helpers
  const { getEntry, setPending, setReady } = useGeneratedMedia();
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation on mount
  useEffect(() => {
    if (!state.activeConversationId) {
      createConversation(`Roleplay: ${selectedCharacter.name}`, undefined, 'roleplay');
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !state.activeConversationId) return;

    const message = inputMessage.trim();
    setInputMessage('');

    try {
      await sendMessage(message, { characterId: character?.id });

      // Auto-generate scene if enabled
      if (generateImageForMessage && character) {
        const windowStart = Math.max(0, Math.max(0, messages.length - 5));
        const recent = messages.slice(windowStart).concat([{ sender: 'user', content: message } as any]);
        const convoContext = recent.map(m => `${m.sender === 'user' ? 'User' : selectedCharacter.name}: ${m.content}`).join('\n');
        const enriched = `Character: ${selectedCharacter.name}\nRecent conversation:\n${convoContext}\nFocus:\n${message}`;

        await generateSceneFromMessage(enriched, {
          characterId: character.id,
          conversationId: state.activeConversationId,
          characterName: character.name,
          referenceImageUrl: character.reference_image_url,
          isEnabled: true
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Collapsible Character Panel Component - Much more compact
  const CharacterPanel = () => (
    <div className={`
      ${showCharacterPanel ? 'w-72' : 'w-0'} 
      transition-all duration-300 ease-in-out overflow-hidden
      bg-gray-950 border-r border-gray-800 flex-shrink-0
      lg:relative lg:block
      ${showCharacterPanel ? 'block' : 'hidden lg:block'}
    `}>
      <div className="h-full overflow-y-auto">
        {/* Compact Header */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src={selectedCharacter.avatar} 
                alt={selectedCharacter.name}
                className="w-8 h-8 rounded-full border border-purple-500"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate">{selectedCharacter.name}</h3>
                <p className="text-xs text-gray-400 truncate">{selectedCharacter.creator}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCharacterPanel(false)}
              className="p-1 hover:bg-gray-800 rounded lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Compact Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  if (!characterLiked && character) {
                    likeCharacter(character.id);
                    setCharacterLiked(true);
                  }
                }}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  characterLiked ? 'bg-red-600/20 text-red-400' : 'bg-gray-800 text-gray-400'
                }`}
              >
                <Heart className={`w-3 h-3 ${characterLiked ? 'fill-current' : ''}`} />
                <span>{(character?.likes_count || selectedCharacter.likes || 0) + (characterLiked ? 1 : 0)}</span>
              </button>
              <button className="p-1 bg-gray-800 rounded hover:bg-gray-700">
                <Share className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-400">{character?.mood || selectedCharacter.mood}</span>
            </div>
          </div>
        </div>

        {/* New Chat Button - Smaller */}
        <div className="p-3 border-b border-gray-800">
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-medium flex items-center justify-center space-x-1">
            <Plus className="w-3 h-3" />
            <span>New chat</span>
          </button>
        </div>

        {/* Compact Traits */}
        <div className="p-3 border-b border-gray-800">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Traits</h4>
          <div className="flex flex-wrap gap-1">
            {(character?.appearance_tags || selectedCharacter.traits || []).map((trait, index) => (
              <span key={index} className="px-2 py-1 bg-gray-800 rounded text-xs">
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Voice Controls - Compact */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Voice</span>
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`p-1 rounded ${isVoiceEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                {isVoiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>
              <span className="text-xs text-gray-500">Default</span>
            </div>
          </div>
        </div>

        {/* Scene Gallery - Real data from database */}
        <div className="p-3">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Scenes ({scenes.length})</h4>
          {isLoadingScenes ? (
            <div className="text-xs text-gray-500">Loading scenes...</div>
          ) : scenes.length > 0 ? (
            <div className="space-y-2">
              {scenes.map((scene) => (
                <div key={scene.id} className="relative group">
                  <img 
                    src={scene.image_url} 
                    alt={scene.scene_prompt}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                    title={scene.scene_prompt}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <div className="flex space-x-1">
                      <button className="p-1 bg-black bg-opacity-60 rounded">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button className="p-1 bg-black bg-opacity-60 rounded">
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">No scenes generated yet</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Desktop Character Panel - Now collapsible */}
      <div className="hidden lg:flex">
        <CharacterPanel />
        {/* Toggle Button for Desktop */}
        {!showCharacterPanel && (
          <button
            onClick={() => setShowCharacterPanel(true)}
            className="w-8 bg-gray-950 border-r border-gray-800 flex items-center justify-center hover:bg-gray-900"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Mobile Character Panel Overlay */}
      {showCharacterPanel && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="w-72 h-full bg-gray-950">
            <CharacterPanel />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Mobile Header */}
        <div className="lg:hidden px-3 py-2 border-b border-gray-800 flex items-center justify-between">
          <button 
            onClick={() => navigate('/roleplay')}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2">
            <img 
              src={selectedCharacter.avatar} 
              alt={selectedCharacter.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="font-medium text-sm">{selectedCharacter.name}</span>
          </div>
          
          <button 
            onClick={() => setShowCharacterPanel(true)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Desktop Header */}
        <div className="hidden lg:flex px-4 py-2 border-b border-gray-800 items-center justify-between">
          <div className="flex items-center space-x-2">
            {showCharacterPanel && (
              <button
                onClick={() => setShowCharacterPanel(false)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-lg font-medium">Roleplay Chat</h1>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs">Active</span>
            
            {/* Worker status indicator - subtle */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
              <span className={`w-2 h-2 rounded-full ${chatWorker.isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-xs text-gray-400">{chatWorker.isHealthy ? 'Worker online' : 'Worker offline'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-1 hover:bg-gray-800 rounded">
              <Share className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages - More compact spacing */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message, idx) => {
            const stableKey = `${message.conversation_id}:${hash(message.content)}`;
            const mediaEntry = getEntry(stableKey);
            const isUserMsg = message.sender === 'user';
            const windowStart = Math.max(0, idx - 5);
            const recent = messages.slice(windowStart, idx + 1);
            const convoContext = recent.map(m => `${m.sender === 'user' ? 'User' : selectedCharacter.name}: ${m.content}`).join('\n');
            const enrichedContent = `Character: ${selectedCharacter.name}\nRecent conversation:\n${convoContext}\nFocus:\n${message.content}`;
            return (
              <div key={message.id} className={`flex ${isUserMsg ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] ${
                  isUserMsg 
                    ? 'bg-blue-600 rounded-2xl rounded-br-md' 
                    : 'bg-gray-800 rounded-2xl rounded-bl-md'
                } px-3 py-2`}>
                  {!isUserMsg && (
                    <div className="flex items-center space-x-2 mb-1">
                      <img 
                        src={selectedCharacter.avatar} 
                        alt={selectedCharacter.name}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="font-medium text-xs">{selectedCharacter.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {!isUserMsg && (
                    <>
                      {/* Actions */}
                      <div className="flex items-center space-x-1 mt-2">
                        <button className="flex items-center space-x-1 p-1 hover:bg-gray-700 rounded text-xs">
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button className="flex items-center space-x-1 p-1 hover:bg-gray-700 rounded text-xs">
                          <Copy className="w-3 h-3" />
                        </button>
                        {/* Generate Image button */}
                        <SceneImageGenerator
                          messageContent={enrichedContent}
                          onGenerationStart={() => setPending(stableKey)}
                          onImageGenerated={(assetId, imageUrl, bucket) => {
                            setReady(stableKey, { assetId, imageUrl: imageUrl || null, bucket: bucket || null });
                          }}
                          mode="roleplay"
                        />
                      </div>

                      {/* Inline media status and display */}
                      {mediaEntry?.status === 'pending' && (
                        <Card className="mt-2 p-3 max-w-xs bg-muted/30">
                          <div className="flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-xs text-muted-foreground">Generating image...</span>
                          </div>
                        </Card>
                      )}

                      {mediaEntry?.status === 'ready' && mediaEntry.assetId && (
                        <div className="mt-2">
                          <InlineImageDisplay
                            assetId={mediaEntry.assetId}
                            imageUrl={mediaEntry.imageUrl || undefined}
                            bucket={mediaEntry.bucket || undefined}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          
          {(isTyping || state.isLoadingMessage) && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 max-w-[85%] sm:max-w-[75%]">
                <div className="flex items-center space-x-2 mb-1">
                  <img 
                    src={selectedCharacter.avatar} 
                    alt={selectedCharacter.name}
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="font-medium text-xs">{selectedCharacter.name}</span>
                  <span className="text-xs text-gray-400">typing...</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compact Input Area */}
        <div className="p-3 border-t border-gray-800">
          {/* Quick Options - Smaller */}
          <div className="flex items-center space-x-2 mb-2">
            <label className="flex items-center space-x-1 text-xs">
              <input 
                type="checkbox" 
                checked={generateImageForMessage}
                onChange={(e) => setGenerateImageForMessage(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              <span>Auto-generate scene</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-0.5 rounded hover:bg-gray-700" aria-label="Auto-generate scene info">
                      <Info className="w-3 h-3 text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    When enabled, the app builds a short context from recent messages and auto-creates a scene image after you send a message.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            
            <button 
              onClick={() => setIsListening(!isListening)}
              className={`p-1.5 rounded ${isListening ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </button>
          </div>
          
          {/* Input Row - More compact */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Message ${selectedCharacter.name}...`}
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

      {/* Prompt Modal - Slightly more compact */}
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
      <RoleplayHeader title="Roleplay Chat" backPath="/roleplay" />
      <div className="pt-12 h-screen">
        <GeneratedMediaProvider>
          <PlaygroundProvider>
            <RoleplayChatInterface />
          </PlaygroundProvider>
        </GeneratedMediaProvider>
      </div>
    </div>
  );
};

export default RoleplayChat;