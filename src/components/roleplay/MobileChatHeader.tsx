import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, MoreVertical, RotateCcw, Settings, User, Info, Share2, Flag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileChatHeaderProps {
  backTo?: string;
  characterName?: string;
  characterImage?: string;
  onSettingsClick?: () => void;
  onCharacterInfoClick?: () => void;
  onResetClick?: () => void;
  onShareClick?: () => void;
  onReportClick?: () => void;
  onNewScenario?: () => void;
  className?: string;
}

export const MobileChatHeader: React.FC<MobileChatHeaderProps> = ({
  backTo = '/roleplay',
  characterName,
  characterImage,
  onSettingsClick,
  onCharacterInfoClick,
  onResetClick,
  onShareClick,
  onReportClick,
  onNewScenario,
  className
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleBack = () => {
    navigate(backTo);
  };

  return (
    <header className={cn(
      "h-14 border-b border-border bg-background flex items-center justify-between px-2 flex-shrink-0",
      className
    )}>
      {/* Left Section - Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px]"
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      {/* Center Section - Character Info */}
      <button
        onClick={onCharacterInfoClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors min-h-[44px]"
        aria-label={`View ${characterName || 'character'} info`}
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={characterImage} alt={characterName} />
          <AvatarFallback className="text-xs bg-primary/20">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        {characterName && (
          <span className="text-sm font-medium text-foreground max-w-[150px] truncate">
            {characterName}
          </span>
        )}
      </button>

      {/* Right Section - Menu */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={true}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px]"
            aria-label="Open menu"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 z-[100]" sideOffset={5}>
          {onCharacterInfoClick && (
            <DropdownMenuItem onClick={() => { onCharacterInfoClick(); setMenuOpen(false); }}>
              <Info className="w-4 h-4 mr-2" />
              Character Info
            </DropdownMenuItem>
          )}
          {onNewScenario && (
            <DropdownMenuItem onClick={() => { onNewScenario(); setMenuOpen(false); }}>
              <Sparkles className="w-4 h-4 mr-2" />
              New Scenario
            </DropdownMenuItem>
          )}
          {onSettingsClick && (
            <DropdownMenuItem onClick={() => { onSettingsClick(); setMenuOpen(false); }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onResetClick && (
            <DropdownMenuItem onClick={() => { onResetClick(); setMenuOpen(false); }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Conversation
            </DropdownMenuItem>
          )}
          {onShareClick && (
            <DropdownMenuItem onClick={() => { onShareClick(); setMenuOpen(false); }}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onReportClick && (
            <DropdownMenuItem
              onClick={() => { onReportClick(); setMenuOpen(false); }}
              className="text-destructive focus:text-destructive"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
