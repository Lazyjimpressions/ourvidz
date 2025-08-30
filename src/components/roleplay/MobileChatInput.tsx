import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileChatInputProps {
  onSend: (message: string) => void;
  onGenerateScene: () => void;
  isLoading: boolean;
  isMobile: boolean;
}

export const MobileChatInput: React.FC<MobileChatInputProps> = ({
  onSend,
  onGenerateScene,
  isLoading,
  isMobile
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isTouchDevice } = useMobileDetection();

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
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

  const handleGenerateScene = () => {
    if (!isLoading) {
      onGenerateScene();
    }
  };

  // Auto-focus on mobile for better UX
  useEffect(() => {
    if (isMobile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobile]);

  return (
    <div className="space-y-3">
      {/* Scene Generation Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateScene}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Scene
        </Button>
      </div>

      {/* Message Input */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className={`
              pr-12 resize-none
              ${isTouchDevice ? 'text-base' : 'text-sm'}
              bg-gray-800 border-gray-700 text-white placeholder-gray-400
              focus:border-blue-500 focus:ring-blue-500
            `}
            style={{
              minHeight: isMobile ? '48px' : '40px',
              paddingTop: isMobile ? '12px' : '8px',
              paddingBottom: isMobile ? '12px' : '8px'
            }}
          />
          
          {/* Character count indicator */}
          {message.length > 0 && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {message.length}/500
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          size={isMobile ? "default" : "sm"}
          className={`
            bg-blue-600 hover:bg-blue-700 text-white
            ${isMobile ? 'w-12 h-12' : 'w-10 h-10'}
            flex-shrink-0
          `}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      {isMobile && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage(prev => prev + ' 👋')}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            👋
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage(prev => prev + ' ❤️')}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            ❤️
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage(prev => prev + ' 😊')}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            😊
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage(prev => prev + ' 🤔')}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            🤔
          </Button>
        </div>
      )}
    </div>
  );
};
