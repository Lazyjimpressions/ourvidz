import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Plus, 
  Bot, 
  Sparkles, 
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCharacterSessions } from '@/hooks/useCharacterSessions';
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
  
  const { sessions, isLoading } = useCharacterSessions();

  // Memoize filtered sessions to prevent infinite re-renders
  const { thisWeekSessions, thisMonthSessions } = useMemo(() => {
    const thisWeek = sessions.filter(session => 
      isThisWeek(new Date(session.last_updated))
    );
    
    const thisMonth = sessions.filter(session => 
      isThisMonth(new Date(session.last_updated)) && !isThisWeek(new Date(session.last_updated))
    );

    return { thisWeekSessions: thisWeek, thisMonthSessions: thisMonth };
  }, [sessions]);

  const toggleSection = (section: 'thisWeek' | 'thisMonth') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSessionItem = (session: any) => (
    <button
      key={session.character_id}
      onClick={() => navigate(`/roleplay/chat?character=${session.character_id}`)}
      className="w-full text-left p-1.5 rounded-md hover:bg-gray-100 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={session.character_image_url} alt={session.character_name} />
          <AvatarFallback className="text-xs">
            <User className="w-3 h-3" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-600">
            {session.character_name}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{session.total_messages} messages</span>
            <span>•</span>
            <span>{format(new Date(session.last_updated), 'MMM d, HH:mm')}</span>
          </div>
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
          {thisWeekSessions.length > 0 && (
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
                  This Week ({thisWeekSessions.length})
                </span>
              </button>
              
              {expandedSections.thisWeek && (
                <div className="space-y-0.5 ml-4">
                  {thisWeekSessions.map(renderSessionItem)}
                </div>
              )}
            </div>
          )}

          {/* This Month */}
          {thisMonthSessions.length > 0 && (
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
                  This Month ({thisMonthSessions.length})
                </span>
              </button>
              
              {expandedSections.thisMonth && (
                <div className="space-y-0.5 ml-4">
                  {thisMonthSessions.map(renderSessionItem)}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {sessions.length === 0 && !isLoading && (
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