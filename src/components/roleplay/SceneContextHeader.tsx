import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Users, Camera } from 'lucide-react';

interface SceneParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
}

interface SceneContextHeaderProps {
  sceneId: string;
  title?: string;
  backgroundImage?: string;
  participants: SceneParticipant[];
  onClose: () => void;
  onRegenerateScene?: () => void;
}

export const SceneContextHeader: React.FC<SceneContextHeaderProps> = ({
  sceneId,
  title = "Active Scene",
  backgroundImage,
  participants,
  onClose,
  onRegenerateScene
}) => {
  return (
    <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-3">
      {/* Background Image Overlay */}
      {backgroundImage && (
        <div className="absolute inset-0 opacity-10">
          <img 
            src={backgroundImage} 
            alt="Scene background" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <h3 className="font-medium text-sm">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              Scene Mode
            </Badge>
          </div>
          
          {participants.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-muted-foreground" />
              <div className="flex -space-x-1">
                {participants.slice(0, 3).map((participant) => (
                  <img
                    key={participant.id}
                    src={participant.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${participant.name}`}
                    alt={participant.name}
                    className="w-6 h-6 rounded-full border-2 border-background object-cover"
                    title={participant.name}
                  />
                ))}
                {participants.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{participants.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {onRegenerateScene && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerateScene}
              className="h-6 px-2 text-xs"
            >
              Regenerate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};