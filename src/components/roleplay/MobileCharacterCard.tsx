import React, { useState, useEffect } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Eye, Sparkles, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateCharacterPortrait } from '@/utils/characterImageUtils';
import { CharacterPreviewModal } from './CharacterPreviewModal';
import { supabase } from '@/integrations/supabase/client';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  quick_start?: boolean;
  category?: string;
  consistency_method?: string;
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
  interaction_count?: number;
  likes_count?: number;
  content_rating?: string;
  gender?: string;
  role?: string;
}

interface MobileCharacterCardProps {
  character: Character;
  onSelect: () => void;
  onPreview: () => void;
}

export const MobileCharacterCard: React.FC<MobileCharacterCardProps> = ({
  character,
  onSelect,
  onPreview
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveOption, setShowSaveOption] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const imageUrl = character.image_url || character.preview_image_url;

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show preview modal instead of direct navigation
    setShowPreview(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  const handleStartChat = () => {
    setShowPreview(false);
    onSelect(); // Navigate to chat
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(true);
  };

  const generateCharacterImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isGenerating || !user) return;
    
    setIsGenerating(true);
    
    try {
      // Use the new character image utility
      const result = await generateCharacterPortrait(character, user.id);
      
      if (result.success) {
        console.log('✅ Character portrait generation started:', result.jobId);
        setLastJobId(result.jobId || null);
        toast({
          title: "Image Generation Started",
          description: "Character image is being generated. This may take a few moments.",
        });
      } else {
        console.error('❌ Character portrait generation failed:', result.error);
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate character image. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Generate image error:', error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating the image.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Monitor job completion for save-to-library option
  useEffect(() => {
    if (!lastJobId) return;

    const checkJobStatus = async () => {
      try {
        const { data: job } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', lastJobId)
          .single();

        if (job?.status === 'completed') {
          setShowSaveOption(true);
          setLastJobId(null);
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    };

    const interval = setInterval(checkJobStatus, 3000);
    return () => clearInterval(interval);
  }, [lastJobId]);

  const handleSaveToLibrary = async () => {
    try {
      // Find the workspace asset for this character's latest generation
      const { data: assets } = await supabase
        .from('workspace_assets')
        .select('id')
        .eq('user_id', user?.id)
        .contains('generation_settings', { character_id: character.id })
        .order('created_at', { ascending: false })
        .limit(1);

      if (assets && assets.length > 0) {
        const { error } = await supabase.functions.invoke('workspace-actions', {
          body: {
            action: 'save_to_library',
            assetId: assets[0].id,
            tags: ['character', 'portrait'],
            customTitle: `${character.name} Portrait`
          }
        });

        if (!error) {
          toast({
            title: "Saved to Library",
            description: `${character.name}'s portrait has been saved to your library.`,
          });
          setShowSaveOption(false);
        } else {
          toast({
            title: "Save Failed",
            description: "Failed to save image to library.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error saving to library:', error);
      toast({
        title: "Save Failed", 
        description: "An error occurred while saving.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div 
        className={`
          relative group cursor-pointer
          ${isMobile ? 'aspect-square' : 'aspect-[4/5]'}
          rounded-lg overflow-hidden
          bg-card border border-border
          transition-all duration-200
          hover:shadow-lg hover:scale-[1.02]
          ${isTouchDevice ? 'touch-manipulation' : ''}
        `}
        onClick={handleCardClick}
      >
        {/* Character Image */}
        <div className="relative w-full h-full">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={character.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No Image</p>
              </div>
            </div>
          )}
          
          {/* Quick Start Badge - Minimal */}
          {character.quick_start && (
            <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
              Quick
            </div>
          )}

          {/* Generate Image Button - Only for cards without images */}
          {!imageUrl && user && (
            <div 
              className="absolute inset-0 bg-black/20 flex items-center justify-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                onClick={generateCharacterImage}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 text-xs"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Text Overlay - Minimal and clean */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-white font-medium text-sm line-clamp-1">{character.name}</h3>
            <p className="text-white/70 text-xs line-clamp-1 mt-0.5">{character.description}</p>
          </div>
          
          {/* Action Icons - Minimal, always visible on mobile */}
          <div 
            className={`absolute top-1 right-1 flex gap-1 ${
              isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity duration-200`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Generate Image Icon - Small and unobtrusive */}
            {user && imageUrl && (
              <Button
                onClick={generateCharacterImage}
                disabled={isGenerating}
                size="sm"
                variant="secondary"
                className="w-6 h-6 p-0 bg-black/50 hover:bg-black/70 border-0"
                title="Generate New Image"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-3 h-3 text-white" />
                )}
              </Button>
            )}
            
            {/* Save to Library Option - Shows after successful generation */}
            {showSaveOption && (
              <Button
                onClick={handleSaveToLibrary}
                size="sm"
                variant="secondary"
                className="w-6 h-6 p-0 bg-green-600/80 hover:bg-green-600 border-0"
                title="Save to Library"
              >
                <Save className="w-3 h-3 text-white" />
              </Button>
            )}
            
            {/* Preview Button - Small and unobtrusive */}
            <Button
              onClick={handlePreview}
              size="sm"
              variant="secondary"
              className="w-6 h-6 p-0 bg-black/50 hover:bg-black/70 border-0"
              title="Preview Character"
            >
              <Eye className="w-3 h-3 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Character Preview Modal */}
      <CharacterPreviewModal
        character={character}
        isOpen={showPreview}
        onClose={handlePreviewClose}
        onStartChat={handleStartChat}
        onEditCharacter={undefined} // TODO: Add edit functionality if needed
        onFavorite={undefined} // TODO: Add favorite functionality if needed
        isFavorite={false}
      />
    </>
  );
};
