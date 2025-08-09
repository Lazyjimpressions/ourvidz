import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConversations, ConversationInfo } from '@/hooks/useConversations';
import { Plus, MessageSquare, Trash2, X, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConversationManagerProps {
  characterId?: string;
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
}

export const ConversationManager = ({ 
  characterId, 
  activeConversationId,
  onConversationSelect,
  onNewConversation 
}: ConversationManagerProps) => {
  const { conversations, isLoading, deleteConversation, updateConversationStatus } = useConversations(characterId);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const { toast } = useToast();

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await deleteConversation(conversationId);
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleDismissConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await updateConversationStatus(conversationId, 'archived');
      toast({
        title: "Conversation dismissed",
        description: "The conversation has been archived",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to dismiss conversation",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getConversationStatus = (conversation: ConversationInfo) => {
    if (conversation.id === activeConversationId) return 'active';
    if (conversation.status === 'archived') return 'archived';
    return 'inactive';
  };

  const activeConversations = conversations.filter(conv => conv.status !== 'archived');
  const recentConversations = activeConversations.slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Button size="sm" className="w-full" disabled>
          <Plus className="w-3 h-3 mr-1" />
          New Conversation
        </Button>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-2 bg-gray-700 rounded animate-pulse">
              <div className="w-24 h-4 bg-gray-600 rounded mb-1" />
              <div className="w-16 h-3 bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button size="sm" className="w-full" onClick={onNewConversation}>
        <Plus className="w-3 h-3 mr-1" />
        New Conversation
      </Button>
      
      <div className="space-y-2">
        {recentConversations.length > 0 ? (
          <>
            {recentConversations.map((conversation) => {
              const status = getConversationStatus(conversation);
              return (
                <div 
                  key={conversation.id}
                  className={`p-2 rounded cursor-pointer transition-colors group relative ${
                    status === 'active' 
                      ? 'bg-purple-600/20 border border-purple-600/30' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-medium">
                        {conversation.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">
                          {formatDate(conversation.updated_at)}
                        </p>
                        {conversation.message_count && conversation.message_count > 0 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {conversation.message_count}
                          </Badge>
                        )}
                        {status === 'active' && (
                          <Badge variant="outline" className="text-xs px-1 py-0 bg-purple-600/20 border-purple-600/50">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={(e) => handleDismissConversation(conversation.id, e)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {activeConversations.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setShowAllConversations(true)}
              >
                <Eye className="w-3 h-3 mr-1" />
                View All ({activeConversations.length - 3} more)
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No conversations yet</p>
            <p className="text-xs text-gray-500">Start chatting to see your history</p>
          </div>
        )}
      </div>

      {/* All Conversations Modal */}
      <Dialog open={showAllConversations} onOpenChange={setShowAllConversations}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              All Conversations ({conversations.length})
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const status = getConversationStatus(conversation);
                return (
                  <Card 
                    key={conversation.id} 
                    className={`cursor-pointer transition-colors ${
                      status === 'active' 
                        ? 'bg-purple-600/20 border-purple-600/30' 
                        : conversation.status === 'archived'
                        ? 'bg-gray-800/50 border-gray-700 opacity-60'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      onConversationSelect(conversation.id);
                      setShowAllConversations(false);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conversation.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {formatDate(conversation.updated_at)}
                            </div>
                            {conversation.message_count && conversation.message_count > 0 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {conversation.message_count} msgs
                              </Badge>
                            )}
                            {status === 'active' && (
                              <Badge variant="outline" className="text-xs px-1 py-0 bg-purple-600/20 border-purple-600/50">
                                Active
                              </Badge>
                            )}
                            {conversation.status === 'archived' && (
                              <Badge variant="outline" className="text-xs px-1 py-0 bg-gray-600/20 border-gray-600/50">
                                Archived
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            onClick={(e) => handleDismissConversation(conversation.id, e)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};