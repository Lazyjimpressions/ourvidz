import React from 'react';
import { MessageSquare, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onClick: () => void;
  onLike: (e: React.MouseEvent) => void;
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
  onClick,
  onLike,
  className
}) => {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border/60 hover:border-border transition-colors cursor-pointer overflow-hidden shadow-sm hover:shadow-md",
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
      <div className="px-3 pb-2">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-muted-foreground text-xs px-1">
                +{tags.length - 3}
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
          <button
            onClick={onLike}
            className="flex items-center gap-1 hover:text-destructive transition-colors"
          >
            <Heart className="w-3 h-3" />
            {likesCount}
          </button>
        </div>
      </div>
    </div>
  );
};