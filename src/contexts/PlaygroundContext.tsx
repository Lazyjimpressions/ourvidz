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
}

type PlaygroundAction = 
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_LOADING_MESSAGE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: PlaygroundState = {
  activeConversationId: null,
  isLoadingMessage: false,
  error: null,
};

const playgroundReducer = (state: PlaygroundState, action: PlaygroundAction): PlaygroundState => {
  switch (action.type) {
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'SET_LOADING_MESSAGE':
      return { ...state, isLoadingMessage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
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
  createConversation: (title?: string, projectId?: string, conversationType?: string) => Promise<string>;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
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
    mutationFn: async ({ title, projectId, conversationType }: { title?: string; projectId?: string; conversationType?: string }) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user?.id!,
          title: title || 'New Conversation',
          project_id: projectId || null,
          conversation_type: conversationType || (projectId ? 'story_development' : 'general'),
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
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      console.log('📧 PlaygroundContext sending message:', { conversationId, content });
      
      const { data, error } = await supabase.functions.invoke('playground-chat', {
        body: {
          conversation_id: conversationId,
          message: content,
        },
      });

      console.log('📬 PlaygroundContext response:', { data, error });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', state.activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

  const createConversation = useCallback(async (title?: string, projectId?: string, conversationType?: string): Promise<string> => {
    const result = await createConversationMutation.mutateAsync({ title, projectId, conversationType });
    return result.id;
  }, [createConversationMutation]);

  const sendMessage = useCallback(async (content: string) => {
    if (!state.activeConversationId) {
      toast.error('No active conversation');
      return;
    }

    dispatch({ type: 'SET_LOADING_MESSAGE', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    await sendMessageMutation.mutateAsync({
      conversationId: state.activeConversationId,
      content,
    });
  }, [state.activeConversationId, sendMessageMutation]);

  const deleteConversation = useCallback(async (id: string) => {
    await deleteConversationMutation.mutateAsync(id);
  }, [deleteConversationMutation]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    await updateTitleMutation.mutateAsync({ id, title });
  }, [updateTitleMutation]);

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