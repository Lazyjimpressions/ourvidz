import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlaygroundSettings, PlaygroundSettings } from '@/hooks/usePlaygroundSettings';

interface PlaygroundState {
  activeConversation: any;
  activeConversationId: string | null;
  selectedCharacter: any;
  isLoadingMessage: boolean;
  lastResponseMeta: any;
  error: string | null;
}

interface PlaygroundContextType {
  messages: any[];
  sendMessage: (message: string, options?: { conversationId?: string; characterId?: string; systemPromptOverride?: string; participants?: any[] }) => Promise<void>;
  isLoading: boolean;
  state: PlaygroundState;
  isLoadingMessages: boolean;
  createConversation: (title?: string, characterId?: string, conversationType?: string, ...args: any[]) => Promise<string>;
  refreshPromptCache: () => Promise<void>;
  sfwMode: boolean;
  setSfwMode: (mode: boolean) => void;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  conversations: any[];
  isLoadingConversations: boolean;
  setActiveConversation: (conversation: any) => void;
  regenerateAssistantMessage: (...args: any[]) => Promise<void>;
  settings: PlaygroundSettings;
  updateSettings: (updates: Partial<PlaygroundSettings>) => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export const PlaygroundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<PlaygroundState>({
    activeConversation: null,
    activeConversationId: null,
    selectedCharacter: null,
    isLoadingMessage: false,
    lastResponseMeta: null,
    error: null,
  });
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const { settings, updateSettings } = usePlaygroundSettings();

  const sfwMode = settings.contentMode === 'sfw';
  const setSfwMode = (mode: boolean) => {
    updateSettings({ contentMode: mode ? 'sfw' : 'nsfw' });
  };

  // Load conversations on mount + restore persisted conversation
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setIsLoadingConversations(true);
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .in('conversation_type', ['general', 'admin', 'creative'])
          .order('updated_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setConversations(data);

          // Restore persisted active conversation
          const storedConvId = localStorage.getItem('playground-active-conversation');
          if (storedConvId) {
            const conv = data.find(c => c.id === storedConvId);
            if (conv) {
              setState(prev => ({
                ...prev,
                activeConversation: conv,
                activeConversationId: conv.id,
              }));
              loadMessages(conv.id);
            } else {
              localStorage.removeItem('playground-active-conversation');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, []);

  // Load messages when active conversation changes
  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const sendMessage = async (messageText: string, options?: { conversationId?: string; characterId?: string; systemPromptOverride?: string; participants?: any[] }) => {
    const conversationId = options?.conversationId || state.activeConversationId;
    if (!conversationId) {
      console.error('No active conversation');
      return;
    }

    const userMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      sender: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setState(prev => ({ ...prev, isLoadingMessage: true, error: null }));

    try {
      const hasCharacter = !!(state.selectedCharacter?.id || options?.characterId);
      const edgeFunction = hasCharacter ? 'roleplay-chat' : 'playground-chat';

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: {
          message: messageText,
          conversation_id: conversationId,
          character_id: state.selectedCharacter?.id || options?.characterId || null,
          model_provider: settings.chatModel || 'openrouter',
          model_variant: settings.chatModel,
          memory_tier: 'conversation',
          content_tier: settings.contentMode,
          prompt_template_id: settings.promptTemplateId || undefined,
          system_prompt_override: options?.systemPromptOverride || undefined,
        },
      });

      if (error) throw error;

      if (data?.success && data?.response) {
        const assistantMessage = {
          id: data.message_id || `msg-${Date.now()}`,
          content: data.response,
          sender: 'assistant',
          created_at: new Date().toISOString(),
          response_time_ms: data.generation_time ? Math.round(data.generation_time * 1000) : undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setState(prev => ({
          ...prev,
          lastResponseMeta: {
            model_used: data.model_used,
            content_tier: settings.contentMode,
            template_meta: { origin: data.prompt_template_name || 'auto' },
            model_provider: data.model_provider,
            generation_time: data.generation_time,
          },
        }));
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
    } finally {
      setState(prev => ({ ...prev, isLoadingMessage: false }));
    }
  };

  const createConversation = async (
    title?: string,
    characterId?: string,
    conversationType?: string
  ): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title || 'New Playground Chat',
          conversation_type: conversationType || 'general',
          character_id: characterId || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        activeConversation: data,
        activeConversationId: data.id,
      }));
      setMessages([]);
      // Add to conversation list
      setConversations(prev => [data, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  };

  const refreshPromptCache = async () => {
    try {
      await supabase.functions.invoke('refresh-prompt-cache', {});
      console.log('Prompt cache refreshed');
    } catch (error) {
      console.error('Failed to refresh prompt cache:', error);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');
      await (await import('@/lib/deleteConversation')).deleteConversationFull(id, user.id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (state.activeConversationId === id) {
        setState(prev => ({ ...prev, activeConversation: null, activeConversationId: null }));
        setMessages([]);
        localStorage.removeItem('playground-active-conversation');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const updateConversationTitle = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);
      if (error) throw error;
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    } catch (error) {
      console.error('Failed to update conversation title:', error);
    }
  };

  const setActiveConversation = (conversation: any) => {
    const convId = typeof conversation === 'string' ? conversation : conversation?.id;
    const convObj = typeof conversation === 'string'
      ? conversations.find(c => c.id === conversation) || { id: conversation }
      : conversation;

    setState(prev => ({
      ...prev,
      activeConversation: convObj,
      activeConversationId: convId || null,
    }));

    // Persist to localStorage
    if (convId) {
      localStorage.setItem('playground-active-conversation', convId);
      loadMessages(convId);
    } else {
      localStorage.removeItem('playground-active-conversation');
    }
  };

  const regenerateAssistantMessage = async (messageId: string, _opts?: any) => {
    // Find the message to regenerate
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex < 0) return;

    // Find the preceding user message
    let userMsg: any = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userMsg = messages[i];
        break;
      }
    }
    if (!userMsg) return;

    // Remove the assistant message from local state
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Re-send the user message
    await sendMessage(userMsg.content, { conversationId: state.activeConversationId || undefined });
  };

  const value: PlaygroundContextType = {
    messages,
    sendMessage,
    isLoading,
    state,
    isLoadingMessages,
    createConversation,
    refreshPromptCache,
    sfwMode,
    setSfwMode,
    deleteConversation,
    updateConversationTitle,
    conversations,
    isLoadingConversations,
    setActiveConversation,
    regenerateAssistantMessage,
    settings,
    updateSettings,
  };

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
};

export const usePlayground = () => {
  const context = useContext(PlaygroundContext);
  if (!context) {
    throw new Error('usePlayground must be used within a PlaygroundProvider');
  }
  return context;
};