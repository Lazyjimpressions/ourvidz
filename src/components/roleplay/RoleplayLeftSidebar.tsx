import React, { useState } from 'react';
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

  // Filter conversations by date
  const thisWeekConversations = conversations.filter(conv => 
    isThisWeek(new Date(conv.updated_at))
  );
  
  const thisMonthConversations = conversations.filter(conv => 
    isThisMonth(new Date(conv.updated_at)) && !isThisWeek(new Date(conv.updated_at))
  );

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
      "w-64 h-screen bg-background border-r border-border flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Character.AI</span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start h-9 text-sm font-normal"
          onClick={() => navigate('/roleplay/create')}
        >
          <Plus className="w-4 h-4 mr-3" />
          Create
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-9 text-sm font-normal"
          onClick={() => navigate('/roleplay')}
        >
          <Sparkles className="w-4 h-4 mr-3" />
          Discover
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-9 text-sm font-normal"
          onClick={() => navigate('/roleplay/avatars')}
        >
          <Bot className="w-4 h-4 mr-3" />
          AvatarFX
        </Button>
      </div>

      {/* Conversation History */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4">
          {/* This Week */}
          {thisWeekConversations.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('thisWeek')}
                className="flex items-center gap-2 w-full text-left mb-2 hover:text-primary transition-colors"
              >
                {expandedSections.thisWeek ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  This Week ({thisWeekConversations.length})
                </span>
              </button>
              
              {expandedSections.thisWeek && (
                <div className="space-y-1 ml-6">
                  {thisWeekConversations.map(renderConversationItem)}
                </div>
              )}
            </div>
          )}

          {/* This Month */}
          {thisMonthConversations.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('thisMonth')}
                className="flex items-center gap-2 w-full text-left mb-2 hover:text-primary transition-colors"
              >
                {expandedSections.thisMonth ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  This Month ({thisMonthConversations.length})
                </span>
              </button>
              
              {expandedSections.thisMonth && (
                <div className="space-y-1 ml-6">
                  {thisMonthConversations.map(renderConversationItem)}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {conversations.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start chatting with a character
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};