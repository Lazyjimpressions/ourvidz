import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AssetTileProps {
  /** Already-signed display URL. Caller handles signing via useSignedUrl. */
  src: string | null | undefined;
  alt: string;
  /** Default 3/4 for consistency across the app. */
  aspectRatio?: '3/4' | '1/1' | '16/9' | '9/16';
  onClick?: (e: React.MouseEvent) => void;
  /** Overlay children: badges, menus, bottom gradients, selection indicators */
  children?: React.ReactNode;
  className?: string;
  /** Image loading strategy */
  loading?: 'lazy' | 'eager';
  /** Custom empty-state icon (defaults to Sparkles) */
  fallbackIcon?: React.ReactNode;
  /** Show subtle hover scale effect (default true) */
  hoverEffect?: boolean;
  /** Mouse enter/leave for desktop overlay toggle */
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  /** Ref forwarding for IntersectionObserver etc. */
  innerRef?: React.Ref<HTMLDivElement>;
}

const aspectMap: Record<string, string> = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '16/9': 'aspect-video',
  '9/16': 'aspect-[9/16]',
};

/**
 * Pure rendering component for all asset/image tiles across the app.
 * 
 * NO business logic, NO URL signing, NO internal state.
 * Image sits directly inside the aspect-ratio container (no nested h-full div)
 * to avoid the iOS Safari layout calculation bug.
 * 
 * Context-specific overlays are passed as children.
 */
export const AssetTile: React.FC<AssetTileProps> = ({
  src,
  alt,
  aspectRatio = '3/4',
  onClick,
  children,
  className,
  loading = 'lazy',
  fallbackIcon,
  hoverEffect = true,
  onMouseEnter,
  onMouseLeave,
  innerRef,
}) => {
  return (
    <div
      ref={innerRef}
      className={cn(
        'relative group cursor-pointer',
        aspectMap[aspectRatio] || 'aspect-[3/4]',
        'rounded-lg overflow-hidden',
        'bg-card border border-border',
        'transition-all duration-200',
        hoverEffect && 'hover:shadow-lg hover:scale-[1.01] hover:border-primary/50',
        'shadow-sm',
        className
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading={loading}
          decoding="async"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
          {fallbackIcon || (
            <div className="text-center text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No Image</p>
            </div>
          )}
        </div>
      )}
      {/* Overlay children rendered on top of the image */}
      {children}
    </div>
  );
};
