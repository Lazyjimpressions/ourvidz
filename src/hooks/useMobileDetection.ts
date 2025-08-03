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
  const [mobileDetection, setMobileDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    screenHeight: 0,
    isTouchDevice: false
  });

  useEffect(() => {
    const updateMobileDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Check if device supports touch
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Determine device type based on screen width
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;

      setMobileDetection({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        isTouchDevice
      });
    };

    // Initial detection
    updateMobileDetection();

    // Update on resize
    window.addEventListener('resize', updateMobileDetection);

    return () => {
      window.removeEventListener('resize', updateMobileDetection);
    };
  }, []);

  return mobileDetection;
}; 