import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile } from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { cn } from '@/lib/utils';

interface MobileChatInputProps {
  onSend: (message: string) => void;
  onGenerateScene?: () => void; // Optional - for desktop inline button
  isLoading: boolean;
  isMobile: boolean;
  placeholder?: string;
  showEmojiTray?: boolean; // Control emoji tray visibility
}

const QUICK_EMOJIS = ['👋', '❤️', '😊', '🤔', '😈', '🔥'];

export const MobileChatInput: React.FC<MobileChatInputProps> = ({
  onSend,
  onGenerateScene,
  isLoading,
  isMobile,
  placeholder = "Type your message...",
  showEmojiTray = false
}) => {
  const [message, setMessage] = useState('');
  const [emojiTrayOpen, setEmojiTrayOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isTouchDevice } = useMobileDetection();

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
      setEmojiTrayOpen(false);
      // Focus back to input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Auto-focus on mount for mobile
  useEffect(() => {
    if (isMobile && inputRef.current) {
      // Delay to avoid keyboard issues on page load
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return (
    <div
      className="space-y-2"
      style={{
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined
      }}
    >
      {/* Emoji Tray - Collapsible on mobile */}
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
        {/* Emoji Toggle - Mobile only */}
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

        {/* Input Field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "pr-12 resize-none",
              isTouchDevice ? 'text-base' : 'text-sm',
              "bg-card border-border text-foreground placeholder-muted-foreground",
              "focus:border-primary focus:ring-primary"
            )}
            style={{
              minHeight: isMobile ? '48px' : '40px',
              paddingTop: isMobile ? '12px' : '8px',
              paddingBottom: isMobile ? '12px' : '8px'
            }}
          />

          {/* Character count indicator */}
          {message.length > 400 && (
            <div className={cn(
              "absolute bottom-1 right-2 text-xs",
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
            "bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0",
            isMobile ? 'min-w-[44px] min-h-[44px] w-12 h-12' : 'w-10 h-10'
          )}
          aria-label="Send message"
        >
          <Send className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
        </Button>
      </div>
    </div>
  );
};
