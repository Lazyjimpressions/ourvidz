import React, { useState } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CharacterScene } from '@/types/roleplay';
import { CharacterCard } from '@/components/characters/CharacterCard';
import { CharacterPreviewModal } from './CharacterPreviewModal';
import { CharacterV2 } from '@/types/character-hub-v2';

// Extend the local Character interface to be compatible with CharacterV2
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
  voice_examples?: string[];
  forbidden_phrases?: string[];
  scene_behavior_rules?: any;
  user_id?: string;
  is_public?: boolean;
}

interface MobileCharacterCardProps {
  character: Character;
  onSelect: () => void;
  onPreview: () => void;
  onDelete?: (characterId: string) => Promise<void>;
  onEdit?: () => void;
}

export const MobileCharacterCard: React.FC<MobileCharacterCardProps> = ({
  character,
  onSelect,
  onPreview,
  onDelete,
  onEdit
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  // Check if user is admin (for delete permissions)
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

  const isOwner = !!user && character.user_id === user.id;
  const canDeleteCharacter = !!onDelete && (isOwner || !!isAdmin);

  const handleStartChat = (selectedScene?: CharacterScene) => {
    setShowPreview(false);
    if (selectedScene) {
      navigate(`/roleplay/chat/${character.id}/scene/${selectedScene.id}`);
    } else {
      navigate(`/roleplay/chat/${character.id}`);
    }
  };

  const handlePreviewOpen = () => {
    setShowPreview(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  return (
    <>
      <CharacterCard
        character={character as unknown as CharacterV2}
        context="roleplay"
        onSelect={onSelect}
        onPreview={handlePreviewOpen}
        onEdit={onEdit}
        onDelete={onDelete}
      // Roleplay specific overrides if needed
      />

      <CharacterPreviewModal
        character={character}
        isOpen={showPreview}
        onClose={handlePreviewClose}
        onStartChat={handleStartChat}
        onEditCharacter={character.role === 'user' && onEdit ? onEdit : undefined}
        onFavorite={undefined}
        isFavorite={false}
        onDelete={onDelete ? () => onDelete(character.id) : undefined}
        canDelete={canDeleteCharacter}
      />
    </>
  );
};
