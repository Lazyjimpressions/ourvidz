import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, X } from "lucide-react";
import { WorkspaceContentModal } from "@/components/WorkspaceContentModal";
import { AssetService } from '@/lib/services/AssetService';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
}

interface WorkspaceImageDisplayProps {
  onRegenerateItem: (itemId: string) => void;
}

export const WorkspaceImageDisplay = ({ onRegenerateItem }: WorkspaceImageDisplayProps) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchImages = async () => {
    try {
      setLoading(true);
      console.log('🖼️ Fetching images for workspace display...');
      
      const assets = await AssetService.getUserAssets();
      const imageAssets = assets
        .filter(asset => asset.type === 'image' && asset.status === 'completed' && asset.url)
        .slice(0, 6) // Show latest 6 images
        .map(asset => ({
          id: asset.id,
          url: asset.url!,
          prompt: asset.prompt,
          timestamp: asset.createdAt,
          quality: (asset.quality as 'fast' | 'high') || 'fast',
          modelType: asset.modelType
        }));

      console.log('✅ Images fetched for workspace:', imageAssets.length);
      setImages(imageAssets);
    } catch (error) {
      console.error('❌ Failed to fetch images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDownload = async (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  const handleRegenerate = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerateItem(image.id);
  };

  const handleRemoveAll = () => {
    setImages([]);
    toast.success('Images cleared from workspace');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Your creations will appear here</h3>
        <p className="text-gray-500">Generate your first image to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Generations</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchImages}
              className="text-gray-400 hover:text-white"
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAll}
              className="text-gray-400 hover:text-white p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group cursor-pointer bg-gray-900 rounded-lg overflow-hidden"
            onClick={() => {
              const index = images.findIndex(img => img.id === image.id);
              setSelectedIndex(index);
              setSelectedImage(image);
            }}
            >
              <img
                src={image.url}
                alt="Generated content"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  console.error('❌ Image failed to load:', image.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {/* Model Type Badge */}
              {image.modelType && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {image.modelType}
                </div>
              )}
              
              {/* Hover Controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white p-2"
                  onClick={(e) => handleDownload(image, e)}
                >
                  <Download className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white p-2"
                  onClick={(e) => handleRegenerate(image, e)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Full Resolution */}
      {selectedImage && (
        <WorkspaceContentModal
          tiles={images.map(image => ({
            id: image.id,
            originalAssetId: image.id,
            type: 'image' as const,
            url: image.url,
            prompt: image.prompt,
            timestamp: image.timestamp,
            quality: image.quality,
            modelType: image.modelType
          }))}
          currentIndex={selectedIndex}
          onClose={() => setSelectedImage(null)}
          onIndexChange={(newIndex) => {
            setSelectedIndex(newIndex);
            setSelectedImage(images[newIndex]);
          }}
        />
      )}
    </>
  );
};