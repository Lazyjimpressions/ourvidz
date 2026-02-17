import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConversationList } from './ConversationList';
import { PlaygroundModeSelector, type PlaygroundMode } from './PlaygroundModeSelector';
import { AdminTools } from './AdminTools';
import { PromptCounter } from './PromptCounter';
import { PlaygroundSettingsPopover } from './PlaygroundSettingsPopover';
import { SystemPromptEditor } from './SystemPromptEditor';
import { CompareView } from './CompareView';
import { ImageCompareView } from './ImageCompareView';

export const ChatInterface = () => {
  const {
    state,
    messages,
    isLoadingMessages,
    sendMessage,
    createConversation,
    settings,
    updateSettings,
  } = usePlayground();

  const { isAdmin } = useAuth();

  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMode, setCurrentMode] = useState<PlaygroundMode>(() => {
    const stored = localStorage.getItem('playground-mode');
    return (stored === 'chat' || stored === 'compare' || stored === 'image_compare' || stored === 'admin') ? stored : 'chat';
  });
  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem('playground-system-prompt') || '';
  });
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

    // Create conversation on first message (deferred creation)
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
      await sendMessage(message, { conversationId, systemPromptOverride: systemPrompt || undefined });
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

  // Handle admin tool start
  const handleStartAdminTool = async (tool: any, context: any) => {
    try {
      const convId = await createConversation(`Admin: ${tool.name}`, undefined, 'admin');

      let userMessage = '';
      if (tool.id === 'prompt-builder') {
        userMessage = `[System: Prompt Builder Mode]\n\nTARGET MODEL: ${context.targetModelName || context.targetModel} (${context.targetModelCategory || 'Unknown'})\n${context.targetModelFamily ? `MODEL FAMILY: ${context.targetModelFamily}` : ''}\n${context.selectedTemplateName ? `TEMPLATE: ${context.selectedTemplateName}` : ''}\n\nPURPOSE:\n${context.purpose || 'General prompt optimization'}\n\nHelp me create effective, optimized prompts for this model.`;
      } else {
        userMessage = `I want to use the ${tool.name} tool.\nTarget Model: ${context.targetModel || 'Not specified'}\nPurpose: ${context.purpose || 'Not specified'}`;
      }

      await sendMessage(userMessage, { conversationId: convId });
    } catch (error) {
      console.error('Error starting admin tool:', error);
    }
  };

  const handleModeChange = (newMode: PlaygroundMode) => {
    setCurrentMode(newMode);
    localStorage.setItem('playground-mode', newMode);
  };

  const handleClearChat = async () => {
    try {
      await createConversation();
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const maxHeight = window.innerWidth < 768 ? 200 : 240;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [inputMessage]);

  // Compare mode renders its own view
  if (currentMode === 'compare') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-2 flex items-center justify-between">
          <h1 className="text-sm font-medium">AI Playground</h1>
          <PlaygroundSettingsPopover settings={settings} onSettingsChange={updateSettings} />
        </div>
        <PlaygroundModeSelector currentMode={currentMode} onModeChange={handleModeChange} />
        <div className="flex-1 overflow-hidden">
          <CompareView />
        </div>
      </div>
    );
  }

  // Image compare mode renders its own view
  if (currentMode === 'image_compare') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-2 flex items-center justify-between">
          <h1 className="text-sm font-medium">AI Playground</h1>
          <PlaygroundSettingsPopover settings={settings} onSettingsChange={updateSettings} />
        </div>
        <PlaygroundModeSelector currentMode={currentMode} onModeChange={handleModeChange} />
        <div className="flex-1 overflow-hidden">
          <ImageCompareView />
        </div>
      </div>
    );
  }

  // Header controls shared between empty and active states
  const headerControls = (
    <div className="flex items-center gap-1">
      <PlaygroundSettingsPopover settings={settings} onSettingsChange={updateSettings} />
      {isAdmin && state.lastResponseMeta?.content_tier && (
        <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {String(state.lastResponseMeta.content_tier).toUpperCase()}
        </span>
      )}
      {state.activeConversationId && (
        <Button variant="ghost" size="sm" onClick={handleClearChat} className="h-7 w-7 p-0" title="New chat">
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="History">
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
  );

  // Empty state
  if (!state.activeConversationId && messages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-2 flex items-center justify-between">
          <h1 className="text-sm font-medium">AI Playground</h1>
          {headerControls}
        </div>
        <PlaygroundModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

        {currentMode === 'admin' && (
          <div className="p-3">
            <AdminTools onStartTool={handleStartAdminTool} />
          </div>
        )}

        {currentMode === 'chat' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="max-w-sm space-y-3">
              <p className="text-sm text-muted-foreground">
                Start a conversation or use the System Prompt editor to customize AI behavior.
              </p>
              <Button onClick={() => createConversation()} size="sm" className="h-8">
                Start Conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium">AI Playground</h1>
          <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
          </span>
        </div>
        {headerControls}
      </div>

      <PlaygroundModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

      {/* System Prompt Editor */}
      <SystemPromptEditor
        conversationId={state.activeConversationId}
        onSystemPromptChange={(prompt) => {
          setSystemPrompt(prompt);
          localStorage.setItem('playground-system-prompt', prompt);
        }}
      />

      {/* Admin tools when no messages yet */}
      {currentMode === 'admin' && messages.length === 0 && (
        <div className="p-3 border-b border-border">
          <AdminTools onStartTool={handleStartAdminTool} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm mb-1">Ready to chat!</p>
            <p className="text-muted-foreground text-xs">Send a message to start.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} mode={currentMode} />
            ))}
            {state.isLoadingMessage && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg rounded-tl-md p-3 max-w-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
                    <span className="text-xs">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
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
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  className="min-h-[40px] max-h-60 resize-none text-sm"
                  disabled={isSubmitting || state.isLoadingMessage}
                />
              </div>
              <Button type="submit" disabled={!inputMessage.trim() || isSubmitting || state.isLoadingMessage} size="sm" className="h-8 w-8 p-0">
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
            {inputMessage && <PromptCounter text={inputMessage} mode={currentMode} className="px-1" />}
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