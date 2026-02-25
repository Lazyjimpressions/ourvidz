/**
 * Probe the duration of a video from a URL using an HTML5 video element.
 * Works with signed Supabase storage URLs (requires CORS).
 * 
 * @param url - Absolute URL to the video
 * @returns Duration in seconds, or 0 if probing fails
 */
export const probeVideoDurationFromUrl = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.crossOrigin = 'anonymous';
    vid.onloadedmetadata = () => {
      const dur = vid.duration;
      vid.src = ''; // release network
      resolve(isFinite(dur) ? dur : 0);
    };
    vid.onerror = () => {
      console.warn('⚠️ probeVideoDurationFromUrl failed for:', url.substring(0, 60));
      resolve(0);
    };
    vid.src = url;
  });
};
