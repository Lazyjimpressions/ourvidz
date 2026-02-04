import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBottomNavProps {
  onCharacterInfoClick: () => void;
  onSettingsClick: () => void;
  isVisible?: boolean;
  className?: string;
}

export const ChatBottomNav: React.FC<ChatBottomNavProps> = ({
  onCharacterInfoClick,
  onSettingsClick,
  isVisible = true,
  className
}) => {
  if (!isVisible) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/95 backdrop-blur-sm border-t border-border",
        "transition-transform duration-200 ease-in-out",
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center justify-around h-14 px-4 max-w-lg mx-auto">
        {/* Character Info Button */}
        <Button
          variant="ghost"
          onClick={onCharacterInfoClick}
          className="flex flex-col items-center gap-0.5 h-12 px-4 min-w-[64px] min-h-[44px]"
          aria-label="Character info"
        >
          <User className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">Character</span>
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          onClick={onSettingsClick}
          className="flex flex-col items-center gap-0.5 h-12 px-4 min-w-[64px] min-h-[44px]"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">Settings</span>
        </Button>
      </div>
    </nav>
  );
};
