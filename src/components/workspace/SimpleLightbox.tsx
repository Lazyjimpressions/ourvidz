
import React from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SimpleLightboxProps {
  asset: {
    id: string;
    url: string;
    type: 'image' | 'video';
    prompt?: string;
  };
  onClose: () => void;
  onDelete: () => void;
}

export const SimpleLightbox: React.FC<SimpleLightboxProps> = ({
  asset,
  onClose,
  onDelete
}) => {
  const handleDownload = async () => {
    if (!asset.url) return;
    
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${asset.type}-${asset.id}.${asset.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      {/* Header with controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          className="bg-gray-700/80 hover:bg-gray-600"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDelete}
          className="bg-red-600/80 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="bg-gray-700/80 hover:bg-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Media content */}
      <div className="max-w-full max-h-full p-4">
        {asset.type === 'image' ? (
          <img
            src={asset.url}
            alt={asset.prompt || 'Generated image'}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={asset.url}
            controls
            className="max-w-full max-h-full"
            autoPlay
          />
        )}
      </div>

      {/* Footer with prompt */}
      {asset.prompt && (
        <div className="absolute bottom-4 left-4 right-4 text-white text-center">
          <p className="text-sm bg-black/50 px-3 py-2 rounded">
            {asset.prompt}
          </p>
        </div>
      )}
    </div>
  );
};
