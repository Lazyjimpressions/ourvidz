import React from 'react';
import { Bot, User, Copy, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleRegenerate = () => {
    // TODO: Implement regenerate functionality
    toast.info('Regenerate feature coming soon');
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
      <div className={`flex-1 w-full sm:max-w-[85%] md:max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-lg p-3 ${
          isUser 
            ? 'bg-green-600 text-white rounded-tr-md'
            : 'bg-gray-800 text-white rounded-tl-md'
        }`}>
          <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed max-w-none">
            {message.content}
          </div>
        </div>

        {/* Message Actions */}
        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
          isUser ? 'flex-row-reverse' : ''
        }`}>
          <span className="text-xs text-gray-500 mr-2">{timeAgo}</span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-5 w-5 p-0 text-gray-400 hover:text-white"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="h-5 w-5 p-0 text-gray-400 hover:text-white"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};