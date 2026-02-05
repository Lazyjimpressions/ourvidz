import React, { createContext, useContext, ReactNode, useState } from 'react';
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
  sendMessage: (...args: any[]) => Promise<void>;
  isLoading: boolean;
  state: PlaygroundState;
  isLoadingMessages: boolean;
  createConversation: (...args: any[]) => Promise<string>;
  refreshPromptCache: (...args: any[]) => Promise<void>;
  sfwMode: boolean;
  setSfwMode: (mode: boolean) => void;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  conversations: any[];
  isLoadingConversations: boolean;
  setActiveConversation: (conversation: any) => void;
  regenerateAssistantMessage: (...args: any[]) => Promise<void>;
   // Settings
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

   // Use playground settings hook
   const { settings, updateSettings } = usePlaygroundSettings();
 
   // Derive SFW mode from settings
   const sfwMode = settings.contentMode === 'sfw';
   const setSfwMode = (mode: boolean) => {
     updateSettings({ contentMode: mode ? 'sfw' : 'nsfw' });
  };

   const sendMessage = async (messageText: string, options?: { conversationId?: string; characterId?: string }) => {
     const conversationId = options?.conversationId || state.activeConversationId;
     if (!conversationId) {
       console.error('No active conversation');
       return;
     }
 
     // Add user message to UI immediately
     const userMessage = {
       id: `temp-${Date.now()}`,
       content: messageText,
       sender: 'user',
       created_at: new Date().toISOString(),
     };
     setMessages(prev => [...prev, userMessage]);
     setState(prev => ({ ...prev, isLoadingMessage: true, error: null }));
 
     try {
       // Determine which edge function to use based on character selection
       const hasCharacter = !!(state.selectedCharacter?.id || options?.characterId);
       const edgeFunction = hasCharacter ? 'roleplay-chat' : 'playground-chat';
       
       console.log(`🔀 Routing to ${edgeFunction} (hasCharacter: ${hasCharacter})`);
       
       const { data, error } = await supabase.functions.invoke(edgeFunction, {
         body: {
           message: messageText,
           conversation_id: conversationId,
           character_id: state.selectedCharacter?.id || options?.characterId || null,
           // Use OpenRouter for admin/general chats, chat_worker for roleplay
           model_provider: hasCharacter ? 'chat_worker' : 'openrouter',
           model_variant: settings.chatModel,
           memory_tier: 'conversation',
           content_tier: settings.contentMode,
           prompt_template_id: settings.promptTemplateId || undefined,
         },
       });
 
       if (error) throw error;
 
       if (data?.success && data?.response) {
         const assistantMessage = {
           id: data.message_id || `msg-${Date.now()}`,
           content: data.response,
           sender: 'assistant',
           created_at: new Date().toISOString(),
         };
         setMessages(prev => [...prev, assistantMessage]);
         setState(prev => ({
           ...prev,
           lastResponseMeta: {
             model_used: data.model_used,
             content_tier: settings.contentMode,
             template_meta: { origin: data.prompt_template_name || 'auto' },
             model_provider: data.model_provider,
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
       return data.id;
     } catch (error) {
       console.error('Failed to create conversation:', error);
       throw error;
     }
  };

  const refreshPromptCache = async (...args: any[]) => {
     try {
       await supabase.functions.invoke('refresh-prompt-cache', {});
       console.log('Prompt cache refreshed');
     } catch (error) {
       console.error('Failed to refresh prompt cache:', error);
     }
  };

  const deleteConversation = async (id: string) => {
     try {
       const { error } = await supabase
         .from('conversations')
         .delete()
         .eq('id', id);
       if (error) throw error;
       setConversations(prev => prev.filter(c => c.id !== id));
       if (state.activeConversationId === id) {
         setState(prev => ({ ...prev, activeConversation: null, activeConversationId: null }));
         setMessages([]);
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
     setState(prev => ({
       ...prev,
       activeConversation: conversation,
       activeConversationId: conversation?.id || null,
     }));
  };

  const regenerateAssistantMessage = async (...args: any[]) => {
    console.warn('regenerateAssistantMessage: stub implementation', args);
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
