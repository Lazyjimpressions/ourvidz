import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, RotateCcw, Info } from 'lucide-react';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  User,
  Bot,
  Image as ImageIcon,
  Clock,
  RefreshCw,
  AlertCircle,
  Edit,
  Loader2
} from 'lucide-react';
import { ScenePromptEditModal } from './ScenePromptEditModal';
import { QuickModificationSheet, ModificationPreset } from './QuickModificationSheet';
import { SceneDebugPanel } from './SceneDebugPanel';
import { TypewriterText } from './TypewriterText';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Character, Message, UserCharacter } from '@/types/roleplay';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { MessageActions } from './MessageActions';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessageProps {
  message: Message;
  character: Character | null;
  userCharacter?: UserCharacter | null;
  onGenerateScene: () => void;
  signedCharacterImageUrl?: string | null;
  signedUserCharacterImageUrl?: string | null;
  onRetry?: () => void;
  // Scene editing props
  conversationId?: string;
  consistencySettings?: {
    method?: string;
    reference_strength?: number;
    denoise_strength?: number;
  };
  onSceneRegenerate?: (editedPrompt: string, currentSceneImageUrl?: string, strengthOverride?: number) => void;
  contentMode?: 'sfw' | 'nsfw';
  /** Whether this is a new message that should animate (typewriter) */
  isNew?: boolean;
  /** Whether to show the avatar (false for grouped consecutive messages) */
  showAvatar?: boolean;
  /** Whether to show the sender name header */
  showHeader?: boolean;
  /** Whether to show timestamp (hidden for grouped messages unless time gap) */
  showTimestamp?: boolean;
}

/**
 * Formats message content with *action text* rendered as italics.
 * Text between asterisks becomes italic to distinguish narration from dialogue.
 */
const formatMessageContent = (content: string): React.ReactNode => {
  const parts = content.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="text-muted-foreground/80 not-italic font-light italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  character,
  userCharacter,
  onGenerateScene,
  signedCharacterImageUrl,
  signedUserCharacterImageUrl,
  onRetry,
  conversationId,
  consistencySettings,
  onSceneRegenerate,
  contentMode = 'nsfw',
  isNew = false,
  showAvatar = true,
  showHeader = true,
  showTimestamp = true
}) => {
  const { isMobile } = useMobileDetection();
  const { getSignedUrl } = useSignedImageUrls();
  const { isAdmin } = useAuth();
  const isUser = message.sender === 'user';
  const hasScene = message.metadata?.scene_generated && message.metadata?.image_url;

  const [signedCharacterImage, setSignedCharacterImage] = useState<string | null>(null);
  const [signedSceneImage, setSignedSceneImage] = useState<string | null>(null);
  const [sceneImageLoading, setSceneImageLoading] = useState(true);
  const [sceneImageError, setSceneImageError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSceneEditModal, setShowSceneEditModal] = useState(false);
  const [showQuickModSheet, setShowQuickModSheet] = useState(false);
  const [sceneImageVisible, setSceneImageVisible] = useState(false);

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
    const abortController = new AbortController();
    let isMounted = true;

    const signSceneImage = async () => {
      const imageUrl = message.metadata?.image_url;

      if (isMounted) {
        setSceneImageLoading(true);
        setSceneImageError(null);
        setSceneImageVisible(false);
      }

      if (!imageUrl) {
        if (isMounted) {
          setSignedSceneImage(null);
          setSceneImageLoading(false);
        }
        return;
      }

      if (imageUrl.startsWith('http')) {
        if (isMounted) {
          setSignedSceneImage(imageUrl);
        }
        return;
      }

      try {
        const assetLike = {
          temp_storage_path: imageUrl,
          tempStoragePath: imageUrl
        };

        const signedUrl = await WorkspaceAssetService.generateSignedUrl(assetLike);

        if (!isMounted || abortController.signal.aborted) return;

        if (signedUrl) {
          setSignedSceneImage(signedUrl);
          console.log('✅ Scene image signed via WorkspaceAssetService');
        } else {
          console.error('❌ Failed to sign scene image - no signed URL returned');
          setSceneImageError('Failed to load image');
          setSignedSceneImage(null);
          setSceneImageLoading(false);
        }
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) return;

        console.error('❌ Error signing scene image:', error);
        setSceneImageError('Failed to load image');
        setSignedSceneImage(null);
        setSceneImageLoading(false);
      }
    };

    if (hasScene) {
      signSceneImage();
    } else {
      setSignedSceneImage(null);
      setSceneImageError(null);
      setSceneImageLoading(false);
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [message.metadata?.image_url, hasScene, retryCount]);

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid time';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Invalid time';
    }
  };

  const handleDownloadImage = async () => {
    const downloadUrl = signedSceneImage || message.metadata?.image_url;
    if (!downloadUrl) return;

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `scene-${message.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('❌ Failed to download scene image:', error);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `scene-${message.id}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareScene = () => {
    const shareUrl = signedSceneImage || message.metadata?.image_url;
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handlePresetSelect = async (preset: ModificationPreset, customStrength?: number) => {
    if (!onSceneRegenerate) return;

    const actualPrompt = message.metadata?.generation_metadata?.original_scene_prompt 
      || message.metadata?.scene_prompt;
    
    if (!actualPrompt) return;

    const modifiedPrompt = `${actualPrompt}. ${preset.promptModifier}`;
    const strengthToUse = customStrength !== undefined ? customStrength : preset.strength;

    await onSceneRegenerate(
      modifiedPrompt,
      signedSceneImage || message.metadata?.image_url,
      strengthToUse
    );
  };

  const handleFreshGeneration = async () => {
    if (!onSceneRegenerate) return;

    const actualPrompt = message.metadata?.generation_metadata?.original_scene_prompt 
      || message.metadata?.scene_prompt;
    
    if (!actualPrompt) return;

    await onSceneRegenerate(actualPrompt, undefined, undefined);
  };

  // Whether to animate this message with typewriter
  const shouldAnimate = isNew && !isUser;

  return (
    <div className={cn(
      "flex group",
      isUser ? 'justify-end' : 'justify-start',
      showHeader ? "mb-4" : "mb-1" // Tighter spacing for grouped messages
    )}>
      <div className={cn(
        "flex gap-2",
        isUser ? 'flex-row-reverse' : 'flex-row',
        isMobile ? 'w-full max-w-full' : 'max-w-[75%]'
      )}>
        {/* Avatar - hidden for grouped messages, invisible placeholder keeps alignment */}
        <div className={cn(
          "flex-shrink-0",
          isUser ? 'order-2' : 'order-1'
        )}>
          <div className={cn(
            "rounded-full overflow-hidden flex items-center justify-center",
            isUser 
              ? "w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
              : "w-10 h-10 bg-muted shadow-lg ring-2 ring-border",
            !isMobile && "w-12 h-12",
            !showAvatar && "invisible"
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
                  "text-primary-foreground",
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
          {/* Message Header - hidden for grouped messages */}
          {showHeader && (
            <div className={cn(
              "flex items-center gap-2",
              isUser ? 'justify-end' : 'justify-start'
            )}>
              <span className={cn(
                "font-semibold",
                isUser ? "text-blue-400" : "text-foreground/80",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {isUser ? (userCharacter?.name || 'You') : (character?.name || 'Character')}
              </span>
              {showTimestamp && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(message.timestamp)}
                </div>
              )}
            </div>
          )}

          {/* Message Bubble with Actions */}
          <div className={cn(
            "flex items-start gap-2",
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <Card className={cn(
              "rounded-2xl shadow-md relative",
              isUser 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0' 
                : 'bg-card text-card-foreground border-border/50',
              isMobile ? 'px-4 py-3' : 'px-5 py-4',
              "max-w-full"
            )}>
              {/* Admin: Info icon for AI messages */}
              {isAdmin && !isUser && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-5 w-5 p-0 opacity-40 hover:opacity-100 group-hover:opacity-60 transition-opacity z-10"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="View admin debug info"
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80 max-h-[80vh] overflow-y-auto p-3" 
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SceneDebugPanel 
                      generationMetadata={message.metadata?.generation_metadata || message.metadata}
                      sceneData={message.metadata}
                    />
                  </PopoverContent>
                </Popover>
              )}
              
              <div className={cn(
                "whitespace-pre-wrap break-words",
                isMobile ? "text-base leading-relaxed" : "text-base leading-relaxed"
              )}>
                {shouldAnimate ? (
                  <TypewriterText
                    text={message.content}
                    speed={45}
                    renderText={(visibleText) => formatMessageContent(visibleText)}
                  />
                ) : (
                  formatMessageContent(message.content)
                )}
              </div>
              
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
              "flex-shrink-0 pt-1 flex items-center gap-1",
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

          {/* Scene Image - Edge-to-edge immersive layout */}
          {hasScene && (
            <div className={cn(
              "mt-2 w-full overflow-hidden rounded-xl",
              isMobile && "-mx-1"
            )}>
              <div className="relative group">
                {/* Skeleton loader */}
                {sceneImageLoading && (
                  <div className="w-full h-64 bg-muted animate-pulse rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {sceneImageError ? (
                  <div className="w-full h-64 bg-muted rounded-xl flex items-center justify-center flex-col gap-3">
                    <AlertCircle className="w-8 h-8 text-destructive/60" />
                    <p className="text-sm text-destructive/60">{sceneImageError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRetryCount(c => c + 1)}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                ) : signedSceneImage ? (
                  <div className="relative group/image">
                    <img
                      src={signedSceneImage}
                      alt="Generated scene"
                      className={cn(
                        "w-full h-auto object-contain rounded-xl transition-all duration-500 ease-out",
                        isMobile ? "max-h-[70vh]" : "max-h-96",
                        sceneImageLoading ? "opacity-0 h-0" : "",
                        sceneImageVisible ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
                        onSceneRegenerate && "cursor-pointer"
                      )}
                      onClick={() => {
                        if (onSceneRegenerate) {
                          setShowQuickModSheet(true);
                        }
                      }}
                      onLoad={() => {
                        setSceneImageLoading(false);
                        // Trigger fade-in animation
                        requestAnimationFrame(() => setSceneImageVisible(true));
                      }}
                      onError={(e) => {
                        console.error('❌ Scene image failed to load');
                        setSceneImageLoading(false);
                        setSceneImageError('Image failed to load');
                      }}
                    />
                    {/* Vignette gradient overlay */}
                    {sceneImageVisible && (
                      <div className="absolute inset-0 rounded-xl pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    )}
                    {/* Admin: Info icon on hover */}
                    {isAdmin && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 z-10"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="View admin debug info"
                          >
                            <Info className="w-4 h-4 text-white" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-80 max-h-[80vh] overflow-y-auto p-3" 
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SceneDebugPanel 
                            generationMetadata={message.metadata?.generation_metadata || message.metadata}
                            sceneData={message.metadata}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ) : !sceneImageLoading ? (
                  <div className="w-full h-64 bg-muted rounded-xl flex items-center justify-center flex-col gap-2">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-amber-400">Image unavailable</p>
                  </div>
                ) : null}
                
                {/* Scene Actions - Show on hover/tap */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onSceneRegenerate && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowSceneEditModal(true)}
                      className="bg-purple-600/80 hover:bg-purple-600 text-white border-0 backdrop-blur-sm"
                      title="Edit scene prompt"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
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

      {/* Scene Prompt Edit Modal */}
      {hasScene && (
        <ScenePromptEditModal
          isOpen={showSceneEditModal}
          onClose={() => setShowSceneEditModal(false)}
          sceneId={message.metadata?.scene_id}
          jobId={message.metadata?.job_id}
          conversationId={conversationId}
          characterId={character?.id}
          currentPrompt={message.metadata?.generation_metadata?.fal_prompt || message.metadata?.generation_metadata?.original_scene_prompt || message.metadata?.scene_prompt}
          consistencySettings={consistencySettings}
          currentSceneImageUrl={signedSceneImage || message.metadata?.image_url}
          onRegenerate={onSceneRegenerate}
        />
      )}

      {/* Quick Modification Sheet */}
      {hasScene && onSceneRegenerate && (
        <QuickModificationSheet
          isOpen={showQuickModSheet}
          onClose={() => setShowQuickModSheet(false)}
          onSelectPreset={handlePresetSelect}
          onCustomEdit={() => {
            setShowQuickModSheet(false);
            setShowSceneEditModal(true);
          }}
          onFreshGeneration={handleFreshGeneration}
          currentSceneImageUrl={signedSceneImage || message.metadata?.image_url}
          currentScenePrompt={message.metadata?.generation_metadata?.fal_prompt || message.metadata?.generation_metadata?.original_scene_prompt || message.metadata?.scene_prompt || ''}
          contentMode={contentMode}
        />
      )}
    </div>
  );
};
