import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptScoringService } from '@/lib/services/PromptScoringService';
import { toast } from 'sonner';

interface QuickRatingProps {
  jobId: string;
  userId: string;
  className?: string;
}

/**
 * Write-only 5-star rating overlay for asset tiles.
 * No DB reads - stars always render empty until clicked.
 * On click, upserts a prompt_scores row via PromptScoringService.
 */
export const QuickRating = ({ jobId, userId, className }: QuickRatingProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submittedRating, setSubmittedRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayRating = hoverRating ?? submittedRating;

  const handleClick = useCallback(
    async (rating: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSubmitting) return;

      setIsSubmitting(true);
      setSubmittedRating(rating);

      const result = await PromptScoringService.upsertQuickRating(jobId, userId, rating);

      if (result.success) {
        toast.success(`Rated ${rating}/5`);
      } else {
        toast.error('Failed to save rating');
        setSubmittedRating(0);
      }

      setIsSubmitting(false);
    },
    [jobId, userId, isSubmitting]
  );

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={isSubmitting}
          onClick={(e) => handleClick(rating, e)}
          onMouseEnter={() => setHoverRating(rating)}
          onMouseLeave={() => setHoverRating(null)}
          className={cn(
            'p-0.5 transition-transform hover:scale-125 focus:outline-none',
            isSubmitting && 'cursor-not-allowed opacity-50'
          )}
          title={`Rate ${rating}/5`}
        >
          <Star
            className={cn(
              'w-3.5 h-3.5 transition-colors',
              rating <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-white/60 hover:text-yellow-300'
            )}
          />
        </button>
      ))}
    </div>
  );
};
