import React from 'react';
import { Button } from '@/components/ui/button';

export type PlaygroundMode = 'chat' | 'roleplay' | 'admin' | 'creative';

interface PlaygroundModeSelectorProps {
  currentMode: PlaygroundMode;
  onModeChange: (mode: PlaygroundMode) => void;
}

export const PlaygroundModeSelector: React.FC<PlaygroundModeSelectorProps> = ({
  currentMode,
  onModeChange,
}) => {
  const modes = [
    { id: 'chat' as const, label: 'Chat', description: 'General conversation' },
    { id: 'roleplay' as const, label: 'Roleplay', description: 'Character scenarios' },
    { id: 'creative' as const, label: 'Creative', description: 'Story development' },
    { id: 'admin' as const, label: 'Admin', description: 'System tools' },
  ];

  return (
    <div className="border-b border-gray-800 p-2">
      <div className="flex gap-1 max-w-4xl mx-auto">
        {modes.map((mode) => (
          <Button
            key={mode.id}
            variant={currentMode === mode.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange(mode.id)}
            className="h-8 px-3 text-xs"
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  );
};