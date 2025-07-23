
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useReferenceUrls } from '@/hooks/useReferenceUrls';

interface ReferenceImage {
  name: string;
  url: string;
  created_at: string;
}

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
  const [images, setImages] = useState<ReferenceImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { getSignedUrl } = useReferenceUrls();

  const loadReferenceImages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const { data: files, error } = await supabase.storage
        .from('reference_images')
        .list(user.id, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading reference images:', error);
        return;
      }

      if (files && files.length > 0) {
        const imagePromises = files
          .filter(file => file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/))
          .map(async (file) => {
            const filePath = `${user.id}/${file.name}`;
            const signedUrl = await getSignedUrl(filePath);
            
            return {
              name: file.name,
              url: signedUrl || '',
              created_at: file.created_at || ''
            };
          });

        const imageResults = await Promise.all(imagePromises);
        setImages(imageResults.filter(img => img.url));
      }
    } catch (error) {
      console.error('Error loading reference images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReferenceImages();
    }
  }, [isOpen]);

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Browse Reference Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search reference images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Images Grid */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading reference images...</span>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No images found matching your search.' : 'No reference images found.'}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={() => handleSelect(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white truncate">{image.name}</p>
                    </div>
                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Select</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
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
