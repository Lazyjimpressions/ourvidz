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
  Clock,
  RefreshCw
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Character, Message } from '@/types/roleplay';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { useState, useEffect } from 'react';

interface ChatMessageProps {
  message: Message;
  character: Character | null;
  onGenerateScene: () => void;
  signedCharacterImageUrl?: string | null;
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  character,
  onGenerateScene,
  signedCharacterImageUrl,
  onRetry
}) => {
  const { isMobile } = useMobileDetection();
  const { getSignedUrl } = useSignedImageUrls();
  const isUser = message.sender === 'user';
  const hasScene = message.metadata?.scene_generated && message.metadata?.image_url;
  
  const [signedCharacterImage, setSignedCharacterImage] = useState<string | null>(null);
  const [signedSceneImage, setSignedSceneImage] = useState<string | null>(null);

  // Sign character image URL (use passed prop if available)
  useEffect(() => {
    const signCharacterImage = async () => {
      if (signedCharacterImageUrl) {
        setSignedCharacterImage(signedCharacterImageUrl);
      } else if (character?.image_url && !character.image_url.startsWith('http')) {
        try {
          const signed = await getSignedUrl(character.image_url, 'user-library');
          setSignedCharacterImage(signed);
        } catch (error) {
          console.error('Error signing character image:', error);
          setSignedCharacterImage('/placeholder.svg');
        }
      } else {
        setSignedCharacterImage(character?.image_url || '/placeholder.svg');
      }
    };

    signCharacterImage();
  }, [character?.image_url, signedCharacterImageUrl, getSignedUrl]);

  // Sign scene image URL
  useEffect(() => {
    const signSceneImage = async () => {
      if (message.metadata?.image_url && !message.metadata.image_url.startsWith('http')) {
        try {
          // Improved signing robustness - try workspace-temp first for most scene images
          let bucket = 'workspace-temp';
          
          // Only check for user-library if path explicitly contains these indicators
          if (message.metadata.image_url.includes('user-library') || 
              message.metadata.image_url.includes('sdxl_image') ||
              message.metadata.image_url.includes('image_high') ||
              message.metadata.image_url.includes('image_fast')) {
            bucket = 'user-library';
          }
          
          try {
            const signed = await getSignedUrl(message.metadata.image_url, bucket);
            setSignedSceneImage(signed);
            console.log('🖼️ Scene image signed successfully with bucket:', bucket);
          } catch (workspaceTempError) {
            // If workspace-temp fails and we haven't tried user-library, try it as fallback
            if (bucket === 'workspace-temp') {
              console.log('🔄 Workspace-temp failed, trying user-library as fallback');
              try {
                const signed = await getSignedUrl(message.metadata.image_url, 'user-library');
                setSignedSceneImage(signed);
                console.log('✅ Scene image signed with user-library fallback');
              } catch (userLibraryError) {
                console.error('❌ Both buckets failed, using raw path:', userLibraryError);
                setSignedSceneImage(message.metadata?.raw_image_path || message.metadata?.image_url);
              }
            } else {
              throw workspaceTempError;
            }
          }
        } catch (error) {
          console.error('Error signing scene image:', error);
          // Fallback to raw path if all signing fails
          setSignedSceneImage(message.metadata?.raw_image_path || message.metadata?.image_url);
        }
      } else {
        setSignedSceneImage(message.metadata?.image_url || null);
      }
    };

    if (hasScene) {
      signSceneImage();
    }
  }, [message.metadata?.image_url, message.metadata?.raw_image_path, hasScene, getSignedUrl]);

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
                src={signedCharacterImage || '/placeholder.svg'} 
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
            
            {/* Retry button for failed kickoff */}
            {message.metadata?.needsRetry && onRetry && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <Button 
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white border-red-500"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Scene Setup
                </Button>
              </div>
            )}
          </Card>

          {/* Scene Image */}
          {hasScene && signedSceneImage && (
            <div className="mt-3">
              <Card className="overflow-hidden border-gray-700 bg-gray-900">
                <div className="relative">
                  <img 
                    src={signedSceneImage} 
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