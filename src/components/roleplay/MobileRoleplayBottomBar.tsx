import React from 'react';
import { Users, ImageIcon, Filter, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileRoleplayBottomBarProps {
  onShowFilters: () => void;
  onShowSettings: () => void;
  onCreateCharacter: () => void;
  activeSection?: 'characters' | 'scenes';
  onSectionChange?: (section: 'characters' | 'scenes') => void;
}

export const MobileRoleplayBottomBar: React.FC<MobileRoleplayBottomBarProps> = ({
  onShowFilters,
  onShowSettings,
  onCreateCharacter,
  activeSection = 'characters',
  onSectionChange
}) => {
  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={onCreateCharacter}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14 px-4">
          <button
            onClick={() => onSectionChange?.('characters')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-lg transition-colors",
              activeSection === 'characters' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Characters</span>
          </button>

          <button
            onClick={() => onSectionChange?.('scenes')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-lg transition-colors",
              activeSection === 'scenes' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Scenes</span>
          </button>

          <button
            onClick={onShowFilters}
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span className="text-[10px] font-medium">Filter</span>
          </button>

          <button
            onClick={onShowSettings}
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </div>
    </>
  );
};
