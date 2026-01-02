import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, RotateCcw } from 'lucide-react';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bot, 
  Image as ImageIcon, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Character, Message, UserCharacter } from '@/types/roleplay';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { MessageActions } from './MessageActions';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  character: Character | null;
  userCharacter?: UserCharacter | null;
  onGenerateScene: () => void;
  signedCharacterImageUrl?: string | null;
  signedUserCharacterImageUrl?: string | null;
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  character,
  userCharacter,
  onGenerateScene,
  signedCharacterImageUrl,
  signedUserCharacterImageUrl,
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

  // Sign scene image URL using workspace asset service
  useEffect(() => {
    const signSceneImage = async () => {
      if (message.metadata?.image_url && !message.metadata.image_url.startsWith('http')) {
        try {
          // Create asset-like object for signing
          const assetLike = {
            temp_storage_path: message.metadata.image_url,
            user_id: 'temp' // WorkspaceAssetService handles this internally
          };
          
          const signedUrl = await WorkspaceAssetService.generateSignedUrl(assetLike);
          setSignedSceneImage(signedUrl);
          console.log('✅ Scene image signed via WorkspaceAssetService');
        } catch (error) {
          console.error('Error signing scene image:', error);
          setSignedSceneImage(message.metadata?.image_url);
        }
      } else {
        setSignedSceneImage(message.metadata?.image_url || null);
      }
    };

    if (hasScene) {
      signSceneImage();
    }
  }, [message.metadata?.image_url, hasScene]);

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
    <div className={cn(
      "flex group",
      isUser ? 'justify-end' : 'justify-start',
      "mb-4"
    )}>
      <div className={cn(
        "flex gap-3",
        isUser ? 'flex-row-reverse' : 'flex-row',
        isMobile ? 'max-w-[90%]' : 'max-w-[75%]'
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0",
          isUser ? 'order-2' : 'order-1'
        )}>
          <div className={cn(
            "rounded-full overflow-hidden flex items-center justify-center",
            isUser 
              ? "w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
              : "w-10 h-10 bg-gray-700 shadow-lg ring-2 ring-gray-600",
            !isMobile && "w-12 h-12"
          )}>
            {isUser ? (
              signedUserCharacterImageUrl ? (
                <img
                  src={signedUserCharacterImageUrl}
                  alt={userCharacter?.name || 'You'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className={cn(
                  "text-white",
                  isMobile ? "w-5 h-5" : "w-6 h-6"
                )} />
              )
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
        <div className={cn(
          "flex flex-col gap-1",
          isUser ? 'order-1 items-end' : 'order-2 items-start'
        )}>
          {/* Message Header */}
          <div className={cn(
            "flex items-center gap-2",
            isUser ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              "font-semibold",
              isUser ? "text-blue-400" : "text-gray-300",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {isUser ? (userCharacter?.name || 'You') : (character?.name || 'Character')}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatTime(message.timestamp)}
            </div>
          </div>

          {/* Message Bubble with Actions */}
          <div className={cn(
            "flex items-start gap-2",
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <Card className={cn(
              "rounded-2xl shadow-lg",
              isUser 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0' 
                : 'bg-gray-800 text-white border-gray-700',
              isMobile ? 'px-4 py-3 text-sm' : 'px-5 py-4 text-base',
              "max-w-full"
            )}>
              <p className={cn(
                "whitespace-pre-wrap break-words leading-relaxed",
                isMobile ? "text-sm" : "text-base"
              )}>
                {message.content}
              </p>
              
              {/* Retry button for failed kickoff */}
              {message.metadata?.needsRetry && onRetry && (
                <div className="mt-3 pt-3 border-t border-white/20">
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
            
            {/* Message Actions */}
            <div className={cn(
              "flex-shrink-0 pt-1",
              isUser ? 'order-2' : 'order-1'
            )}>
              <MessageActions
                message={message}
                onCopy={() => {
                  navigator.clipboard.writeText(message.content);
                }}
                onDownload={message.metadata?.image_url ? handleDownloadImage : undefined}
                onShare={message.metadata?.image_url ? handleShareScene : undefined}
                showOnHover={!isMobile}
              />
            </div>
          </div>

          {/* Scene Image */}
          {hasScene && signedSceneImage && (
            <div className={cn(
              "mt-3",
              isUser ? 'ml-auto' : 'mr-auto',
              isMobile ? 'max-w-full' : 'max-w-md'
            )}>
              <Card className="overflow-hidden border-gray-700 bg-gray-900 rounded-xl shadow-xl">
                <div className="relative group">
                  <img 
                    src={signedSceneImage} 
                    alt="Generated scene"
                    className="w-full h-auto max-h-96 object-cover rounded-t-xl"
                  />
                  
                  {/* Scene Actions - Show on hover */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleDownloadImage}
                      className="bg-black/70 hover:bg-black/90 text-white border-0 backdrop-blur-sm"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleShareScene}
                      className="bg-black/70 hover:bg-black/90 text-white border-0 backdrop-blur-sm"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Scene Metadata */}
                <div className="p-3 bg-gray-800/80 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Generated Scene</span>
                    {message.metadata.consistency_method && (
                      <Badge variant="outline" className="text-xs bg-gray-700/50 border-gray-600">
                        {message.metadata.consistency_method}
                      </Badge>
                    )}
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
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all"
              >
                <ImageIcon className={cn("mr-1.5", isMobile ? "w-3 h-3" : "w-4 h-4")} />
                Generate Scene
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};