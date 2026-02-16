import React from 'react';
import { Bot, User, Copy, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ResponseTruncation } from './ResponseTruncation';
import { usePlayground } from '@/contexts/PlaygroundContext';

interface Message {
  id: string;
  conversation_id?: string;
  sender: 'user' | 'assistant';
  content: string;
  message_type?: string;
  created_at: string;
  response_time_ms?: number;
}

interface MessageBubbleProps {
  message: Message;
  mode?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, mode = 'chat' }) => {
  const isUser = message.sender === 'user';
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
  const { regenerateAssistantMessage } = usePlayground();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleRegenerate = async () => {
    if (isUser) return;
    await regenerateAssistantMessage(message.id);
  };

  return (
    <div className={`flex items-start gap-2 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-green-600' : 'bg-blue-600'
      }`}>
        {isUser ? <User className="h-3 w-3 text-white" /> : <Bot className="h-3 w-3 text-white" />}
      </div>

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
            <ResponseTruncation content={message.content} mode={mode} />
          )}
        </div>

        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
          isUser ? 'flex-row-reverse' : ''
        }`}>
          <span className="text-xs text-muted-foreground mr-2">{timeAgo}</span>
          {!isUser && (
            <span className="text-[11px] text-muted-foreground mr-1">
              {message.content.length} chars | ~{Math.ceil(message.content.length / 4)} tokens
              {message.response_time_ms ? ` | ${(message.response_time_ms / 1000).toFixed(1)}s` : ''}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" title="Copy">
            <Copy className="h-3 w-3" />
          </Button>
          {!isUser && (
            <Button variant="ghost" size="sm" onClick={handleRegenerate} className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" title="Regenerate">
              <RefreshCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};