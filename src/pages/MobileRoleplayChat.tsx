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

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  category: string;
  consistency_method: string;
  base_prompt: string;
  quick_start: boolean;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  timestamp: Date;
  metadata?: {
    scene_generated?: boolean;
    image_url?: string;
    consistency_method?: string;
  };
}

const MobileRoleplayChat: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [memoryTier, setMemoryTier] = useState<'conversation' | 'character' | 'profile'>('conversation');
  const [modelProvider, setModelProvider] = useState<'chat_worker' | 'openrouter' | 'claude' | 'gpt'>('chat_worker');

  // Mock character data - replace with actual API call
  useEffect(() => {
    const mockCharacter: Character = {
      id: characterId || '1',
      name: 'Luna the Mystic',
      description: 'A wise and mysterious character with deep knowledge of ancient magic',
      image_url: '/placeholder.svg',
      category: 'fantasy',
      consistency_method: 'i2i_reference',
      base_prompt: 'You are Luna, a wise and mysterious character with deep knowledge of ancient magic. You speak with wisdom and grace.',
      quick_start: true
    };
    setCharacter(mockCharacter);
    
    // Mock initial messages
    const initialMessages: Message[] = [
      {
        id: '1',
        content: 'Hello! I am Luna. I sense you have questions about the ancient arts. How may I assist you today?',
        sender: 'character',
        timestamp: new Date(Date.now() - 60000)
      }
    ];
    setMessages(initialMessages);
  }, [characterId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !character) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call the roleplay-chat edge function
      const response = await fetch('/api/roleplay-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          conversation_id: 'mock-conversation-id', // TODO: Get from context
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: 'sfw',
          scene_generation: false,
          user_id: 'mock-user-id' // TODO: Get from auth context
        })
      });

      if (response.ok) {
        const data = await response.json();
        const characterMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'character',
          timestamp: new Date(),
          metadata: {
            scene_generated: data.scene_generated,
            image_url: data.image_url,
            consistency_method: character.consistency_method
          }
        };
        setMessages(prev => [...prev, characterMessage]);
      } else {
        // Fallback response for demo
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Thank you for your message about "${content.trim()}". As Luna, I find your inquiry most intriguing. What specific aspect would you like to explore further?`,
          sender: 'character',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I seem to be having trouble connecting right now. Could you try again in a moment?',
        sender: 'character',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScene = async () => {
    if (!character) return;
    
    setIsLoading(true);
    try {
      // Call the roleplay-chat edge function with scene generation
      const response = await fetch('/api/roleplay-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Generate a scene based on our conversation',
          conversation_id: 'mock-conversation-id',
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: 'sfw',
          scene_generation: true,
          user_id: 'mock-user-id'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const sceneMessage: Message = {
          id: Date.now().toString(),
          content: 'I\'ve generated a scene based on our conversation!',
          sender: 'character',
          timestamp: new Date(),
          metadata: {
            scene_generated: true,
            image_url: data.image_url,
            consistency_method: character.consistency_method
          }
        };
        setMessages(prev => [...prev, sceneMessage]);
      }
    } catch (error) {
      console.error('Error generating scene:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/roleplay');
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
                    {character.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {character.consistency_method}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
              <span className="text-sm">Luna is thinking...</span>
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

        {/* Mobile Character Sheet - Bottom Sheet */}
        {isMobile && showCharacterSheet && (
          <MobileCharacterSheet 
            character={character}
            onClose={() => setShowCharacterSheet(false)}
            memoryTier={memoryTier}
            onMemoryTierChange={setMemoryTier}
            modelProvider={modelProvider}
            onModelProviderChange={setModelProvider}
          />
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayChat;
