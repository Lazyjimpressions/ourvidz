import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  conversation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  character_id?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant';
  content: string;
  message_type: string;
  created_at: string;
}

interface PlaygroundState {
  activeConversationId: string | null;
  isLoadingMessage: boolean;
  error: string | null;
  lastResponseMeta: any | null;
}

type PlaygroundAction = 
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_LOADING_MESSAGE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_RESPONSE_META'; payload: any | null };

const initialState: PlaygroundState = {
  activeConversationId: null,
  isLoadingMessage: false,
  error: null,
  lastResponseMeta: null,
};

const playgroundReducer = (state: PlaygroundState, action: PlaygroundAction): PlaygroundState => {
  switch (action.type) {
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'SET_LOADING_MESSAGE':
      return { ...state, isLoadingMessage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LAST_RESPONSE_META':
      return { ...state, lastResponseMeta: action.payload };
    default:
      return state;
  }
};

interface PlaygroundContextType {
  state: PlaygroundState;
  conversations: Conversation[];
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  setActiveConversation: (id: string | null) => void;
  createConversation: (title?: string, projectId?: string, conversationType?: string, characterId?: string) => Promise<string>;
  sendMessage: (content: string, options?: { characterId?: string; conversationId?: string }) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  refreshPromptCache: () => Promise<void>;
  regenerateAssistantMessage: (messageId: string, options?: { refreshTemplates?: boolean; characterId?: string }) => Promise<void>;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export const PlaygroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(playgroundReducer, initialState);

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user?.id,
  });

  // Fetch messages for active conversation
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ['messages', state.activeConversationId],
    queryFn: async () => {
      if (!state.activeConversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', state.activeConversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!state.activeConversationId,
  });

// Create conversation mutation
const createConversationMutation = useMutation({
  mutationFn: async ({ title, projectId, conversationType, characterId }: { title?: string; projectId?: string; conversationType?: string; characterId?: string }) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user?.id!,
        title: title || 'New Conversation',
        project_id: projectId || null,
        conversation_type: conversationType || (projectId ? 'story_development' : 'general'),
        character_id: characterId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Conversation;
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: data.id });
    toast.success('New conversation created');
  },
  onError: (error) => {
    console.error('Failed to create conversation:', error);
    toast.error('Failed to create conversation');
  },
});

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, characterId }: { conversationId: string; content: string; characterId?: string }) => {
      console.log('📧 PlaygroundContext sending message:', { conversationId, content, characterId });
      
      const { data, error } = await supabase.functions.invoke('playground-chat', {
        body: {
          conversation_id: conversationId,
          message: content,
          ...(characterId ? { character_id: characterId } : {}),
        },
      });

      console.log('📬 PlaygroundContext response:', { data, error });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Store latest template/tier meta for admin UI (do not refetch immediately)
      dispatch({ type: 'SET_LAST_RESPONSE_META', payload: data });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    },
    onSettled: () => {
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: false });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (state.activeConversationId === conversationId) {
        dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
      }
      toast.success('Conversation deleted');
    },
    onError: (error) => {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    },
  });

  // Update conversation title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation title updated');
    },
    onError: (error) => {
      console.error('Failed to update title:', error);
      toast.error('Failed to update title');
    },
  });

  const setActiveConversation = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

const createConversation = useCallback(async (title?: string, projectId?: string, conversationType?: string, characterId?: string): Promise<string> => {
  const result = await createConversationMutation.mutateAsync({ title, projectId, conversationType, characterId });
  return result.id;
}, [createConversationMutation]);

  const sendMessage = useCallback(async (content: string, options?: { characterId?: string; conversationId?: string }) => {
    const targetConversationId = options?.conversationId || state.activeConversationId;
    if (!targetConversationId) {
      toast.error('No active conversation');
      return;
    }

    dispatch({ type: 'SET_LOADING_MESSAGE', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    // Optimistic UI: add user message and assistant placeholder
    const conversationKey = ['messages', targetConversationId] as const;
    const nowIso = new Date().toISOString();
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    queryClient.setQueryData<Message[]>(conversationKey as any, (old: Message[] | undefined) => {
      const prev = old || [];
      return [
        ...prev,
        { id: tempUserId, conversation_id: targetConversationId, sender: 'user', content, message_type: 'text', created_at: nowIso },
        { id: tempAssistantId, conversation_id: targetConversationId, sender: 'assistant', content: '…', message_type: 'text', created_at: nowIso },
      ];
    });

    try {
      const data: any = await sendMessageMutation.mutateAsync({
        conversationId: targetConversationId,
        content,
        characterId: options?.characterId,
      });

      // Patch assistant placeholder with actual response immediately
      if (data?.response) {
        queryClient.setQueryData<Message[]>(conversationKey as any, (old: Message[] | undefined) => {
          const prev = old || [];
          const updated = prev.map((m) =>
            m.id === tempAssistantId ? { ...m, content: data.response } : m
          );
          const hasPatched = updated.some((m) => m.id === tempAssistantId && m.content === data.response);
          return hasPatched ? updated : [
            ...updated,
            { id: `assistant-${Date.now()}`, conversation_id: targetConversationId, sender: 'assistant', content: data.response, message_type: 'text', created_at: new Date().toISOString() },
          ];
        });
      }

      // Delay refetch slightly to allow DB writes to settle
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: conversationKey as any });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }, 600);
    } catch (e) {
      // Roll back optimistic assistant if request failed
      queryClient.setQueryData<Message[]>(conversationKey as any, (old: Message[] | undefined) => {
        const prev = old || [];
        return prev.filter((m) => m.id !== tempUserId && m.id !== tempAssistantId);
      });
      throw e;
    } finally {
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: false });
    }
  }, [state.activeConversationId, sendMessageMutation, queryClient]);

  const deleteConversation = useCallback(async (id: string) => {
    await deleteConversationMutation.mutateAsync(id);
  }, [deleteConversationMutation]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    await updateTitleMutation.mutateAsync({ id, title });
  }, [updateTitleMutation]);

  const refreshPromptCache = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('refresh-prompt-cache', { body: {} });
      if (error) throw error;
      console.log('✅ Prompt templates cache refreshed', data);
      toast.success('Templates refreshed');
    } catch (e) {
      console.error('Failed to refresh templates:', e);
      toast.error('Failed to refresh templates');
    }
  }, []);

  const regenerateAssistantMessage = useCallback(async (
    messageId: string,
    options?: { refreshTemplates?: boolean; characterId?: string }
  ) => {
    if (!state.activeConversationId) {
      toast.error('No active conversation');
      return;
    }

    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      toast.error('Message not found');
      return;
    }

    // Find the nearest previous user message
    let userIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userIdx = i;
        break;
      }
    }
    if (userIdx === -1) {
      toast.error('No prior user message to regenerate');
      return;
    }

    const userContent = messages[userIdx].content;

    try {
      if (options?.refreshTemplates) {
        await refreshPromptCache();
      }
      await sendMessage(userContent, { characterId: options?.characterId });
    } catch (err) {
      console.error('Failed to regenerate assistant message:', err);
      toast.error('Failed to regenerate');
    }
  }, [messages, state.activeConversationId, sendMessage, refreshPromptCache]);

  const value: PlaygroundContextType = {
    state,
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    setActiveConversation,
    createConversation,
    sendMessage,
    deleteConversation,
    updateConversationTitle,
    refreshPromptCache,
    regenerateAssistantMessage,
  };

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
};

export const usePlayground = () => {
  const context = useContext(PlaygroundContext);
  if (context === undefined) {
    throw new Error('usePlayground must be used within a PlaygroundProvider');
  }
  return context;
};