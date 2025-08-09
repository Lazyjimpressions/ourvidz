import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageSquare, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConversationList } from './ConversationList';
import { PlaygroundModeSelector, type PlaygroundMode } from './PlaygroundModeSelector';
import { RoleplaySetup, type RoleplayTemplate } from './RoleplaySetup';
import { AdminTools } from './AdminTools';
import { CreativeTools } from './CreativeTools';
import { PromptCounter } from './PromptCounter';
import { CharacterDetailsPanel } from './CharacterDetailsPanel';

export const ChatInterface = () => {
  const {
    state,
    messages,
    isLoadingMessages,
    sendMessage,
    createConversation,
    refreshPromptCache,
  } = usePlayground();

  const { isAdmin } = useAuth();

  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMode, setCurrentMode] = useState<PlaygroundMode>('chat');
  const [currentRoleplayTemplate, setCurrentRoleplayTemplate] = useState<RoleplayTemplate | null>(null);
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

    setCurrentRoleplayTemplate(template);

    // Build comprehensive character descriptions using ALL character data
    const characterDescriptions = template.characters
      .map(char => {
        const parts = [
          `${char.name} (${char.role})`,
          `Personality: ${char.personality}`,
          char.background && `Background: ${char.background}`,
          char.speakingStyle && `Speaking Style: ${char.speakingStyle}`,
          char.visualDescription && `Appearance: ${char.visualDescription}`,
          char.relationships && `Relationships: ${char.relationships}`,
          char.goals && `Goals: ${char.goals}`,
          char.quirks && `Quirks: ${char.quirks}`,
        ].filter(Boolean);
        return parts.join('\n');
      })
      .join('\n\n');

    // Pass comprehensive character data and scenario
    const message = `[System: Starting roleplay session]

SCENARIO: ${template.scenario}

CHARACTERS:
${characterDescriptions}

Begin the roleplay naturally, embodying the character fully with all their traits, speaking style, and background.`;
    
    await sendMessage(message);
  };

  // Handle admin tool start
  const handleStartAdminTool = async (tool: any, context: any) => {
    try {
      await createConversation(`Admin: ${tool.name}`, undefined, 'admin');

      const userMessage = `I want to use the ${tool.name} tool.
Target Model: ${context.targetModel || 'Not specified'}
Purpose: ${context.purpose || 'Not specified'}

Please help me with this admin task.`;

      await sendMessage(userMessage);
    } catch (error) {
      console.error('Error starting admin tool:', error);
    }
  };

  // Handle creative tool start
  const handleStartCreativeTool = async (tool: any, context: any) => {
    try {
      await createConversation(`Creative: ${tool.name}`, undefined, 'creative');

      const userMessage = `I want to use the ${tool.name} tool for creative development.
Project Type: ${context.projectType || 'Not specified'}
Goal: ${context.goal || 'Not specified'}

Please help me with this creative project.`;

      await sendMessage(userMessage);
    } catch (error) {
      console.error('Error starting creative tool:', error);
    }
  };

  // Handle mode switching - create new conversation
  const handleModeChange = async (newMode: PlaygroundMode) => {
    setCurrentMode(newMode);
    
    // Only create new conversation if we're switching from a different mode
    if (state.activeConversationId && newMode !== currentMode) {
      try {
        const conversationTypes = {
          chat: 'general',
          roleplay: 'roleplay',
          admin: 'admin',
          creative: 'creative'
        };
        
        await createConversation(
          `${newMode.charAt(0).toUpperCase() + newMode.slice(1)} Chat`,
          undefined,
          conversationTypes[newMode]
        );
      } catch (error) {
        console.error('Error creating new conversation:', error);
      }
    }
  };

  // Clear current chat
  const handleClearChat = async () => {
    if (state.activeConversationId) {
      try {
        const conversationTypes = {
          chat: 'general',
          roleplay: 'roleplay', 
          admin: 'admin',
          creative: 'creative'
        };
        
        await createConversation(
          `${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Chat`,
          undefined,
          conversationTypes[currentMode]
        );
      } catch (error) {
        console.error('Error clearing chat:', error);
      }
    }
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
        <div className="border-b border-border p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium">AI Playground</h1>
          </div>
          
          {/* Conversation History Panel */}
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-background border-border p-0">
              <SheetHeader className="p-3 border-b border-border">
                <SheetTitle className="text-left text-sm">Conversations</SheetTitle>
              </SheetHeader>
              <ConversationList />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mode Selector */}
        <PlaygroundModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

      {/* Mode-specific Setup Panels - Only show when not in an active conversation */}
      {!state.activeConversationId && (
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
      )}

        {/* Empty state content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-6 rounded-lg border border-border max-w-sm">
            <h2 className="text-lg font-medium mb-2">Welcome to Playground</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Select a mode above and configure your session, or start a general conversation.
            </p>
            <Button
              onClick={() => createConversation()}
              size="sm"
              className="h-8"
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
      <div className="border-b border-border p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium">AI Playground</h1>
          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
            {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Admin: Refresh Templates */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPromptCache}
              className="h-7 w-7 p-0"
              title="Refresh templates"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
          )}

          {/* Character Details Button - only show in roleplay mode with active template */}
          {currentMode === 'roleplay' && currentRoleplayTemplate && (
            <CharacterDetailsPanel 
              template={currentRoleplayTemplate}
              onUpdateTemplate={setCurrentRoleplayTemplate}
            />
          )}
          
          {/* Clear Chat Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearChat}
            className="h-7 w-7 p-0"
            title="Clear chat"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          {/* Conversation History Panel */}
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0"
                title="Conversation history"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-background border-border p-0">
              <SheetHeader className="p-3 border-b border-border">
                <SheetTitle className="text-left text-sm">Conversations</SheetTitle>
              </SheetHeader>
              <ConversationList />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mode Selector */}
      <PlaygroundModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

      {/* Mode-specific Setup Panels - Hide when actively chatting */}
      {messages.length === 0 && (
        <div className="p-3 space-y-2 border-b border-border">
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
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm mb-1">Ready to chat!</p>
            <p className="text-muted-foreground text-xs">Send a message to start the conversation.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                mode={currentMode}
                roleplayTemplate={currentRoleplayTemplate}
              />
            ))}
            
            {/* Loading indicator for AI response */}
            {state.isLoadingMessage && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg rounded-tl-md p-3 max-w-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent"></div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 z-50">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Type your ${currentMode} message... (Enter to send, Shift+Enter for new line)`}
                  className="min-h-[40px] max-h-60 resize-none text-sm"
                  disabled={isSubmitting || state.isLoadingMessage}
                />
              </div>
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isSubmitting || state.isLoadingMessage}
                size="sm"
                className="h-8 w-8 p-0"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-foreground border-t-transparent" />
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
          <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded max-w-4xl mx-auto">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};