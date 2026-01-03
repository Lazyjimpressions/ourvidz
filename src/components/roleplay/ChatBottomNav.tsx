import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBottomNavProps {
  onCharacterInfoClick: () => void;
  onGenerateSceneClick: () => void;
  onSettingsClick: () => void;
  isGenerating?: boolean;
  isVisible?: boolean;
  className?: string;
}

export const ChatBottomNav: React.FC<ChatBottomNavProps> = ({
  onCharacterInfoClick,
  onGenerateSceneClick,
  onSettingsClick,
  isGenerating = false,
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
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
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

        {/* Generate Scene Button - Primary Action */}
        <Button
          onClick={onGenerateSceneClick}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-2 h-11 px-6 rounded-full",
            "bg-gradient-to-r from-purple-600 to-blue-600",
            "hover:from-purple-700 hover:to-blue-700",
            "text-white font-medium shadow-lg",
            "min-h-[44px] min-w-[140px]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label="Generate scene"
        >
          <Sparkles className={cn("w-4 h-4", isGenerating && "animate-pulse")} />
          <span className="text-sm">{isGenerating ? 'Generating...' : 'Generate Scene'}</span>
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
