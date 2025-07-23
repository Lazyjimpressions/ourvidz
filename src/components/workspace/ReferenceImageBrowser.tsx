
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useReferenceUrls } from '@/hooks/useReferenceUrls';
import { toast } from 'sonner';

interface ReferenceImageBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export const ReferenceImageBrowser = ({
  isOpen,
  onClose,
  onSelect
}: ReferenceImageBrowserProps) => {
  const [images, setImages] = useState<{ path: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { getSignedUrl } = useReferenceUrls();

  const loadReferenceImages = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to browse reference images');
        return;
      }

      const { data, error } = await supabase.storage
        .from('reference_images')
        .list(`${user.id}/`, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading reference images:', error);
        toast.error('Failed to load reference images');
        return;
      }

      if (!data || data.length === 0) {
        setImages([]);
        return;
      }

      // Get signed URLs for all images
      const imagePromises = data
        .filter(file => file.name && !file.name.endsWith('/'))
        .map(async (file) => {
          const fullPath = `${user.id}/${file.name}`;
          const signedUrl = await getSignedUrl(fullPath);
          return signedUrl ? { path: fullPath, url: signedUrl } : null;
        });

      const imageResults = await Promise.all(imagePromises);
      const validImages = imageResults.filter(Boolean) as { path: string; url: string }[];
      
      setImages(validImages);
    } catch (error) {
      console.error('Error loading reference images:', error);
      toast.error('Failed to load reference images');
    } finally {
      setLoading(false);
    }
  }, [isOpen, getSignedUrl]);

  useEffect(() => {
    loadReferenceImages();
  }, [loadReferenceImages]);

  const handleImageSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Browse Reference Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading reference images...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Image className="w-12 h-12 mb-2" />
              <p>No reference images found</p>
              <p className="text-sm">Upload some reference images first</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="grid grid-cols-3 gap-3 p-1">
                {images.map((image) => (
                  <div
                    key={image.path}
                    className="relative aspect-square border border-gray-600 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors group"
                    onClick={() => handleImageSelect(image.url)}
                  >
                    <img
                      src={image.url}
                      alt="Reference"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
