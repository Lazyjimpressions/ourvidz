// Legacy compatibility layer - redirects to AssetService
import { AssetService, type UnifiedAsset } from './AssetService';

// Extended UnifiedAsset with legacy properties for compatibility
export interface LazyAsset extends UnifiedAsset {
  signedUrls?: string[];
  bucketHint?: string;
}

// Re-export AssetService as OptimizedAssetService for compatibility
export class OptimizedAssetService extends AssetService {
  // Legacy method for generating asset URLs - fixed signature
  static async generateAssetUrls(assets: LazyAsset[]): Promise<LazyAsset[]>;
  static async generateAssetUrls(asset: LazyAsset): Promise<LazyAsset>;
  static async generateAssetUrls(input: LazyAsset | LazyAsset[]): Promise<LazyAsset | LazyAsset[]> {
    if (Array.isArray(input)) {
      const updatedAssets = await Promise.all(
        input.map(async (asset) => {
          const mainUrl = await this.generateURL(asset);
          const thumbnailUrl = await this.generateThumbnailURL(asset);
          
          return {
            ...asset,
            url: mainUrl || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            signedUrls: [mainUrl, thumbnailUrl].filter(Boolean) as string[],
          };
        })
      );
      return updatedAssets;
    } else {
      const mainUrl = await this.generateURL(input);
      const thumbnailUrl = await this.generateThumbnailURL(input);
      
      return {
        ...input,
        url: mainUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        signedUrls: [mainUrl, thumbnailUrl].filter(Boolean) as string[],
      };
    }
  }
}

// Re-export the UnifiedAsset type for compatibility
export { type UnifiedAsset } from './AssetService';