import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Smile, Camera, Dice5 } from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { cn } from '@/lib/utils';

interface MobileChatInputProps {
  onSend: (message: string) => void;
  onGenerateScene?: () => void;
  isLoading: boolean;
  isMobile: boolean;
  placeholder?: string;
  /** Character name for dynamic placeholder */
  characterName?: string;
  showEmojiTray?: boolean;
}

const QUICK_EMOJIS = ['👋', '❤️', '😊', '🤔', '😈', '🔥'];
const MAX_ROWS = 5;

export const MobileChatInput: React.FC<MobileChatInputProps> = ({
  onSend,
  onGenerateScene,
  isLoading,
  isMobile,
  placeholder,
  characterName,
  showEmojiTray = false
}) => {
  const [message, setMessage] = useState('');
  const [emojiTrayOpen, setEmojiTrayOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isTouchDevice } = useMobileDetection();

  // Dynamic placeholder with character name
  const dynamicPlaceholder = placeholder || (characterName ? `Message ${characterName}...` : 'Type your message...');

  const handleSend = useCallback(() => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
      setEmojiTrayOpen(false);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [message, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * MAX_ROWS;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  // Auto-focus on mount for mobile
  useEffect(() => {
    if (isMobile && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return (
    <div
      className="space-y-0"
      style={{
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined
      }}
    >
      {/* Action chips row */}
      {onGenerateScene && (
        <div className="flex items-center gap-1 px-1 pb-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateScene}
            disabled={isLoading}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            Scene
          </Button>
        </div>
      )}

      {/* Emoji Tray */}
      {showEmojiTray && emojiTrayOpen && isMobile && (
        <div className="flex justify-center gap-1 py-2 animate-in slide-in-from-bottom-2 duration-200">
          {QUICK_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => insertEmoji(emoji)}
              disabled={isLoading}
              className="min-w-[40px] min-h-[40px] text-lg hover:bg-accent"
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {/* Message Input Row */}
      <div className="flex items-end gap-2">
        {/* Emoji Toggle */}
        {showEmojiTray && isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEmojiTrayOpen(!emojiTrayOpen)}
            className={cn(
              "flex-shrink-0 min-w-[44px] min-h-[44px]",
              emojiTrayOpen && "bg-accent"
            )}
            aria-label="Toggle emoji tray"
          >
            <Smile className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}

        {/* Auto-grow Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={dynamicPlaceholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl border border-border bg-card px-4 py-3",
              "text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "overflow-y-auto scrollbar-thin",
              isTouchDevice ? 'text-base' : 'text-sm',
              "leading-relaxed"
            )}
            style={{
              minHeight: isMobile ? '48px' : '40px',
              maxHeight: `${(parseInt('20') || 20) * MAX_ROWS}px`
            }}
          />

          {/* Character count */}
          {message.length > 400 && (
            <div className={cn(
              "absolute bottom-1 right-3 text-xs",
              message.length > 480 ? "text-destructive" : "text-muted-foreground"
            )}>
              {message.length}/500
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          size={isMobile ? "default" : "sm"}
          className={cn(
            "bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 rounded-full",
            isMobile ? 'min-w-[48px] min-h-[48px] w-12 h-12' : 'w-10 h-10'
          )}
          aria-label="Send message"
        >
          <Send className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
        </Button>
      </div>
    </div>
  );
};
