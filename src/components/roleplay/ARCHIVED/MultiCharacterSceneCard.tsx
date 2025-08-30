import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
  reference_image_url?: string;
}

interface MultiCharacterSceneCardProps {
  id: string;
  title: string;
  participants: CharacterParticipant[];
  backgroundImage?: string;
  onClick?: () => void;
  onStartChat?: () => void;
  className?: string;
}

export const MultiCharacterSceneCard: React.FC<MultiCharacterSceneCardProps> = ({
  id,
  title,
  participants,
  backgroundImage,
  onClick,
  onStartChat,
  className
}) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'narrator': return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      default: return 'bg-green-500/20 text-green-300 border-green-400/30';
    }
  };

  return (
    <div
      className={cn(
        "relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-800 hover:border-gray-600 transition-all duration-200",
        "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0">
          <img
            src={backgroundImage}
            alt="Scene background"
            className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-gray-900/20" />
        </div>
      )}

      {/* Content */}
      <div className="relative p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span>{participants.length} characters</span>
            </div>
          </div>
          
          {onStartChat && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onStartChat();
              }}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <MessageSquare className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Character Participants */}
        <div className="space-y-2">
          {/* Avatar Stack */}
          <div className="flex -space-x-2">
            {participants.slice(0, 4).map((participant, index) => (
              <Avatar
                key={participant.id}
                className="h-6 w-6 border-2 border-gray-800 ring-1 ring-gray-600"
                style={{ zIndex: participants.length - index }}
              >
                <AvatarImage
                  src={participant.reference_image_url || participant.image_url}
                  alt={participant.name}
                />
                <AvatarFallback className="text-xs bg-gray-700 text-gray-300">
                  {participant.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {participants.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-gray-700 border-2 border-gray-800 ring-1 ring-gray-600 flex items-center justify-center">
                <span className="text-xs text-gray-300">+{participants.length - 4}</span>
              </div>
            )}
          </div>

          {/* Character Names and Roles */}
          <div className="space-y-1">
            {participants.slice(0, 3).map((participant) => (
              <div key={participant.id} className="flex items-center justify-between">
                <span className="text-xs text-gray-300 truncate flex-1">
                  {participant.name}
                </span>
                <Badge className={`text-xs px-1.5 py-0.5 ${getRoleColor(participant.role)}`}>
                  {participant.role}
                </Badge>
              </div>
            ))}
            {participants.length > 3 && (
              <div className="text-xs text-gray-400">
                +{participants.length - 3} more...
              </div>
            )}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-gray-900/90 to-transparent">
          <Button
            size="sm"
            variant="secondary"
            className="w-full h-6 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat?.();
            }}
          >
            <Play className="w-3 h-3 mr-1" />
            Start Scene
          </Button>
        </div>
      </div>
    </div>
  );
};