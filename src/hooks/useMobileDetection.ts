import { useState, useEffect } from 'react';

export interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  isTouchDevice: boolean;
}

export const useMobileDetection = (): MobileDetection => {
  const compute = (): MobileDetection => {
    // During SSR/test environments window may be undefined
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;

    // Check if device supports touch
    const isTouchDevice =
      typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Determine device type based on screen width
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    return {
      isMobile,
      isTablet,
      isDesktop,
      screenWidth: width,
      screenHeight: height,
      isTouchDevice,
    };
  };

  // Initialize from the *real* viewport to avoid a desktop→mobile (or mobile→desktop) flicker
  const [mobileDetection, setMobileDetection] = useState<MobileDetection>(() => compute());

  useEffect(() => {
    let raf = 0;

    const onResize = () => {
      // Coalesce rapid resize events (mobile address bar, orientation changes, etc.)
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMobileDetection(compute()));
    };

    // Ensure we’re synced on mount
    onResize();

    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return mobileDetection;
};