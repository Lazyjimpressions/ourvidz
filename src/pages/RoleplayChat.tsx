import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { PlaygroundProvider, usePlayground } from '@/contexts/PlaygroundContext';
import { 
  Send, Image, RotateCcw, Settings, ChevronDown, Sparkles, 
  Camera, Play, Mic, MicOff, Volume2, VolumeX, MoreHorizontal, 
  Heart, Share, MessageSquare, Copy, Download, Menu, X, Plus,
  Star, UserPlus, Bell 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
  const selectedCharacter = mockCharacters[characterId] || mockCharacters['1'];
  
  const {
    state,
    messages,
    isLoadingMessages,
    sendMessage,
    createConversation,
  } = usePlayground();

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCharacterDetails, setShowCharacterDetails] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("A mysterious woman in an elegant nightclub, dramatic lighting, cinematic composition");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [generateImageForMessage, setGenerateImageForMessage] = useState(false);
  const [characterLiked, setCharacterLiked] = useState(selectedCharacter.isLiked);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
    setIsTyping(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Character Details Panel Component
  const CharacterDetailsPanel = () => (
    <div className={`fixed inset-0 z-50 bg-black transform transition-transform duration-300 lg:relative lg:transform-none lg:w-80 lg:border-r lg:border-gray-800 ${showCharacterDetails ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">Character Details</h2>
        <button 
          onClick={() => setShowCharacterDetails(false)}
          className="p-2 hover:bg-gray-800 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col h-full lg:h-screen">
        {/* Character Profile Header */}
        <div className="p-4 border-b border-gray-800 space-y-4">
          {/* Character Avatar & Basic Info */}
          <div className="flex items-center space-x-3">
            <img 
              src={selectedCharacter.avatar} 
              alt={selectedCharacter.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl truncate">{selectedCharacter.name}</h2>
              <p className="text-sm text-gray-400 truncate">By {selectedCharacter.creator}</p>
              <p className="text-xs text-gray-500">{selectedCharacter.interactions}</p>
            </div>
          </div>

          {/* Character Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCharacterLiked(!characterLiked)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-full text-sm ${characterLiked ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                <Heart className={`w-4 h-4 ${characterLiked ? 'fill-current' : ''}`} />
                <span>{selectedCharacter.likes + (characterLiked ? 1 : 0)}</span>
              </button>
              
              <button className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                <Share className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>

          {/* Character Status & Voice */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Online • {selectedCharacter.mood}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`p-2 rounded ${isVoiceEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <span className="text-xs text-gray-400">Default</span>
            </div>
          </div>
        </div>

        {/* Character Traits */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-medium mb-3">Character Traits</h3>
          <div className="flex flex-wrap gap-2">
            {selectedCharacter.traits.map((trait, index) => (
              <span key={index} className="px-3 py-1 bg-gray-800 rounded-full text-sm">
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Scene Gallery */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-medium">Scene Gallery</h3>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {selectedCharacter.generated_images.map((image, index) => (
              <div key={index} className="relative group">
                <img 
                  src={image} 
                  alt={`Generated scene ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-80"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <div className="flex space-x-2">
                    <button className="p-2 bg-black bg-opacity-50 rounded-full">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-black bg-opacity-50 rounded-full">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Menu Component
  const MobileMenu = () => (
    <div className={`fixed inset-0 z-40 lg:hidden transform transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full">
        <div className="w-64 bg-gray-900 border-r border-gray-800 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Menu</h2>
            <button 
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/roleplay')}
              className="w-full text-left p-3 hover:bg-gray-800 rounded-lg"
            >
              Character Library
            </button>
            <button className="w-full text-left p-3 bg-purple-600 rounded-lg">
              <span className="font-medium">Active Chat</span>
            </button>
          </div>
        </div>
        <div 
          className="flex-1 bg-black bg-opacity-50"
          onClick={() => setShowMobileMenu(false)}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Character Details Panel */}
      <CharacterDetailsPanel />
      
      {/* Mobile Menu */}
      <MobileMenu />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-gray-800 flex items-center justify-between">
          <button 
            onClick={() => setShowMobileMenu(true)}
            className="p-2 hover:bg-gray-800 rounded"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <img 
              src={selectedCharacter.avatar} 
              alt={selectedCharacter.name}
              className="w-8 h-8 rounded-full"
            />
            <span className="font-medium">{selectedCharacter.name}</span>
          </div>
          
          <button 
            onClick={() => setShowCharacterDetails(true)}
            className="p-2 hover:bg-gray-800 rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold">Roleplay Chat</h1>
              <span className="px-2 py-1 bg-purple-600 rounded-full text-xs">Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-800 rounded">
                <Share className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-800 rounded">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[80%] ${message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-800'} rounded-lg p-4`}>
                {message.sender !== 'user' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <img 
                      src={selectedCharacter.avatar} 
                      alt={selectedCharacter.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="font-medium text-sm">{selectedCharacter.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.sender !== 'user' && (
                  <div className="flex items-center space-x-2 mt-3 text-xs">
                    <button className="flex items-center space-x-1 p-2 hover:bg-gray-700 rounded text-xs">
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                    <button 
                      onClick={() => setShowPromptModal(true)}
                      className="flex items-center space-x-1 p-2 hover:bg-gray-700 rounded text-xs"
                    >
                      <Camera className="w-3 h-3" />
                      <span className="hidden sm:inline">Visualize</span>
                    </button>
                    <button className="flex items-center space-x-1 p-2 hover:bg-gray-700 rounded text-xs">
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {(isTyping || state.isLoadingMessage) && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-4 max-w-[85%] sm:max-w-[80%]">
                <div className="flex items-center space-x-2 mb-2">
                  <img 
                    src={selectedCharacter.avatar} 
                    alt={selectedCharacter.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="font-medium text-sm">{selectedCharacter.name}</span>
                  <span className="text-xs text-gray-400">typing...</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          {/* Quick Options */}
          <div className="flex items-center space-x-2 mb-3 overflow-x-auto pb-2">
            <label className="flex items-center space-x-2 text-sm whitespace-nowrap">
              <input 
                type="checkbox" 
                checked={generateImageForMessage}
                onChange={(e) => setGenerateImageForMessage(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs sm:text-sm">Auto-generate scene</span>
            </label>
            
            <button 
              onClick={() => setIsListening(!isListening)}
              className={`p-2 rounded ${isListening ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
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
                placeholder={`Message ${selectedCharacter.name}...`}
                className="w-full bg-gray-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm min-h-[60px] max-h-[120px]"
                disabled={isTyping || state.isLoadingMessage}
              />
            </div>
            
            <div className="flex flex-col space-y-1">
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || state.isLoadingMessage}
                className="bg-purple-600 hover:bg-purple-700 p-3"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowPromptModal(true)}
                className="bg-gray-700 hover:bg-gray-600 p-3"
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
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Generate Scene Image</h3>
            <Textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-32 bg-gray-800 rounded p-3 text-white resize-none text-sm"
              placeholder="Describe the visual scene..."
            />
            
            <div className="flex flex-col sm:flex-row justify-between mt-6 space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                onClick={() => setShowPromptModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <div className="flex space-x-2">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance
                </Button>
                <Button
                  onClick={() => setShowPromptModal(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
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
        <PlaygroundProvider>
          <RoleplayChatInterface />
        </PlaygroundProvider>
      </div>
    </div>
  );
};

export default RoleplayChat;