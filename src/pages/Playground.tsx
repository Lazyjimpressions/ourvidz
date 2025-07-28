import React from 'react';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { PlaygroundProvider } from '@/contexts/PlaygroundContext';
import { ConversationList } from '@/components/playground/ConversationList';
import { ChatInterface } from '@/components/playground/ChatInterface';

const Playground = () => {
  return (
    <OurVidzDashboardLayout>
      <PlaygroundProvider>
        <div className="h-full flex bg-[#0a0a0a] text-white -m-6">
          {/* Conversation List - Left Panel */}
          <div className="w-80 bg-[#111111] border-r border-gray-800 flex-shrink-0">
            <ConversationList />
          </div>
          
          {/* Chat Interface - Right Panel */}
          <div className="flex-1 flex flex-col">
            <ChatInterface />
          </div>
        </div>
      </PlaygroundProvider>
    </OurVidzDashboardLayout>
  );
};

export default Playground;