/**
 * ChainIndicator Component
 *
 * Visual connector between clips showing the frame chain relationship.
 * Shows the extracted frame that links one clip to the next.
 */

import React from 'react';
import { StoryboardClip } from '@/types/storyboard';
import { Link, ArrowRight, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChainIndicatorProps {
  sourceClip: StoryboardClip;
  targetClip?: StoryboardClip;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showPreview?: boolean;
}

export const ChainIndicator: React.FC<ChainIndicatorProps> = ({
  sourceClip,
  targetClip,
  orientation = 'horizontal',
  size = 'md',
  showPreview = false,
}) => {
  const hasChain = !!sourceClip.extracted_frame_url;
  const isConnected = hasChain && targetClip?.reference_image_url === sourceClip.extracted_frame_url;

  const sizeConfig = {
    sm: { icon: 10, line: 16, preview: 24 },
    md: { icon: 12, line: 24, preview: 32 },
    lg: { icon: 14, line: 32, preview: 48 },
  };

  const config = sizeConfig[size];

  if (!hasChain) {
    // No chain - show broken/missing indicator
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          orientation === 'horizontal' ? 'flex-row gap-1' : 'flex-col gap-1'
        )}
      >
        <div
          className="border border-dashed border-gray-700 rounded-full flex items-center justify-center"
          style={{ width: config.preview, height: config.preview }}
        >
          <Link className="text-gray-600" style={{ width: config.icon, height: config.icon }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        orientation === 'horizontal' ? 'flex-row gap-1' : 'flex-col gap-1'
      )}
    >
      {/* Source indicator */}
      {showPreview && sourceClip.extracted_frame_url ? (
        <div
          className="rounded overflow-hidden border border-green-500/50"
          style={{ width: config.preview, height: config.preview }}
        >
          <img
            src={sourceClip.extracted_frame_url}
            alt="Chain frame"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center',
            isConnected ? 'bg-green-500/20 border border-green-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'
          )}
          style={{ width: config.preview, height: config.preview }}
        >
          <ImageIcon
            className={isConnected ? 'text-green-400' : 'text-yellow-400'}
            style={{ width: config.icon, height: config.icon }}
          />
        </div>
      )}

      {/* Connector line */}
      <div
        className={cn(
          'flex items-center justify-center',
          orientation === 'horizontal' ? 'w-auto' : 'h-auto'
        )}
      >
        <div
          className={cn(
            'flex items-center',
            orientation === 'horizontal' ? 'flex-row' : 'flex-col'
          )}
        >
          <div
            className={cn(
              isConnected ? 'bg-green-500' : 'bg-yellow-500/50',
              orientation === 'horizontal' ? 'h-0.5' : 'w-0.5'
            )}
            style={{
              [orientation === 'horizontal' ? 'width' : 'height']: config.line,
            }}
          />
          <ArrowRight
            className={cn(
              isConnected ? 'text-green-500' : 'text-yellow-500',
              orientation === 'vertical' && 'rotate-90'
            )}
            style={{ width: config.icon, height: config.icon }}
          />
          <div
            className={cn(
              isConnected ? 'bg-green-500' : 'bg-yellow-500/50',
              orientation === 'horizontal' ? 'h-0.5' : 'w-0.5'
            )}
            style={{
              [orientation === 'horizontal' ? 'width' : 'height']: config.line / 2,
            }}
          />
        </div>
      </div>

      {/* Target indicator (if connected) */}
      {isConnected && (
        <div
          className="rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center"
          style={{ width: config.preview, height: config.preview }}
        >
          <Link
            className="text-blue-400"
            style={{ width: config.icon, height: config.icon }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Inline chain badge for compact display
 */
interface ChainBadgeProps {
  hasExtractedFrame: boolean;
  hasReferenceImage: boolean;
  className?: string;
}

export const ChainBadge: React.FC<ChainBadgeProps> = ({
  hasExtractedFrame,
  hasReferenceImage,
  className,
}) => {
  if (!hasExtractedFrame && !hasReferenceImage) return null;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {hasReferenceImage && (
        <span className="px-1 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
          <Link className="w-2.5 h-2.5" />
          IN
        </span>
      )}
      {hasExtractedFrame && (
        <span className="px-1 py-0.5 rounded text-[9px] bg-green-500/20 text-green-400 flex items-center gap-0.5">
          <ImageIcon className="w-2.5 h-2.5" />
          OUT
        </span>
      )}
    </div>
  );
};

export default ChainIndicator;
