/**
 * Mobile Console Helper
 * 
 * Automatically injects Eruda console on mobile devices when accessing via local network
 * This allows viewing console logs directly on the phone without USB debugging
 */

export const initMobileConsole = () => {
  // Only enable on mobile devices accessing via local network
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isLocalNetwork = 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

  // Check if Eruda is already loaded
  if ((window as any).eruda) {
    return;
  }

  if (isMobile && isLocalNetwork) {
    console.log('📱 Mobile console: Initializing Eruda...');
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    script.async = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      (window as any).eruda.init();
      console.log('✅ Mobile console: Eruda initialized');
    };
    
    script.onerror = () => {
      console.error('❌ Mobile console: Failed to load Eruda');
    };
  }
};

// Auto-initialize on import (for development)
if (import.meta.env.DEV) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileConsole);
  } else {
    initMobileConsole();
  }
}



