import React, { createContext, useContext, ReactNode } from 'react';

// Stub context for playground/roleplay functionality
// This is a minimal implementation to prevent import errors
// The actual generation logic is now handled by useLibraryFirstWorkspace

interface GeneratedMediaContextType {
  isGenerating: boolean;
  generateContent: (prompt: string, options?: any) => Promise<void>;
  currentJob: any;
  // Additional properties expected by components
  getEntry: (id: string) => any;
  setPending: (id: string) => void;
  setReady: (id: string, data?: any) => void;
}

const GeneratedMediaContext = createContext<GeneratedMediaContextType | undefined>(undefined);

export const GeneratedMediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value: GeneratedMediaContextType = {
    isGenerating: false,
    generateContent: async () => {
      console.warn('GeneratedMediaProvider: This is a stub implementation. Use useLibraryFirstWorkspace for actual generation.');
    },
    currentJob: null,
    getEntry: (id: string) => {
      console.warn('getEntry: stub implementation');
      return null;
    },
    setPending: (id: string) => {
      console.warn('setPending: stub implementation');
    },
    setReady: (id: string, data?: any) => {
      console.warn('setReady: stub implementation', id, data);
    }
  };

  return (
    <GeneratedMediaContext.Provider value={value}>
      {children}
    </GeneratedMediaContext.Provider>
  );
};

export const useGeneratedMediaContext = () => {
  const ctx = useContext(GeneratedMediaContext);
  if (!ctx) throw new Error('useGeneratedMediaContext must be used within a GeneratedMediaProvider');
  return ctx;
};

export const useGeneratedMedia = useGeneratedMediaContext;
