import React, { useState } from 'react';
import { MessageSquare, MoreVertical, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { formatDistanceToNow } from 'date-fns';

interface ConversationCardProps {
  conversation: {
    id: string;
    title: string;
    conversation_type: string;
    project_id: string | null;
    updated_at: string;
  };
  isActive: boolean;
  onClick: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { deleteConversation, updateConversationTitle } = usePlayground();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(conversation.id);
    }
  };

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      await updateConversationTitle(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
        isActive
          ? 'bg-blue-600/20 border border-blue-600/30'
          : 'hover:bg-gray-800 border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-1 rounded ${
            conversation.conversation_type === 'story_development' 
              ? 'bg-purple-600/20 text-purple-400' 
              : 'bg-gray-600/20 text-gray-400'
          }`}>
            <MessageSquare className="h-3 w-3" />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyPress}
                className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="text-sm font-medium text-white truncate">
                {conversation.title}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{timeAgo}</span>
              {conversation.project_id && (
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 text-purple-400" />
                  <span className="text-xs text-purple-400">Project</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
            <DropdownMenuItem onClick={handleEdit} className="text-gray-300 hover:text-white">
              <Edit2 className="h-3 w-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};