import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export type PlaygroundMode = 'chat' | 'compare' | 'admin';

interface PlaygroundModeSelectorProps {
  currentMode: PlaygroundMode;
  onModeChange: (mode: PlaygroundMode) => void;
}

export const PlaygroundModeSelector: React.FC<PlaygroundModeSelectorProps> = ({
  currentMode,
  onModeChange,
}) => {
  const { isAdmin } = useAuth();

  const modes = [
    { id: 'chat' as const, label: 'Chat' },
    { id: 'compare' as const, label: 'Compare' },
    ...(isAdmin ? [{ id: 'admin' as const, label: 'Admin' }] : []),
  ];

  return (
    <div className="border-b border-border px-3 py-1.5">
      <div className="flex gap-1">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <Button
              key={mode.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange(mode.id)}
              className={`h-7 px-3 text-xs ${
                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};