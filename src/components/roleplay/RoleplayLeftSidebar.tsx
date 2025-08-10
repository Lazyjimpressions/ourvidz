import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Plus, 
  MessageCircle, 
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
      className="w-full text-left p-1.5 rounded-md hover:bg-muted transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={session.character_image_url} alt={session.character_name} />
          <AvatarFallback className="text-xs">
            <User className="w-3 h-3" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary">
            {session.character_name}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
      "w-64 h-full bg-background border-r border-border flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="h-8 px-2 text-muted-foreground hover:text-foreground justify-start"
          >
            <div className="w-4 h-4 bg-primary rounded-sm flex items-center justify-center mr-2">
              <MessageCircle className="w-2 h-2 text-primary-foreground" />
            </div>
            Back to OurVidz
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs bg-muted border-border rounded-md"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="p-3 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start h-7 text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => navigate('/roleplay/create')}
        >
          <Plus className="w-3 h-3 mr-2" />
          Create
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-7 text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => navigate('/roleplay')}
        >
          <Sparkles className="w-3 h-3 mr-2" />
          Discover
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-7 text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => navigate('/roleplay/avatars')}
        >
          <MessageCircle className="w-3 h-3 mr-2" />
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
                className="flex items-center gap-1.5 w-full text-left mb-1.5 hover:text-primary transition-colors"
              >
                {expandedSections.thisWeek ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
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
                className="flex items-center gap-1.5 w-full text-left mb-1.5 hover:text-primary transition-colors"
              >
                {expandedSections.thisMonth ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
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
              <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Start chatting with a character
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};