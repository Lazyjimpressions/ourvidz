import { useState, useEffect } from 'react';

interface UseKeyboardVisibleResult {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to detect keyboard visibility on mobile devices.
 * Uses visualViewport API where available, falls back to resize detection.
 */
export const useKeyboardVisible = (): UseKeyboardVisibleResult => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;

    // Modern approach using visualViewport API
    if (window.visualViewport) {
      const viewport = window.visualViewport;

      const handleResize = () => {
        const heightDiff = initialHeight - viewport.height;
        const isVisible = heightDiff > 100; // Threshold to avoid false positives

        setIsKeyboardVisible(isVisible);
        setKeyboardHeight(isVisible ? heightDiff : 0);
      };

      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);

      return () => {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      };
    }

    // Fallback for older browsers - focus/blur detection
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Delay to allow keyboard to open
        setTimeout(() => {
          const heightDiff = initialHeight - window.innerHeight;
          const isVisible = heightDiff > 100;
          setIsKeyboardVisible(isVisible);
          setKeyboardHeight(isVisible ? heightDiff : 0);
        }, 300);
      }
    };

    const handleFocusOut = () => {
      // Delay to allow keyboard to close
      setTimeout(() => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }, 100);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
};

export default useKeyboardVisible;
