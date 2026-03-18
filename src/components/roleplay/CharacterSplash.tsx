import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CharacterSplashProps {
  characterName: string;
  characterImage: string;
  tagline?: string;
  /** Duration in ms before auto-dismiss */
  duration?: number;
  onComplete: () => void;
}

/**
 * Full-screen splash overlay shown when starting a new conversation.
 * Fades in the character portrait with name + tagline, then auto-dismisses.
 */
export const CharacterSplash: React.FC<CharacterSplashProps> = ({
  characterName,
  characterImage,
  tagline,
  duration = 2000,
  onComplete
}) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    // Enter -> visible
    const enterTimer = setTimeout(() => setPhase('visible'), 50);

    // Visible -> exit
    const exitTimer = setTimeout(() => setPhase('exit'), duration);

    // Exit -> complete
    const completeTimer = setTimeout(() => onComplete(), duration + 500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md",
        "transition-opacity duration-500",
        phase === 'enter' && "opacity-0",
        phase === 'visible' && "opacity-100",
        phase === 'exit' && "opacity-0"
      )}
      onClick={() => {
        setPhase('exit');
        setTimeout(onComplete, 500);
      }}
    >
      {/* Character Portrait */}
      <div className={cn(
        "w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-2xl",
        "transition-all duration-700 ease-out",
        phase === 'enter' ? "scale-90 opacity-0" : "scale-100 opacity-100"
      )}>
        <img
          src={characterImage}
          alt={characterName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Character Name */}
      <h1 className={cn(
        "mt-6 text-2xl md:text-3xl font-bold text-foreground tracking-tight",
        "transition-all duration-700 delay-200 ease-out",
        phase === 'enter' ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      )}>
        {characterName}
      </h1>

      {/* Tagline */}
      {tagline && (
        <p className={cn(
          "mt-2 text-sm text-muted-foreground max-w-xs text-center",
          "transition-all duration-700 delay-300 ease-out",
          phase === 'enter' ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        )}>
          {tagline}
        </p>
      )}

      {/* Tap to skip hint */}
      <p className={cn(
        "absolute bottom-8 text-xs text-muted-foreground/50",
        "transition-opacity duration-700 delay-500",
        phase === 'enter' ? "opacity-0" : "opacity-100"
      )}>
        Tap to skip
      </p>
    </div>
  );
};
