import React, { useState, useEffect } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Sparkles, Loader2, MessageCircle, Heart, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateCharacterPortrait } from '@/utils/characterImageUtils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CharacterV2 } from '@/types/character-hub-v2';
import { CharacterCardOverlay } from './CharacterCardOverlay';
import { AssetTile } from '@/components/shared/AssetTile';
import { useSignedUrl } from '@/hooks/useSignedUrl';

export type CharacterCardContext = 'roleplay' | 'hub' | 'library';

export interface CharacterCardProps {
    character: CharacterV2;
    context: CharacterCardContext;
    onSelect?: () => void;
    onPreview?: () => void;
    onEdit?: () => void;
    onDelete?: (characterId: string) => Promise<void>;
    onGenerate?: () => void;
    onDuplicate?: () => void;
    onSendToWorkspace?: () => void;
    className?: string;
    showStats?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
    character,
    context,
    onSelect,
    onPreview,
    onEdit,
    onDelete,
    onGenerate,
    onDuplicate,
    onSendToWorkspace,
    className,
    showStats = true
}) => {
    const { isMobile, isTouchDevice } = useMobileDetection();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

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

    const imageUrl = character.image_url || character.preview_image_url;
    const { signedUrl: displayImageUrl } = useSignedUrl(imageUrl);

    const handleCardClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Mobile: Toggle overlay on tap
        if (isTouchDevice) {
            setShowOverlay(!showOverlay);
        } else if (onSelect) {
            onSelect();
        }
    };

    const handleGenerateImage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isGenerating || !user) return;

        // If external handler provided (e.g. from Hub), use it
        if (onGenerate) {
            onGenerate();
            return;
        }

        // Default generation logic (fallback)
        setIsGenerating(true);
        try {
            const selectedImageModel = localStorage.getItem('roleplay_image_model') || undefined;
            const result = await generateCharacterPortrait(character, user.id, {
                apiModelId: selectedImageModel
            });

            if (result.success) {
                toast({
                    title: "Image Generation Started",
                    description: "Character image is being generated...",
                });
            } else {
                toast({
                    title: "Generation Failed",
                    description: result.error || "Failed to start generation",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Generation error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AssetTile
            src={displayImageUrl}
            alt={character.name}
            aspectRatio="3/4"
            onClick={handleCardClick}
            onMouseEnter={() => !isTouchDevice && setShowOverlay(true)}
            onMouseLeave={() => !isTouchDevice && setShowOverlay(false)}
            className={className}
        >
            {/* Content Rating Badge */}
            {character.content_rating && (
                <div className={cn(
                    "absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm z-10",
                    character.content_rating === 'nsfw'
                        ? "bg-purple-600/80 text-white border border-purple-400/50"
                        : "bg-green-600/80 text-white border border-green-400/50"
                )}>
                    {character.content_rating.toUpperCase()}
                </div>
            )}

            {/* Generate Button (Empty State) */}
            {!displayImageUrl && user && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Button
                        onClick={handleGenerateImage}
                        disabled={isGenerating}
                        size="sm"
                        className="bg-primary/90 hover:bg-primary"
                    >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                        Generate
                    </Button>
                </div>
            )}

            {/* Overlay (Context Aware) */}
            <CharacterCardOverlay
                isOpen={showOverlay}
                context={context}
                onPreview={onPreview}
                onChat={onSelect}
                onEdit={onEdit}
                onGenerate={handleGenerateImage}
                onDuplicate={onDuplicate}
                onDelete={onDelete ? () => onDelete(character.id) : undefined}
                onSendToWorkspace={onSendToWorkspace}
                isOwner={user?.id === character.user_id || !!isAdmin}
            />

            {/* Text Details (Bottom Gradient) */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-200",
                showOverlay && !isTouchDevice ? "opacity-0" : "opacity-100"
            )}>
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm line-clamp-1">{character.name}</h3>
                        <p className="text-white/80 text-[10px] line-clamp-1 mt-0.5">{character.description}</p>
                    </div>
                    {character.quick_start && (
                        <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
                            Quick
                        </Badge>
                    )}
                </div>

                {/* Stats Row */}
                {showStats && (character.interaction_count !== undefined || character.likes_count !== undefined) && (
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/70">
                        {character.interaction_count !== undefined && character.interaction_count > 0 && (
                            <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                <span>{character.interaction_count.toLocaleString()}</span>
                            </div>
                        )}
                        {character.likes_count !== undefined && character.likes_count > 0 && (
                            <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-white/20" />
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
        </AssetTile>
    );
};
