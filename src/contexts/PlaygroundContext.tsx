import React, { createContext, useContext, ReactNode, useState } from 'react';

// Stub context for playground/roleplay functionality
// This is a minimal implementation to prevent import errors
// The actual playground logic can be implemented separately if needed

interface PlaygroundState {
  activeConversation: any;
  activeConversationId: string | null;
  selectedCharacter: any;
  isLoadingMessage: boolean;
  lastResponseMeta: any;
  error: string | null;
}

interface PlaygroundContextType {
  // Add minimal interface properties as needed by playground components
  messages: any[];
  sendMessage: (...args: any[]) => Promise<void>;
  isLoading: boolean;
  // Additional properties expected by components
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
    error: null
  });
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sfwMode, setSfwMode] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const sendMessage = async (...args: any[]) => {
    console.warn('PlaygroundProvider: This is a stub implementation.', args);
    setIsLoading(true);
    // Simulate async operation
    setTimeout(() => {
      const message = args[0];
      setMessages(prev => [...prev, { text: typeof message === 'string' ? message : message?.text || 'message', type: 'user' }]);
      setIsLoading(false);
    }, 1000);
  };

  const createConversation = async (...args: any[]): Promise<string> => {
    console.warn('createConversation: stub implementation', args);
    return 'mock-conversation-id';
  };

  const refreshPromptCache = async (...args: any[]) => {
    console.warn('refreshPromptCache: stub implementation', args);
  };

  const deleteConversation = async (id: string) => {
    console.warn('deleteConversation: stub implementation');
  };

  const updateConversationTitle = async (id: string, title: string) => {
    console.warn('updateConversationTitle: stub implementation');
  };

  const setActiveConversation = (conversation: any) => {
    setState(prev => ({ ...prev, activeConversation: conversation }));
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
    regenerateAssistantMessage
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
