import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConversationList } from './ConversationList';
import { PlaygroundModeSelector, type PlaygroundMode } from './PlaygroundModeSelector';
import { RoleplaySetup, type RoleplayTemplate } from './RoleplaySetup';
import { AdminTools } from './AdminTools';
import { CreativeTools } from './CreativeTools';
import { PromptCounter } from './PromptCounter';

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
  const [currentMode, setCurrentMode] = useState<PlaygroundMode>('chat');
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

  // Handle roleplay setup
  const handleStartRoleplay = async (template: RoleplayTemplate) => {
    let conversationId = state.activeConversationId;
    
    if (!conversationId) {
      conversationId = await createConversation(`Roleplay: ${template.name}`, undefined, 'roleplay');
    }

    // Build character descriptions
    const characterDescriptions = template.characters
      .map(char => `${char.name} (${char.role}): ${char.personality}`)
      .join('\n');

    // Simple system prompt - let the database template handle all directives
    const systemPrompt = `${template.systemPrompt}\n\nSCENARIO: ${template.scenario}\n\nCHARACTERS:\n${characterDescriptions}`;
    
    await sendMessage(`[System: Starting roleplay session]\n\n${systemPrompt}`);
  };

  // Handle admin tool start
  const handleStartAdminTool = async (tool: any, context: any) => {
    let conversationId = state.activeConversationId;
    
    if (!conversationId) {
      conversationId = await createConversation(`Admin: ${tool.name}`);
    }

    const systemPrompt = `${tool.systemPrompt}\n\nCONTEXT: Target Model: ${context.targetModel}, Purpose: ${context.purpose}\n\nI need help with ${tool.name.toLowerCase()}. Please start by asking me what specific assistance I need.`;
    
    await sendMessage(`[System: Starting ${tool.name}]\n\n${systemPrompt}`);
  };

  // Handle creative tool start
  const handleStartCreativeTool = async (tool: any, context: any) => {
    let conversationId = state.activeConversationId;
    
    if (!conversationId) {
      conversationId = await createConversation(`Creative: ${tool.name}`);
    }

    const systemPrompt = `${tool.systemPrompt}\n\nPROJECT: ${context.projectType}, GOAL: ${context.goal}\n\nI need help with ${tool.name.toLowerCase()}. Please start by understanding my project and goals.`;
    
    await sendMessage(`[System: Starting ${tool.name}]\n\n${systemPrompt}`);
  };

  // Auto-resize textarea with max-height constraint
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const maxHeight = window.innerWidth < 768 ? 200 : 240; // 200px mobile, 240px desktop
      
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Enable scrolling if content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [inputMessage]);

  // Empty state when no conversation is selected
  if (!state.activeConversationId) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            <h1 className="text-sm font-medium text-white">AI Playground</h1>
          </div>
          
          {/* Conversation History Panel */}
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8 p-0"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-[#111111] border-gray-800 p-0">
              <SheetHeader className="p-3 border-b border-gray-800">
                <SheetTitle className="text-white text-left text-sm">Conversations</SheetTitle>
              </SheetHeader>
              <ConversationList />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mode Selector */}
        <PlaygroundModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />

        {/* Mode-specific Setup Panels */}
        <div className="p-3 space-y-2">
          {currentMode === 'roleplay' && (
            <RoleplaySetup onStartRoleplay={handleStartRoleplay} />
          )}
          {currentMode === 'admin' && (
            <AdminTools onStartTool={handleStartAdminTool} />
          )}
          {currentMode === 'creative' && (
            <CreativeTools onStartTool={handleStartCreativeTool} />
          )}
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6 rounded-lg border border-gray-700 max-w-sm">
            <Bot className="h-8 w-8 text-blue-400 mx-auto mb-3" />
            <h2 className="text-lg font-medium text-white mb-2">Welcome to Playground</h2>
            <p className="text-gray-300 mb-4 text-sm">
              Select a mode above and configure your session, or start a general conversation.
            </p>
            <Button
              onClick={() => createConversation()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-8"
            >
              Start Conversation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-800 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-400" />
          <h1 className="text-sm font-medium text-white">AI Playground</h1>
        </div>
        
        {/* Conversation History Panel */}
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8 p-0"
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-[#111111] border-gray-800 p-0">
            <SheetHeader className="p-3 border-b border-gray-800">
              <SheetTitle className="text-white text-left text-sm">Conversations</SheetTitle>
            </SheetHeader>
            <ConversationList />
          </SheetContent>
        </Sheet>
      </div>

      {/* Mode Selector */}
      <PlaygroundModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />

      {/* Mode-specific Setup Panels */}
      <div className="p-3 space-y-2">
        {currentMode === 'roleplay' && (
          <RoleplaySetup onStartRoleplay={handleStartRoleplay} />
        )}
        {currentMode === 'admin' && (
          <AdminTools onStartTool={handleStartAdminTool} />
        )}
        {currentMode === 'creative' && (
          <CreativeTools onStartTool={handleStartCreativeTool} />
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-8 w-8 text-blue-400 mb-3" />
            <p className="text-gray-300 text-sm mb-1">Ready to chat!</p>
            <p className="text-gray-500 text-xs">Send a message to start the conversation.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Loading indicator for AI response */}
            {state.isLoadingMessage && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-gray-800 rounded-lg rounded-tl-md p-3 max-w-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-xs">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Floating Message Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-gray-800 p-3 z-50">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  className="min-h-[40px] max-h-60 resize-none bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 text-sm"
                  disabled={isSubmitting || state.isLoadingMessage}
                />
              </div>
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isSubmitting || state.isLoadingMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 p-0"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
            {inputMessage && (
              <PromptCounter 
                text={inputMessage} 
                mode={currentMode} 
                className="px-1"
              />
            )}
          </div>
        </form>
        
        {state.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded max-w-4xl mx-auto">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};