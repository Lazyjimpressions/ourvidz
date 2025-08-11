import React from 'react';
import { MessageSquare, Heart, Image as ImageIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scene {
  id: string;
  scene_prompt: string;
  image_url?: string;
}

interface MinimalCharacterCardProps {
  id: string;
  name: string;
  creator: string;
  description: string;
  tags: string[];
  interactions: string;
  avatar: string;
  likesCount: number;
  isOfficial: boolean;
  availableScenes?: Scene[];
  onClick: () => void;
  onLike: (e: React.MouseEvent) => void;
  onStartChat: (e: React.MouseEvent) => void;
  onViewScenes: (e: React.MouseEvent) => void;
  onViewDetails: (e: React.MouseEvent) => void;
  className?: string;
}

export const MinimalCharacterCard: React.FC<MinimalCharacterCardProps> = ({
  name,
  creator,
  description,
  tags,
  interactions,
  avatar,
  likesCount,
  isOfficial,
  availableScenes = [],
  onClick,
  onLike,
  onStartChat,
  onViewScenes,
  onViewDetails,
  className
}) => {
  const hasScenes = availableScenes.length > 0;
  const previewScene = availableScenes[0];

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border/60 hover:border-border transition-colors cursor-pointer overflow-hidden shadow-sm hover:shadow-md h-48 flex flex-col",
        className
      )}
      onClick={onClick}
    >
      {/* Compact Header */}
      <div className="p-3 pb-2">
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            alt={name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-foreground truncate">{name}</h3>
              {isOfficial && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-md">
                  Official
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{creator}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-3 pb-2 flex-1">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Scene Preview */}
      {hasScenes && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 bg-muted/30 rounded-md p-2">
            {previewScene.image_url && (
              <img
                src={previewScene.image_url}
                alt={previewScene.scene_prompt}
                className="w-8 h-8 object-cover rounded-sm flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground line-clamp-1">
                {previewScene.scene_prompt}
              </p>
              <p className="text-xs text-muted-foreground">
                {availableScenes.length} scene{availableScenes.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-muted-foreground text-xs px-1">
                +{tags.length - 2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="px-3 py-2 border-t border-border/40 bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {interactions}
          </span>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onStartChat}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Start Chat"
            >
              <MessageSquare className="w-3 h-3" />
            </button>
            
            {hasScenes && (
              <button
                onClick={onViewScenes}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="View Scenes"
              >
                <ImageIcon className="w-3 h-3" />
              </button>
            )}
            
            <button
              onClick={onViewDetails}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="View Details"
            >
              <Play className="w-3 h-3" />
            </button>
            
            <button
              onClick={onLike}
              className="flex items-center gap-1 hover:text-destructive transition-colors"
              title="Like Character"
            >
              <Heart className="w-3 h-3" />
              <span className="text-xs">{likesCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};