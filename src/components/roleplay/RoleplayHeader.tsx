import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, MessageCircle, User, Settings, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface RoleplayHeaderProps {
  showBackButton?: boolean;
  backTo?: string;
  title?: string;
  subtitle?: string;
  characterName?: string;
  characterImage?: string;
  onSettingsClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export const RoleplayHeader: React.FC<RoleplayHeaderProps> = ({
  showBackButton = true,
  backTo = '/dashboard',
  title,
  subtitle,
  characterName,
  characterImage,
  onSettingsClick,
  onMenuClick,
  className
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className={cn(
      "h-12 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTo)}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {backTo === '/roleplay' ? 'Roleplay' : 'Dashboard'}
          </Button>
        )}
        
        {/* OurVidz Brand/Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <MessageCircle className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground text-sm">OurVidz</span>
          </div>
          
          <div className="w-px h-4 bg-border" />
          
          <div>
            {title ? (
              <div>
                <h1 className="font-medium text-foreground text-sm">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            ) : (
              <span className="font-medium text-foreground text-sm">Roleplay</span>
            )}
          </div>
        </div>

        {/* Character Info (if present) */}
        {characterName && (
          <>
            <div className="w-px h-4 bg-border mx-2" />
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={characterImage} alt={characterName} />
                <AvatarFallback className="text-xs">
                  <User className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground font-medium">{characterName}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        )}
        
        {onSettingsClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsClick}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
        
        {user && (
          <Avatar className="w-7 h-7">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
            <AvatarFallback className="text-xs">
              {user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
};