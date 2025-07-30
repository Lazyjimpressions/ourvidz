import React from 'react';
import { StoryboardLayout } from '@/components/StoryboardLayout';
import { PlaygroundProvider } from '@/contexts/PlaygroundContext';
import { ChatInterface } from '@/components/playground/ChatInterface';

const Playground = () => {
  return (
    <StoryboardLayout>
      <PlaygroundProvider>
        <div className="h-full">
          <ChatInterface />
        </div>
      </PlaygroundProvider>
    </StoryboardLayout>
  );
};

export default Playground;