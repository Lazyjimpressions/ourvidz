import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePromptScores } from '@/hooks/usePromptScores';

interface QuickRatingProps {
  jobId: string | null;
  className?: string;
}

/**
 * Quick 5-star rating overlay for asset tiles
 * Applies the same rating to all 3 dimensions (action, appearance, quality)
 */
export const QuickRating = ({ jobId, className }: QuickRatingProps) => {
  const { score, submitQuickRating, isLoading } = usePromptScores(jobId);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Get current rating from user ratings or admin ratings
  const currentRating = score?.user_action_rating || score?.admin_action_rating || 0;
  const displayRating = hoverRating ?? currentRating;

  const handleClick = useCallback(
    (rating: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!jobId || isLoading) return;
      submitQuickRating(rating);
    },
    [jobId, isLoading, submitQuickRating]
  );

  const handleMouseEnter = useCallback((rating: number) => {
    setHoverRating(rating);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverRating(null);
  }, []);

  // Debug logging
  console.log('⭐ QuickRating:', { jobId, hasScore: !!score, currentRating });

  // Don't render if no job ID (no score record can exist)
  if (!jobId) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded px-1.5 py-1',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={isLoading}
          onClick={(e) => handleClick(rating, e)}
          onMouseEnter={() => handleMouseEnter(rating)}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'p-0.5 transition-transform hover:scale-110 focus:outline-none',
            isLoading && 'cursor-not-allowed opacity-50'
          )}
          title={`Rate ${rating}/5`}
        >
          <Star
            className={cn(
              'w-3.5 h-3.5 transition-colors',
              rating <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-gray-400 hover:text-yellow-300'
            )}
          />
        </button>
      ))}
    </div>
  );
};
