import React from 'react';
import { Play, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
  reference_image_url?: string;
}

interface UnifiedSceneCardProps {
  id: string;
  title: string;
  participants: CharacterParticipant[];
  backgroundImage?: string;
  gradient?: string;
  onClick: () => void;
  className?: string;
  isMultiCharacter?: boolean;
}

export const UnifiedSceneCard: React.FC<UnifiedSceneCardProps> = ({
  id,
  title,
  participants,
  backgroundImage,
  gradient = "bg-gradient-to-br from-primary/20 to-primary/5",
  onClick,
  className,
  isMultiCharacter = false
}) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user': return 'bg-blue-500/80';
      case 'ai': return 'bg-purple-500/80';
      case 'narrator': return 'bg-green-500/80';
      default: return 'bg-gray-500/80';
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden cursor-pointer group aspect-[4/3] min-w-[200px] transition-all duration-300 hover:scale-105 hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      {/* Background */}
      <div className={cn("absolute inset-0", gradient)}>
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt={title}
            className="w-full h-full object-cover opacity-60"
          />
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-4 text-white">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {isMultiCharacter ? (
              <Users className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              {participants.length} {participants.length === 1 ? 'Character' : 'Characters'}
            </span>
          </div>
          
          <h3 className="font-semibold text-base leading-tight">{title}</h3>
          
          {/* Participants Preview */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((participant, idx) => (
                <div key={participant.id} className="relative">
                  <img
                    src={participant.image_url || participant.reference_image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${participant.name}`}
                    alt={participant.name}
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white",
                    getRoleColor(participant.role)
                  )} />
                </div>
              ))}
              {participants.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white flex items-center justify-center text-xs font-medium">
                  +{participants.length - 3}
                </div>
              )}
            </div>
            
            <div className="text-xs opacity-90">
              {participants.slice(0, 2).map(p => p.name).join(' & ')}
              {participants.length > 2 && ` +${participants.length - 2}`}
            </div>
          </div>
        </div>

        {/* Play Button */}
        <div className="flex justify-end">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
            <Play className="w-4 h-4 fill-current" />
          </div>
        </div>
      </div>
    </div>
  );
};