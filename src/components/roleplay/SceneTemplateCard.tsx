import React from 'react';
import { Users, Heart, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneTemplate, ContentRating } from '@/types/roleplay';
import { Badge } from '@/components/ui/badge';

interface SceneTemplateCardProps {
  scene: SceneTemplate;
  onClick: (scene: SceneTemplate) => void;
  className?: string;
}

// Gradient backgrounds for scenes without preview images
const SCENE_GRADIENTS: Record<string, string> = {
  cafe: 'from-amber-600 to-orange-800',
  beach: 'from-cyan-500 to-blue-700',
  office: 'from-slate-600 to-slate-800',
  apartment: 'from-purple-600 to-indigo-800',
  garden: 'from-emerald-600 to-teal-800',
  hotel: 'from-rose-600 to-pink-800',
  tavern: 'from-amber-700 to-yellow-900',
  spa: 'from-teal-500 to-cyan-700',
  rooftop: 'from-violet-600 to-purple-800',
  cabin: 'from-orange-700 to-red-900',
  default: 'from-gray-600 to-gray-800'
};

// Content rating badge colors
const RATING_COLORS: Record<ContentRating, string> = {
  sfw: 'bg-green-500/80 text-white',
  nsfw: 'bg-red-500/80 text-white'
};

export const SceneTemplateCard: React.FC<SceneTemplateCardProps> = ({
  scene,
  onClick,
  className
}) => {
  const gradient = SCENE_GRADIENTS[scene.setting || 'default'] || SCENE_GRADIENTS.default;
  const hasHighRomance = (scene.atmosphere?.romance ?? 0) >= 60;
  const hasHighTension = (scene.atmosphere?.tension ?? 0) >= 50;

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden cursor-pointer group aspect-[3/4] min-w-[160px]",
        "transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
        className
      )}
      onClick={() => onClick(scene)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(scene)}
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
        {scene.preview_image_url && (
          <img
            src={scene.preview_image_url}
            alt={scene.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
        {/* Content rating */}
        <Badge className={cn("text-[10px] px-1.5 py-0.5 font-medium", RATING_COLORS[scene.content_rating])}>
          {scene.content_rating.toUpperCase()}
        </Badge>

        {/* Character count */}
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
          <Users className="w-3 h-3 text-white" />
          <span className="text-[10px] text-white font-medium">
            {scene.min_characters === scene.max_characters
              ? scene.min_characters
              : `${scene.min_characters}-${scene.max_characters}`}
          </span>
        </div>
      </div>

      {/* Mood indicators */}
      <div className="absolute top-10 right-2 flex flex-col gap-1">
        {hasHighRomance && (
          <div className="bg-pink-500/60 backdrop-blur-sm rounded-full p-1" title="Romantic">
            <Heart className="w-3 h-3 text-white" />
          </div>
        )}
        {hasHighTension && (
          <div className="bg-orange-500/60 backdrop-blur-sm rounded-full p-1" title="High tension">
            <Flame className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
          {scene.name}
        </h3>
        {scene.description && (
          <p className="text-[11px] opacity-80 line-clamp-2 leading-snug">
            {scene.description}
          </p>
        )}

        {/* Usage count for popular scenes */}
        {scene.usage_count > 10 && (
          <div className="flex items-center gap-1 mt-2 opacity-70">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[10px]">{scene.usage_count} plays</span>
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
    </div>
  );
};
