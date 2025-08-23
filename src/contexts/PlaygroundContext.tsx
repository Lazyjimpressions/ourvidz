import React, { createContext, useContext, ReactNode, useState } from 'react';

// Stub context for playground/roleplay functionality
// This is a minimal implementation to prevent import errors
// The actual playground logic can be implemented separately if needed

interface PlaygroundContextType {
  // Add minimal interface properties as needed by playground components
  messages: any[];
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export const PlaygroundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string) => {
    console.warn('PlaygroundProvider: This is a stub implementation.');
    setIsLoading(true);
    // Simulate async operation
    setTimeout(() => {
      setMessages(prev => [...prev, { text: message, type: 'user' }]);
      setIsLoading(false);
    }, 1000);
  };

  const value: PlaygroundContextType = {
    messages,
    sendMessage,
    isLoading
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
