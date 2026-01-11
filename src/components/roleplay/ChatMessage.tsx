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
  Edit
} from 'lucide-react';
import { ScenePromptEditModal } from './ScenePromptEditModal';
import { QuickModificationSheet, ModificationPreset } from './QuickModificationSheet';
import { SceneDebugPanel } from './SceneDebugPanel';
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
}

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
  contentMode = 'nsfw'
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
  // Uses AbortController to prevent state updates on unmounted component
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const signSceneImage = async () => {
      const imageUrl = message.metadata?.image_url;

      // Reset states when URL changes
      if (isMounted) {
        setSceneImageLoading(true);
        setSceneImageError(null);
      }

      if (!imageUrl) {
        if (isMounted) {
          setSignedSceneImage(null);
          setSceneImageLoading(false);
        }
        return;
      }

      // If it's already a full HTTP URL, use it directly
      if (imageUrl.startsWith('http')) {
        if (isMounted) {
          setSignedSceneImage(imageUrl);
          // Don't set loading false here - let image onLoad handle it
        }
        return;
      }

      try {
        // Create asset-like object for signing
        // WorkspaceAssetService.generateSignedUrl handles path normalization internally
        const assetLike = {
          temp_storage_path: imageUrl,
          tempStoragePath: imageUrl
        };

        const signedUrl = await WorkspaceAssetService.generateSignedUrl(assetLike);

        // Check if component is still mounted and request wasn't aborted
        if (!isMounted || abortController.signal.aborted) return;

        if (signedUrl) {
          setSignedSceneImage(signedUrl);
          console.log('✅ Scene image signed via WorkspaceAssetService');
        } else {
          // Don't fallback to unsigned URL - show error state instead
          console.error('❌ Failed to sign scene image - no signed URL returned');
          setSceneImageError('Failed to load image');
          setSignedSceneImage(null);
          setSceneImageLoading(false);
        }
      } catch (error) {
        // Check if component is still mounted
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

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [message.metadata?.image_url, hasScene, retryCount]);

  // Format timestamp as relative time (e.g., "just now", "2 mins ago")
  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);

      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Invalid time';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) {
        return 'just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays === 1) {
        return 'yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('Error formatting time:', error, 'Timestamp:', timestamp);
      return 'Invalid time';
    }
  };

  const handleDownloadImage = async () => {
    // Use signed URL for download, not the unsigned storage path
    const downloadUrl = signedSceneImage || message.metadata?.image_url;
    if (!downloadUrl) return;

    try {
      // Fetch the image as a blob to ensure proper download
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

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
      console.log('✅ Scene image downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download scene image:', error);
      // Fallback: try direct link download (may not work for signed URLs)
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
    // Share the signed URL so it's actually accessible
    const shareUrl = signedSceneImage || message.metadata?.image_url;
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      console.log('✅ Scene image URL copied to clipboard');
    }
  };

  // Handle preset selection from QuickModificationSheet
  const handlePresetSelect = async (preset: ModificationPreset, customStrength?: number) => {
    if (!onSceneRegenerate) return;

    // ✅ FIX: Get actual prompt used for generation (original_scene_prompt from metadata or scene_prompt)
    const actualPrompt = message.metadata?.generation_metadata?.original_scene_prompt 
      || message.metadata?.scene_prompt;
    
    if (!actualPrompt) {
      console.warn('⚠️ No scene prompt found in metadata');
      return;
    }

    // Combine original scene prompt with preset modifier (which already includes continuity phrase)
    const modifiedPrompt = `${actualPrompt}. ${preset.promptModifier}`;
    // ✅ FIX: Use customStrength from slider if provided, otherwise use preset strength
    const strengthToUse = customStrength !== undefined ? customStrength : preset.strength;

    // Call regenerate with current scene image (I2I mode) and strength
    await onSceneRegenerate(
      modifiedPrompt,
      signedSceneImage || message.metadata?.image_url,
      strengthToUse
    );
  };

  // Handle fresh generation (T2I from character reference)
  const handleFreshGeneration = async () => {
    if (!onSceneRegenerate) return;

    // ✅ FIX: Get actual prompt used for generation
    const actualPrompt = message.metadata?.generation_metadata?.original_scene_prompt 
      || message.metadata?.scene_prompt;
    
    if (!actualPrompt) {
      console.warn('⚠️ No scene prompt found in metadata');
      return;
    }

    // Call regenerate WITHOUT current scene image (triggers T2I mode)
    await onSceneRegenerate(
      actualPrompt,
      undefined,  // No image = T2I mode
      undefined   // No strength needed for T2I
    );
  };

  return (
    <div className={cn(
      "flex group",
      isUser ? 'justify-end' : 'justify-start',
      "mb-4"
    )}>
      <div className={cn(
        "flex gap-2",
        isUser ? 'flex-row-reverse' : 'flex-row',
        isMobile ? 'w-full max-w-full' : 'max-w-[75%]'
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
              {formatRelativeTime(message.timestamp)}
            </div>
          </div>

          {/* Message Bubble with Actions */}
          <div className={cn(
            "flex items-start gap-2",
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <Card className={cn(
              "rounded-2xl shadow-lg relative",
              isUser 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0' 
                : 'bg-gray-800 text-white border-gray-700',
              isMobile ? 'px-4 py-3' : 'px-5 py-4',
              "max-w-full"
            )}>
              {/* ✅ ADMIN: Info icon for AI messages */}
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
              
              <p className={cn(
                "whitespace-pre-wrap break-words",
                isMobile ? "text-base leading-relaxed" : "text-base leading-relaxed"
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

          {/* Scene Image - Optimized for mobile full-width */}
          {hasScene && (
            <div className={cn(
              "mt-3 w-full",
              isMobile && "-mx-1" // Negative margin to extend to edges on mobile
            )}>
              <Card className="overflow-hidden border-gray-700 bg-gray-900 rounded-xl shadow-xl">
                <div className="relative group">
                  {/* Skeleton loader */}
                  {sceneImageLoading && (
                    <div className="w-full h-64 bg-gray-800 animate-pulse rounded-t-xl flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  {sceneImageError ? (
                    // Error state with retry option
                    <div className="w-full h-64 bg-gray-800 rounded-t-xl flex items-center justify-center flex-col gap-3">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                      <p className="text-sm text-red-400">{sceneImageError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Increment retry count to trigger useEffect re-run
                          setRetryCount(c => c + 1);
                        }}
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
                          "w-full h-auto object-contain rounded-t-xl transition-opacity duration-300",
                          isMobile ? "max-h-[60vh]" : "max-h-96",
                          sceneImageLoading ? "opacity-0 h-0" : "opacity-100",
                          onSceneRegenerate && "cursor-pointer"
                        )}
                        onClick={() => {
                          if (onSceneRegenerate) {
                            setShowQuickModSheet(true);
                          }
                        }}
                        onLoad={() => {
                          setSceneImageLoading(false);
                          console.log('✅ Scene image loaded successfully');
                        }}
                        onError={(e) => {
                          console.error('❌ Scene image failed to load:', {
                            src: signedSceneImage?.substring(0, 100),
                            error: e
                          });
                          setSceneImageLoading(false);
                          setSceneImageError('Image failed to load');
                        }}
                      />
                      {/* ✅ ADMIN: Info icon on hover for admin users */}
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
                    // No image and not loading - likely an error we haven't caught
                    <div className="w-full h-64 bg-gray-800 rounded-t-xl flex items-center justify-center flex-col gap-2">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <p className="text-xs text-amber-400">Image unavailable</p>
                    </div>
                  ) : null}
                  
                  {/* Scene Actions - Show on hover */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Edit button for scene modification */}
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

      {/* Scene Prompt Edit Modal */}
      {hasScene && (
        <ScenePromptEditModal
          isOpen={showSceneEditModal}
          onClose={() => setShowSceneEditModal(false)}
          sceneId={message.metadata?.scene_id}
          jobId={message.metadata?.job_id}
          conversationId={conversationId}
          characterId={character?.id}
          currentPrompt={message.metadata?.generation_metadata?.original_scene_prompt || message.metadata?.scene_prompt}
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
          currentScenePrompt={message.metadata?.generation_metadata?.original_scene_prompt || message.metadata?.scene_prompt || ''}
          contentMode={contentMode}
        />
      )}
    </div>
  );
};