import React from 'react';
import { StoryboardLayout } from '@/components/StoryboardLayout';
import { PlaygroundProvider } from '@/contexts/PlaygroundContext';
import { ChatInterface } from '@/components/playground/ChatInterface';
import { GeneratedMediaProvider } from '@/contexts/GeneratedMediaContext';

const Playground = () => {
  return (
    <StoryboardLayout>
      <GeneratedMediaProvider>
        <PlaygroundProvider>
          <div className="h-full">
            <ChatInterface />
          </div>
        </PlaygroundProvider>
      </GeneratedMediaProvider>
    </StoryboardLayout>
  );
};

export default Playground;