import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const ChatInterface = () => {
  const {
    state,
    messages,
    isLoadingMessages,
    sendMessage,
    createConversation,
  } = usePlayground();

  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, state.isLoadingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSubmitting || state.isLoadingMessage) return;

    let conversationId = state.activeConversationId;

    // Create new conversation if none is active
    if (!conversationId) {
      try {
        conversationId = await createConversation();
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    const message = inputMessage.trim();
    setInputMessage('');
    setIsSubmitting(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  // Empty state when no conversation is selected
  if (!state.activeConversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-8 rounded-2xl border border-gray-700 max-w-md">
          <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to Playground</h2>
          <p className="text-gray-300 mb-6">
            Start a conversation with AI to develop your stories, brainstorm ideas, or get creative assistance.
          </p>
          <Button
            onClick={() => createConversation()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start New Conversation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-blue-400 mb-4" />
            <p className="text-gray-300 text-lg mb-2">Ready to chat!</p>
            <p className="text-gray-500 text-sm">Send a message to start the conversation.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Loading indicator for AI response */}
            {state.isLoadingMessage && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-md p-4 max-w-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="min-h-[44px] max-h-32 resize-none bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
              disabled={isSubmitting || state.isLoadingMessage}
            />
          </div>
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isSubmitting || state.isLoadingMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {state.error && (
          <div className="mt-2 text-sm text-red-400 bg-red-900/20 p-2 rounded">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};