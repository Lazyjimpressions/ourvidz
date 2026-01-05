import React, { useState, useEffect } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Eye, Sparkles, Loader2, Save, Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateCharacterPortrait } from '@/utils/characterImageUtils';
import { CharacterPreviewModal } from './CharacterPreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { useNavigate } from 'react-router-dom';
import { CharacterScene } from '@/types/roleplay';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

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
  reference_image_url?: string;
  seed_locked?: number;
  // New voice-related fields
  voice_examples?: string[];
  forbidden_phrases?: string[];
  scene_behavior_rules?: any;
  // User ownership
  user_id?: string;
  is_public?: boolean;
}

interface MobileCharacterCardProps {
  character: Character;
  onSelect: () => void;
  onPreview: () => void;
  onDelete?: (characterId: string) => Promise<void>;
}

export const MobileCharacterCard: React.FC<MobileCharacterCardProps> = ({
  character,
  onSelect,
  onPreview,
  onDelete
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveOption, setShowSaveOption] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [signedImageUrl, setSignedImageUrl] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['user-admin-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  // Determine if user can delete this character (owner OR admin)
  const isOwner = !!user && character.user_id === user.id;
  const canDeleteCharacter = !!onDelete && (isOwner || !!isAdmin);

  const imageUrl = character.image_url || character.preview_image_url;

  // Sign image URL if it's a private storage path
  useEffect(() => {
    const signImageUrl = async () => {
      if (!imageUrl) {
        setSignedImageUrl('');
        return;
      }

      // Check if URL needs signing (user-library or workspace-temp paths)
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
        try {
          const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
          const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
          setSignedImageUrl(signed);
        } catch (error: any) {
          console.error('Failed to sign image URL:', error);
          
          // Check if error is "Object not found" or similar storage error
          const errorMessage = error?.message || error?.toString() || '';
          const isNotFoundError = errorMessage.includes('Object not found') || 
                                 errorMessage.includes('not found') ||
                                 errorMessage.includes('404') ||
                                 errorMessage.includes('No such object');
          
          if (isNotFoundError) {
            console.log('🔧 Broken image detected, clearing character image URLs for:', character.name);
            
            // Automatically clear broken image URLs from character record
            try {
              const { error: updateError } = await supabase
                .from('characters')
                .update({
                  image_url: null,
                  reference_image_url: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', character.id);

              if (!updateError) {
                console.log('✅ Cleared broken image URLs for character:', character.name);
                // Clear local state to show "Generate" button
                setSignedImageUrl('');
              } else {
                console.error('Failed to clear broken image URLs:', updateError);
                setSignedImageUrl(imageUrl); // Fallback to original
              }
            } catch (clearError) {
              console.error('Error clearing broken image URLs:', clearError);
              setSignedImageUrl(imageUrl); // Fallback to original
            }
          } else {
            setSignedImageUrl(imageUrl); // Fallback to original for other errors
          }
        }
      } else {
        setSignedImageUrl(imageUrl); // Use as-is for public URLs
      }
    };

    signImageUrl();
  }, [imageUrl, character.id, character.name]);

  const displayImageUrl = signedImageUrl || imageUrl;

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Direct navigation - no modal blocker
    // This fixes the dark screen issue by eliminating modal/navigation race conditions
    navigate(`/roleplay/chat/${character.id}`);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  const handleStartChat = (selectedScene?: CharacterScene) => {
    // Close preview modal
    setShowPreview(false);
    
    // Direct navigation - no setTimeout delays that cause dark screen
    if (selectedScene) {
      // Navigate with scene context
      navigate(`/roleplay/chat/${character.id}/scene/${selectedScene.id}`);
    } else {
      // Navigate without scene context
      navigate(`/roleplay/chat/${character.id}`);
    }
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
      // Read selected image model from localStorage (set by DashboardSettings)
      const selectedImageModel = localStorage.getItem('roleplay_image_model') || undefined;

      // Use the new character image utility with selected model
      const result = await generateCharacterPortrait(character, user.id, {
        apiModelId: selectedImageModel
      });

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
        className={cn(
          "relative group cursor-pointer",
          "aspect-[3/4]", // Consistent portrait orientation across all contexts
          "rounded-lg overflow-hidden",
          "bg-card border border-border",
          "transition-all duration-200",
          "hover:shadow-lg hover:scale-[1.01] hover:border-blue-500/50",
          isTouchDevice && 'touch-manipulation',
          "shadow-sm"
        )}
        onClick={handleCardClick}
      >
        {/* Character Image */}
        <div className="relative w-full h-full">
          {displayImageUrl ? (
            <img 
              src={displayImageUrl} 
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
          
          {/* Content Rating Badge */}
          {character.content_rating && (
            <div className={cn(
              "absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm",
              character.content_rating === 'nsfw' 
                ? "bg-purple-600/80 text-white border border-purple-400/50"
                : "bg-green-600/80 text-white border border-green-400/50"
            )}>
              {character.content_rating.toUpperCase()}
            </div>
          )}

          {/* Generate Image Button - Only for cards without images */}
          {!displayImageUrl && user && (
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
          
          {/* Text Overlay - Enhanced with stats */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm line-clamp-1">{character.name}</h3>
                <p className="text-white/80 text-xs line-clamp-1 mt-0.5">{character.description}</p>
              </div>
              {/* Quick Start Badge - Moved here */}
              {character.quick_start && (
                <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5 flex-shrink-0">
                  Quick
                </Badge>
              )}
            </div>
            
            {/* Stats Row */}
            {(character.interaction_count !== undefined || character.likes_count !== undefined) && (
              <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                {character.interaction_count !== undefined && character.interaction_count > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{character.interaction_count.toLocaleString()}</span>
                  </div>
                )}
                {character.likes_count !== undefined && character.likes_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    <span>{character.likes_count.toLocaleString()}</span>
                  </div>
                )}
                {character.interaction_count !== undefined && character.interaction_count > 50 && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>Popular</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action Icons - Minimal, always visible on mobile */}
          <div 
            className={`absolute top-1 right-1 flex gap-1 ${
              isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity duration-200`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Generate Image Icon - Small and unobtrusive */}
            {user && displayImageUrl && (
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
        onDelete={onDelete ? () => onDelete(character.id) : undefined}
        canDelete={canDeleteCharacter}
      />
    </>
  );
};
