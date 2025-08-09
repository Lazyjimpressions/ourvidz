import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ConversationHistoryProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
}

export const ConversationHistory = ({
  conversations,
  activeConversationId,
  onCreateConversation,
  onSelectConversation,
}: ConversationHistoryProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-gray-300">Conversations</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateConversation}
          className="text-gray-400 hover:text-white h-7 px-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          New
        </Button>
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {conversations?.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                activeConversationId === conv.id 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="truncate font-medium">{conv.title}</div>
              <div className="text-xs text-gray-500 truncate">
                {new Date(conv.updated_at).toLocaleDateString()}
              </div>
            </button>
          ))
        ) : (
          <div className="text-xs text-gray-500 text-center py-4">
            No conversations yet
          </div>
        )}
      </div>
    </div>
  );
};