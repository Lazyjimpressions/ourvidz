import { useState, useEffect } from 'react';
import { urlSigningService } from '@/lib/services/UrlSigningService';

/**
 * Shared hook for signing Supabase storage URLs.
 * Thin wrapper around urlSigningService — no new caching or concurrency logic.
 * 
 * Auto-detects bucket from URL path (user-library vs workspace-temp).
 * Skips signing for already-signed URLs, absolute public URLs, and data URIs.
 * 
 * @param url - Raw storage path or absolute URL
 * @returns { signedUrl, isLoading }
 */
export function useSignedUrl(url: string | null | undefined): {
  signedUrl: string;
  isLoading: boolean;
} {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setSignedUrl('');
      return;
    }

    // Skip signing for data URIs
    if (url.startsWith('data:')) {
      setSignedUrl(url);
      return;
    }

    // Skip signing if already signed (has token param)
    if (url.includes('?token=') || url.includes('&token=')) {
      setSignedUrl(url);
      return;
    }

    // Determine if URL needs signing (private bucket paths)
    const needsSigning =
      url.includes('user-library/') || url.includes('workspace-temp/');

    // Detect bare storage paths (e.g. "userId/portraits/file.png") — no protocol, no leading slash
    const isBareStoragePath =
      !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:') && !needsSigning;

    if (!needsSigning && !isBareStoragePath) {
      setSignedUrl(url);
      return;
    }

    // Auto-detect bucket: bare paths default to user-library
    const bucket: 'user-library' | 'workspace-temp' = url.includes('workspace-temp/')
      ? 'workspace-temp'
      : 'user-library';

    let cancelled = false;
    setIsLoading(true);

    urlSigningService
      .getSignedUrl(url, bucket)
      .then((signed) => {
        if (!cancelled) setSignedUrl(signed);
      })
      .catch((err) => {
        console.error('useSignedUrl: signing failed, using original:', err);
        if (!cancelled) setSignedUrl(url);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { signedUrl, isLoading };
}
