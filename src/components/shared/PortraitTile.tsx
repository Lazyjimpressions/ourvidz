import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { urlSigningService } from '@/lib/services/UrlSigningService';

interface PortraitTileProps {
  imageUrl: string | null | undefined;
  alt: string;
  aspectRatio?: '3/4' | '1/1';
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Shared portrait tile component used by both Roleplay and Character Studio.
 * Ensures consistent image rendering across the application.
 */
export function PortraitTile({ 
  imageUrl, 
  alt, 
  aspectRatio = '3/4', 
  className, 
  onClick,
  children 
}: PortraitTileProps) {
  // Initialize with imageUrl as fallback to prevent flash of empty state
  const [signedUrl, setSignedUrl] = useState<string>(imageUrl || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Sign image URL if it's a private storage path
  useEffect(() => {
    const signImageUrl = async () => {
      if (!imageUrl) {
        setSignedUrl('');
        setIsLoading(false);
        return;
      }

      // Skip signing if URL already has a token (already signed)
      if (imageUrl.includes('?token=') || imageUrl.includes('&token=')) {
        setSignedUrl(imageUrl);
        return;
      }

      // Check if URL needs signing (user-library or workspace-temp paths without tokens)
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
        try {
          const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
          const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
          setSignedUrl(signed);
        } catch (error) {
          console.error('Failed to sign image URL:', error);
          setSignedUrl(imageUrl); // Fallback to original
        }
      } else {
        setSignedUrl(imageUrl); // Use as-is for public URLs
      }
    };

    setHasError(false);
    signImageUrl();
  }, [imageUrl]);

  const displayUrl = signedUrl || imageUrl;

  return (
    <div
      className={cn(
        "relative group cursor-pointer",
        aspectRatio === '3/4' ? "aspect-[3/4]" : "aspect-square",
        "rounded-lg overflow-hidden",
        "bg-card border border-border",
        "transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.01] hover:border-primary/50",
        "shadow-sm",
        className
      )}
      onClick={onClick}
    >
      {/* Image container - exact same structure as MobileCharacterCard */}
      <div className="relative w-full h-full">
        {/* Loading skeleton */}
        {isLoading && displayUrl && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
        )}
        
        {displayUrl && !hasError ? (
          <img
            src={displayUrl}
            alt={alt}
            className={cn(
              "w-full h-full object-contain md:object-cover",
              isLoading && "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">{hasError ? 'Failed to load' : 'No Image'}</p>
            </div>
          </div>
        )}
      </div>
      {/* Overlay children (badges, menus, etc.) */}
      {children}
    </div>
  );
}
