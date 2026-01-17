import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type SuggestionType = 'traits' | 'voice' | 'appearance' | 'description' | 'persona' | 'all';

interface SuggestButtonProps {
  type: SuggestionType;
  onClick: () => void;
  isLoading: boolean;
  loadingType: SuggestionType | null;
  disabled?: boolean;
  className?: string;
  variant?: 'icon' | 'text' | 'full';
}

const SUGGESTION_LABELS: Record<SuggestionType, string> = {
  traits: 'Suggest Traits',
  voice: 'Suggest Voice',
  appearance: 'Suggest Appearance',
  description: 'Suggest Description',
  persona: 'Suggest Persona',
  all: 'Enhance All',
};

const SUGGESTION_TOOLTIPS: Record<SuggestionType, string> = {
  traits: 'Generate AI-suggested personality traits',
  voice: 'Generate AI-suggested voice tone and examples',
  appearance: 'Generate AI-suggested appearance tags',
  description: 'Generate AI-suggested description',
  persona: 'Generate AI-suggested persona and backstory',
  all: 'Apply AI suggestions to all fields at once',
};

export function SuggestButton({
  type,
  onClick,
  isLoading,
  loadingType,
  disabled = false,
  className,
  variant = 'icon',
}: SuggestButtonProps) {
  const isCurrentlyLoading = isLoading && loadingType === type;
  const isDisabledByOther = isLoading && loadingType !== type;

  if (variant === 'full') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={cn('gap-2', className)}
      >
        {isCurrentlyLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {SUGGESTION_LABELS[type]}
      </Button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={cn(
          'text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1',
          (disabled || isDisabledByOther) && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {isCurrentlyLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        Suggest
      </button>
    );
  }

  // Icon variant (default)
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled || isLoading}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center',
              'text-muted-foreground hover:text-primary hover:bg-muted/50',
              'transition-colors duration-200',
              (disabled || isDisabledByOther) && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            {isCurrentlyLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {SUGGESTION_TOOLTIPS[type]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
