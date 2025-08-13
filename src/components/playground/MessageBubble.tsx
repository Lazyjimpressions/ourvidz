import React, { useState } from 'react';
import { Bot, User, Copy, RotateCw, RefreshCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ResponseTruncation } from './ResponseTruncation';

import { InlineImageDisplay } from './InlineImageDisplay';
import { ImageLightbox } from './ImageLightbox';
import { useGeneratedMedia } from '@/contexts/GeneratedMediaContext';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant';
  content: string;
  message_type: string;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
  mode?: string;
  roleplayTemplate?: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, mode = 'chat', roleplayTemplate }) => {
  const isUser = message.sender === 'user';
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
  
  // Use message ID as key for persistent storage
  const storageKey = `generated-image-${message.id}`;
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${storageKey}-id`) || null;
    }
    return null;
  });
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${storageKey}-url`) || null;
    }
    return null;
  });
  const [generatedImageBucket, setGeneratedImageBucket] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${storageKey}-bucket`) || null;
    }
    return null;
  });
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Generated media context for stable persistence keyed by conversation + message content
  const { getEntry, setPending, setReady } = useGeneratedMedia();
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  };
  const stableKey = `${message.conversation_id}:${hash(message.content)}`;
  const mediaEntry = getEntry(stableKey);
  const { generateSceneImage, isGenerating } = useSceneGeneration();
  const { regenerateAssistantMessage, refreshPromptCache } = usePlayground();
  const { isAdmin } = useAuth();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleRegenerate = async () => {
    if (isUser) return;
    try {
      // Mark pending in UI
      setPending(stableKey);

      // Listen for generation completion to capture asset
      const handleCompletion = (event: CustomEvent) => {
        if (event.detail?.assetId || event.detail?.imageId) {
          const assetId = event.detail.assetId || event.detail.imageId;
          const imageUrl = event.detail.imageUrl || null;
          const bucket = event.detail.bucket || null;

          setGeneratedImageId(assetId);
          setGeneratedImageUrl(imageUrl);
          setGeneratedImageBucket(bucket);
          setReady(stableKey, { assetId, imageUrl, bucket });

          if (typeof window !== 'undefined') {
            localStorage.setItem(`${storageKey}-id`, assetId);
            if (imageUrl) localStorage.setItem(`${storageKey}-url`, imageUrl);
            if (bucket) localStorage.setItem(`${storageKey}-bucket`, bucket);
          }
        }
        window.removeEventListener('generation-completed', handleCompletion as EventListener);
      };

      // Reset and attach listener
      window.removeEventListener('generation-completed', handleCompletion as EventListener);
      window.addEventListener('generation-completed', handleCompletion as EventListener);

      await generateSceneImage(message.content, roleplayTemplate, {
        quality: 'high',
        style: 'lustify',
        useCharacterReference: false
      });
    } catch (error) {
      console.error('❌ Regeneration failed:', error);
      toast.error('Failed to start regeneration');
    }
  };

  const handleRegenAssistant = async () => {
    if (isUser) return;
    await regenerateAssistantMessage(message.id);
  };

  const handleRegenAssistantFresh = async () => {
    if (isUser) return;
    await regenerateAssistantMessage(message.id, { refreshTemplates: true });
  };

  return (
    <div className={`flex items-start gap-2 group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-green-600' 
          : 'bg-blue-600'
      }`}>
        {isUser ? (
          <User className="h-3 w-3 text-white" />
        ) : (
          <Bot className="h-3 w-3 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 w-full ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-lg p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted text-foreground rounded-tl-md'
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed max-w-none">
              {message.content}
            </div>
          ) : (
            <div className={`${
              message.content.includes('**Narrator:**') || message.content.startsWith('**Narrator:**')
                ? 'border-l-4 border-purple-500 pl-3 bg-purple-50/50 dark:bg-purple-950/30'
                : ''
            }`}>
              <ResponseTruncation 
                content={message.content} 
                mode={mode}
              />
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
          isUser ? 'flex-row-reverse' : ''
        }`}>
          <span className="text-xs text-muted-foreground mr-2">{timeAgo}</span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            title="Copy message"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {!isUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenAssistant}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                title="Regenerate AI reply"
              >
                <RefreshCcw className="h-3 w-3" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenAssistantFresh}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  title="Regenerate with fresh templates"
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                title="Generate scene image"
              >
                <RotateCw className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>


        {/* Inline Image Display */}
        {mediaEntry?.status === 'pending' && (
          <Card className="mt-2 p-3 max-w-xs bg-muted/30">
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-xs text-muted-foreground">Generating image...</span>
            </div>
          </Card>
        )}

        {(mediaEntry?.status === 'ready' && mediaEntry.assetId) ? (
          <div className="mt-2">
            <InlineImageDisplay
              assetId={mediaEntry.assetId}
              imageUrl={mediaEntry.imageUrl || undefined}
              bucket={mediaEntry.bucket || undefined}
              onExpand={setLightboxImageUrl}
            />
          </div>
        ) : (
          generatedImageId && (
            <div className="mt-2">
              <InlineImageDisplay
                assetId={generatedImageId}
                imageUrl={generatedImageUrl || undefined}
                bucket={generatedImageBucket || undefined}
                onExpand={setLightboxImageUrl}
              />
            </div>
          )
        )}

        {/* Image Lightbox */}
        <ImageLightbox
          imageUrl={lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      </div>
    </div>
  );
};