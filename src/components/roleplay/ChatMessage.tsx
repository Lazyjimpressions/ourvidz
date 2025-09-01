import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bot, 
  Image as ImageIcon, 
  Download, 
  Share2,
  Clock
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Character, Message } from '@/types/roleplay';

interface ChatMessageProps {
  message: Message;
  character: Character | null;
  onGenerateScene: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  character,
  onGenerateScene
}) => {
  const { isMobile } = useMobileDetection();
  const isUser = message.sender === 'user';
  const hasScene = message.metadata?.scene_generated && message.metadata?.image_url;

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Invalid time';
      }
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting time:', error, 'Timestamp:', timestamp);
      return 'Invalid time';
    }
  };

  const handleDownloadImage = () => {
    if (message.metadata?.image_url) {
      const link = document.createElement('a');
      link.href = message.metadata.image_url;
      link.download = `scene-${message.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareScene = () => {
    if (message.metadata?.image_url) {
      navigator.clipboard.writeText(message.metadata.image_url);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'order-2' : 'order-1'}`}>
          <div className={`
            w-8 h-8 rounded-full overflow-hidden
            ${isUser ? 'bg-blue-600' : 'bg-gray-700'}
            flex items-center justify-center
          `}>
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <img 
                src={character?.image_url || '/placeholder.svg'} 
                alt={character?.name || 'Character'}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'order-1' : 'order-2'}`}>
          {/* Message Header */}
          <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-sm font-medium text-gray-300">
              {isUser ? 'You' : character?.name || 'Character'}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatTime(message.timestamp)}
            </div>
          </div>

          {/* Message Bubble */}
          <Card className={`
            p-3 rounded-lg
            ${isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-white border-gray-700'
            }
            ${isMobile ? 'text-sm' : 'text-base'}
          `}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </Card>

          {/* Scene Image */}
          {hasScene && (
            <div className="mt-3">
              <Card className="overflow-hidden border-gray-700 bg-gray-900">
                <div className="relative">
                  <img 
                    src={message.metadata.image_url} 
                    alt="Generated scene"
                    className="w-full h-auto max-h-64 object-cover"
                  />
                  
                  {/* Scene Actions */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleDownloadImage}
                      className="bg-black/50 hover:bg-black/70 text-white border-0"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleShareScene}
                      className="bg-black/50 hover:bg-black/70 text-white border-0"
                    >
                      <Share2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Scene Metadata */}
                <div className="p-2 bg-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Generated Scene</span>
                    <Badge variant="outline" className="text-xs">
                      {message.metadata.consistency_method}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Generate Scene Button for Character Messages */}
          {!isUser && !hasScene && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerateScene}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Generate Scene
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};