import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  /** Characters per second */
  speed?: number;
  /** Skip animation (for historical messages) */
  skipAnimation?: boolean;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Render function for the revealed text */
  renderText?: (visibleText: string) => React.ReactNode;
  className?: string;
}

/**
 * Typewriter animation component that reveals text character-by-character.
 * Skips animation for historical messages. Shows a blinking cursor during animation.
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 40,
  skipAnimation = false,
  onComplete,
  renderText,
  className
}) => {
  const [displayedLength, setDisplayedLength] = useState(skipAnimation ? text.length : 0);
  const [isComplete, setIsComplete] = useState(skipAnimation);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const completeCalled = useRef(skipAnimation);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedLength(text.length);
      setIsComplete(true);
      return;
    }

    // Reset for new text
    setDisplayedLength(0);
    setIsComplete(false);
    completeCalled.current = false;

    const msPerChar = 1000 / speed;
    let currentLength = 0;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= msPerChar) {
        const charsToAdd = Math.floor(elapsed / msPerChar);
        currentLength = Math.min(currentLength + charsToAdd, text.length);
        setDisplayedLength(currentLength);
        lastTimeRef.current = timestamp;
      }

      if (currentLength < text.length) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
        if (!completeCalled.current) {
          completeCalled.current = true;
          onComplete?.();
        }
      }
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, speed, skipAnimation]);

  // If text changes while animating (e.g., streaming), jump to full text
  useEffect(() => {
    if (isComplete && displayedLength < text.length) {
      setDisplayedLength(text.length);
    }
  }, [text]);

  const visibleText = text.slice(0, displayedLength);

  return (
    <span className={className}>
      {renderText ? renderText(visibleText) : visibleText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 animate-pulse align-text-bottom" />
      )}
    </span>
  );
};
