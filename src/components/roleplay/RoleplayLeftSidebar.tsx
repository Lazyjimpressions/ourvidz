import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Plus, 
  Bot, 
  Sparkles, 
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { format, isThisWeek, isThisMonth } from 'date-fns';

interface RoleplayLeftSidebarProps {
  className?: string;
}

export const RoleplayLeftSidebar: React.FC<RoleplayLeftSidebarProps> = ({
  className
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    thisWeek: true,
    thisMonth: true
  });
  
  const { conversations, isLoading } = useConversations();

  // Memoize filtered conversations to prevent infinite re-renders
  const { thisWeekConversations, thisMonthConversations } = useMemo(() => {
    const thisWeek = conversations.filter(conv => 
      isThisWeek(new Date(conv.updated_at))
    );
    
    const thisMonth = conversations.filter(conv => 
      isThisMonth(new Date(conv.updated_at)) && !isThisWeek(new Date(conv.updated_at))
    );

    return { thisWeekConversations: thisWeek, thisMonthConversations: thisMonth };
  }, [conversations]);

  const toggleSection = (section: 'thisWeek' | 'thisMonth') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderConversationItem = (conversation: any) => (
    <button
      key={conversation.id}
      onClick={() => navigate(`/roleplay/chat?character=${conversation.character_id}`)}
      className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
            {conversation.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(conversation.updated_at), 'MMM d, HH:mm')}
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className={cn(
      "w-64 h-screen bg-white border-r border-gray-200 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <span className="font-medium text-gray-900 text-sm">Character.AI</span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs bg-gray-50 border-gray-200 rounded-md"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="p-3 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start h-7 text-xs font-normal text-gray-700 hover:bg-gray-100"
          onClick={() => navigate('/roleplay/create')}
        >
          <Plus className="w-3 h-3 mr-2" />
          Create
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-7 text-xs font-normal text-gray-700 hover:bg-gray-100"
          onClick={() => navigate('/roleplay')}
        >
          <Sparkles className="w-3 h-3 mr-2" />
          Discover
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-7 text-xs font-normal text-gray-700 hover:bg-gray-100"
          onClick={() => navigate('/roleplay/avatars')}
        >
          <Bot className="w-3 h-3 mr-2" />
          AvatarFX
        </Button>
      </div>

      {/* Conversation History */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-3">
          {/* This Week */}
          {thisWeekConversations.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('thisWeek')}
                className="flex items-center gap-1.5 w-full text-left mb-1.5 hover:text-blue-600 transition-colors"
              >
                {expandedSections.thisWeek ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span className="text-xs font-medium text-gray-600">
                  This Week ({thisWeekConversations.length})
                </span>
              </button>
              
              {expandedSections.thisWeek && (
                <div className="space-y-0.5 ml-4">
                  {thisWeekConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => navigate(`/roleplay/chat?character=${conversation.character_id}`)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-600">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(conversation.updated_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* This Month */}
          {thisMonthConversations.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('thisMonth')}
                className="flex items-center gap-1.5 w-full text-left mb-1.5 hover:text-blue-600 transition-colors"
              >
                {expandedSections.thisMonth ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span className="text-xs font-medium text-gray-600">
                  This Month ({thisMonthConversations.length})
                </span>
              </button>
              
              {expandedSections.thisMonth && (
                <div className="space-y-0.5 ml-4">
                  {thisMonthConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => navigate(`/roleplay/chat?character=${conversation.character_id}`)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-600">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(conversation.updated_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {conversations.length === 0 && !isLoading && (
            <div className="text-center py-6">
              <MessageSquare className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
              <p className="text-xs text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Start chatting with a character
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};