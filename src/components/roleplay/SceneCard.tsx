import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneCardProps {
  id: string;
  title: string;
  characterNames: string[];
  backgroundImage?: string;
  gradient: string;
  onClick: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  title,
  characterNames,
  backgroundImage,
  gradient,
  onClick,
  onRegenerate,
  isRegenerating,
  className
}) => {
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden cursor-pointer group aspect-[4/3] min-w-[200px]",
        className
      )}
      onClick={onClick}
    >
      {/* Background */}
      <div className={`absolute inset-0 ${gradient}`}>
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt={title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

      {/* Regenerate Button */}
      {onRegenerate && (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            className="bg-white/30 hover:bg-white/40 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors disabled:opacity-50"
            aria-label="Regenerate scene image"
            title="Regenerate image"
            disabled={isRegenerating}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-4 text-white">
        <div>
          <h3 className="font-medium text-sm mb-1">{title}</h3>
          <p className="text-xs opacity-90">
            {characterNames.slice(0, 2).join(' & ')}
            {characterNames.length > 2 && ` +${characterNames.length - 2}`}
          </p>
        </div>

        <div className="flex justify-end">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 group-hover:bg-white/30 transition-colors">
            <Play className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};