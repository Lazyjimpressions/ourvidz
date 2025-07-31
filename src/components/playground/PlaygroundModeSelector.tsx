import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Settings, Palette } from 'lucide-react';

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
    { id: 'chat' as const, label: 'Chat', description: 'General conversation', icon: MessageCircle, color: 'text-blue-400' },
    { id: 'roleplay' as const, label: 'Roleplay', description: 'Character scenarios', icon: Users, color: 'text-purple-400' },
    { id: 'creative' as const, label: 'Creative', description: 'Story development', icon: Palette, color: 'text-green-400' },
    { id: 'admin' as const, label: 'Admin', description: 'System tools', icon: Settings, color: 'text-orange-400' },
  ];

  return (
    <div className="border-b border-gray-800 p-2">
      <div className="flex gap-1 max-w-4xl mx-auto">
        {modes.map((mode) => {
          const IconComponent = mode.icon;
          const isActive = currentMode === mode.id;
          return (
            <Button
              key={mode.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange(mode.id)}
              className={`h-8 px-3 text-xs flex items-center gap-1.5 ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title={mode.description}
            >
              <IconComponent className={`h-3 w-3 ${isActive ? 'text-white' : mode.color}`} />
              {mode.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};