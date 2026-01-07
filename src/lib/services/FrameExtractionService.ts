/**
 * FrameExtractionService
 *
 * Handles client-side frame extraction from video clips for frame chaining.
 * Uses canvas-based extraction for browser compatibility.
 */

import { supabase } from '@/integrations/supabase/client';
import { getOptimalExtractionPercentage } from '@/types/storyboard';

export interface ExtractedFrame {
  blob: Blob;
  dataUrl: string;
  timestampMs: number;
  percentage: number;
  width: number;
  height: number;
}

export interface FrameExtractionOptions {
  format?: 'image/png' | 'image/jpeg';
  quality?: number; // 0-1 for jpeg
}

/**
 * FrameExtractionService - Client-side video frame extraction
 */
export class FrameExtractionService {
  /**
   * Extract a single frame from a video at a given percentage
   */
  static async extractFrameFromVideo(
    videoUrl: string,
    percentage: number,
    options: FrameExtractionOptions = {}
  ): Promise<ExtractedFrame> {
    const { format = 'image/png', quality = 0.95 } = options;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      // Handle load errors
      video.onerror = () => {
        reject(new Error('Failed to load video for frame extraction'));
      };

      video.onloadedmetadata = () => {
        // Calculate target time from percentage
        const targetTime = video.duration * (percentage / 100);
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        try {
          // Create canvas and draw video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob from canvas'));
                return;
              }

              const dataUrl = canvas.toDataURL(format, quality);

              resolve({
                blob,
                dataUrl,
                timestampMs: Math.round(video.currentTime * 1000),
                percentage,
                width: canvas.width,
                height: canvas.height,
              });
            },
            format,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      video.src = videoUrl;
      video.load();
    });
  }

  /**
   * Extract multiple frames from a video for selection
   */
  static async extractMultipleFrames(
    videoUrl: string,
    count: number = 5,
    rangeStart: number = 40,
    rangeEnd: number = 65,
    options: FrameExtractionOptions = {}
  ): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];
    const step = (rangeEnd - rangeStart) / (count - 1);

    for (let i = 0; i < count; i++) {
      const percentage = rangeStart + step * i;
      try {
        const frame = await this.extractFrameFromVideo(videoUrl, percentage, options);
        frames.push(frame);
      } catch (err) {
        console.error(`Failed to extract frame at ${percentage}%:`, err);
        // Continue with other frames
      }
    }

    return frames;
  }

  /**
   * Get optimal extraction range based on clip duration
   */
  static getOptimalRange(durationSeconds: number): { min: number; max: number; default: number } {
    return getOptimalExtractionPercentage(durationSeconds);
  }

  /**
   * Upload extracted frame to Supabase storage
   */
  static async uploadExtractedFrame(
    blob: Blob,
    clipId: string,
    percentage: number
  ): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const timestamp = Date.now();
    const extension = blob.type === 'image/png' ? 'png' : 'jpg';
    const fileName = `${userData.user.id}/storyboard-frames/${clipId}_${timestamp}_${Math.round(percentage)}.${extension}`;

    const { data, error } = await supabase.storage
      .from('workspace-temp')
      .upload(fileName, blob, {
        contentType: blob.type,
        upsert: true,
      });

    if (error) {
      console.error('Error uploading frame:', error);
      throw error;
    }

    // Create signed URL (workspace-temp is private)
    const { data: signedData, error: signError } = await supabase.storage
      .from('workspace-temp')
      .createSignedUrl(data.path, 86400); // 24 hour expiry

    if (signError) {
      console.error('Error creating signed URL:', signError);
      throw signError;
    }

    return signedData.signedUrl;
  }

  /**
   * Get video duration without fully loading the video
   */
  static async getVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      video.onerror = () => reject(new Error('Failed to load video metadata'));

      video.onloadedmetadata = () => {
        resolve(video.duration);
      };

      video.src = videoUrl;
      video.load();
    });
  }

  /**
   * Generate a signed URL for a video if needed (for CORS)
   */
  static async getSignedVideoUrl(videoPath: string): Promise<string> {
    // If it's already a full URL, return as-is
    if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
      return videoPath;
    }

    // Determine bucket from path or default to workspace-temp
    let bucket = 'workspace-temp';
    let path = videoPath;

    // Check for known bucket prefixes
    const knownBuckets = ['workspace-temp', 'user-library', 'videos', 'video_high'];
    for (const b of knownBuckets) {
      if (videoPath.startsWith(`${b}/`)) {
        bucket = b;
        path = videoPath.substring(b.length + 1);
        break;
      }
    }

    // Create signed URL for storage path
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  }

  /**
   * Create thumbnail from frame for display
   */
  static createThumbnail(
    dataUrl: string,
    maxWidth: number = 200,
    maxHeight: number = 120
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');

        // Calculate scaled dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = height * (maxWidth / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = width * (maxHeight / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = dataUrl;
    });
  }
}
