import React from 'react';
import { Plus, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { ConversationCard } from './ConversationCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const ConversationList = () => {
  const {
    conversations,
    isLoadingConversations,
    state,
    setActiveConversation,
    createConversation,
  } = usePlayground();

  const handleCreateConversation = async () => {
    try {
      await createConversation();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (isLoadingConversations) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Playground</h2>
          <Button
            onClick={handleCreateConversation}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Create your first conversation to get started</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isActive={state.activeConversationId === conversation.id}
              onClick={() => setActiveConversation(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};