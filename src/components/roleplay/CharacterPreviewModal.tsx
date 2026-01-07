import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Settings,
  Heart,
  Sparkles,
  User,
  MessageCircle,
  Star,
  X,
  Image,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Plus
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { supabase } from '@/integrations/supabase/client';
import { CharacterScene } from '@/types/roleplay';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { SceneEditModal } from './SceneEditModal';
import { SceneGenerationModal } from './SceneGenerationModal';
import { CharacterEditModal } from './CharacterEditModal';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  preview_image_url?: string;
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
  interaction_count?: number;
  likes_count?: number;
  content_rating?: string;
  gender?: string;
  role?: string;
  quick_start?: boolean;
  user_id?: string;
}

interface CharacterPreviewModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (selectedScene?: CharacterScene) => void;
  onEditCharacter?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
}

export const CharacterPreviewModal: React.FC<CharacterPreviewModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartChat,
  onEditCharacter,
  onFavorite,
  isFavorite = false,
  onDelete,
  canDelete = false
}) => {
  const { isMobile } = useMobileDetection();
  const { user } = useAuth();
  const { toast } = useToast();
  const [signedImageUrl, setSignedImageUrl] = useState<string>('');
  const [characterScenes, setCharacterScenes] = useState<CharacterScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<CharacterScene | null>(null);
  const [isLoadingScenes, setIsLoadingScenes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [sceneToEdit, setSceneToEdit] = useState<CharacterScene | null>(null);
  const [showSceneGenerationModal, setShowSceneGenerationModal] = useState(false);
  const [showCharacterEditModal, setShowCharacterEditModal] = useState(false);

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

  // Check if user can manage this character's scenes (owner OR admin)
  const isOwner = !!user && !!character?.user_id && character.user_id === user.id;
  const canManageScenes = isOwner || !!isAdmin;

  // Removed excessive debug logging to prevent console spam

  if (!character) {
    console.log('❌ No character provided to modal');
    return null;
  }

  const imageUrl = character.image_url || character.preview_image_url;
  const hasImage = !!imageUrl;

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
        } catch (error) {
          console.error('Failed to sign image URL:', error);
          setSignedImageUrl(imageUrl); // Fallback to original
        }
      } else {
        setSignedImageUrl(imageUrl); // Use as-is for public URLs
      }
    };

    signImageUrl();
  }, [imageUrl]);

  // Load character scenes when character changes
  useEffect(() => {
    const loadCharacterScenes = async () => {
      if (!character?.id) {
        setCharacterScenes([]);
        setSelectedScene(null);
        return;
      }

      setIsLoadingScenes(true);
      try {
        const { data: scenes, error } = await supabase
          .from('character_scenes')
          .select('*')
          .eq('character_id', character.id)
          // .eq('is_active', true)  // Temporarily removed to debug
          .order('priority', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error loading character scenes:', error);
          setCharacterScenes([]);
        } else {
          setCharacterScenes(scenes || []);
          // Auto-select first scene if available
          if (scenes && scenes.length > 0 && !selectedScene) {
            setSelectedScene(scenes[0]);
          }
        }
      } catch (error) {
        console.error('Error loading character scenes:', error);
        setCharacterScenes([]);
      } finally {
        setIsLoadingScenes(false);
      }
    };

    loadCharacterScenes();
  }, [character?.id]);

  const handleStartChat = () => {
    // Close modal first
    const sceneToStart = selectedScene || undefined;
    onClose();
    
    // Direct navigation - no setTimeout delays that cause dark screen
    // The modal will close naturally as we navigate away
    onStartChat(sceneToStart);
  };

  const handleClose = () => {
    setSelectedScene(null); // Reset selection on close
    setShowDeleteConfirm(false); // Reset delete confirmation
    onClose();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) {
      console.log('❌ No onDelete handler provided');
      return;
    }

    console.log('🗑️ Starting character deletion for:', character?.id);
    setIsDeleting(true);
    try {
      await onDelete();
      console.log('✅ Character deleted successfully');
      toast({
        title: 'Character Deleted',
        description: `${character?.name} has been deleted.`,
      });
      handleClose();
    } catch (error) {
      console.error('❌ Error deleting character:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete character. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Scene deletion handlers
  const handleDeleteSceneClick = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent scene selection
    setSceneToDelete(sceneId);
  };

  const handleDeleteSceneConfirm = async () => {
    if (!sceneToDelete) return;

    setIsDeletingScene(true);
    try {
      const { error } = await supabase
        .from('character_scenes')
        .delete()
        .eq('id', sceneToDelete);

      if (error) throw error;

      // Remove from local state
      setCharacterScenes(prev => prev.filter(s => s.id !== sceneToDelete));

      // Clear selected scene if it was the deleted one
      if (selectedScene?.id === sceneToDelete) {
        setSelectedScene(null);
      }

      toast({
        title: 'Scene Deleted',
        description: 'The scenario has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting scene:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the scenario. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingScene(false);
      setSceneToDelete(null);
    }
  };

  const handleDeleteSceneCancel = () => {
    setSceneToDelete(null);
  };

  const handleSceneSelect = (scene: CharacterScene) => {
    setSelectedScene(scene);
  };

  const handleSceneCreated = async (sceneId: string) => {
    // Reload scenes to include the new one
    if (character?.id) {
      try {
        const { data: scenes, error } = await supabase
          .from('character_scenes')
          .select('*')
          .eq('character_id', character.id)
          .order('priority', { ascending: false })
          .limit(5);

        if (!error && scenes) {
          setCharacterScenes(scenes);
          // Auto-select the newly created scene
          const newScene = scenes.find(s => s.id === sceneId);
          if (newScene) {
            setSelectedScene(newScene);
          }
        }
      } catch (error) {
        console.error('Error reloading scenes:', error);
      }
    }
    setShowSceneGenerationModal(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only close if explicitly set to false (prevents accidental closes)
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent 
        className={`
          max-w-lg w-[95vw] h-[90vh] flex flex-col
          bg-card border-border p-0
          ${isMobile ? 'rounded-none' : 'rounded-lg'}
        `}
        hideClose={true} // Hide the built-in close button
      >
        {/* Header - Fixed */}
        <DialogHeader className="p-4 pb-2 flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-white line-clamp-1">
              {character.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Character Image Section */}
          <div className="mb-4">
            <div className={`
              relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900
              ${hasImage ? 'aspect-square' : 'aspect-[4/3]'}
            `}>
              {hasImage ? (
                <img 
                  src={signedImageUrl || imageUrl} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No Image</p>
                  </div>
                </div>
              )}

              {/* Quick Start Badge */}
              {character.quick_start && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
                  Quick Start
                </div>
              )}

              {/* Content Rating Badge */}
              {character.content_rating && (
                <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded font-medium">
                  {character.content_rating.toUpperCase()}
                </div>
              )}

              {/* Favorite Button */}
              {onFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFavorite}
                  className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 border-0"
                >
                  <Heart 
                    className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} 
                  />
                </Button>
              )}
            </div>
          </div>

          {/* Character Info Section */}
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">About {character.name}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {character.description}
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                {character.interaction_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{character.interaction_count} chats</span>
                  </div>
                )}
                {character.likes_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{character.likes_count} likes</span>
                  </div>
                )}
              </div>
              {character.role && (
                <Badge variant="outline" className="text-xs">
                  {character.role}
                </Badge>
              )}
            </div>

            {/* Character Scenes Section - Enhanced with Scene Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  Scenes {characterScenes.length > 0 && `(${characterScenes.length})`}
                </h4>
                {canManageScenes && (
                  <Button
                    onClick={() => setShowSceneGenerationModal(true)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-600/10"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Scene
                  </Button>
                )}
              </div>
              {characterScenes.length > 0 && (
                <div className="space-y-2">
                  {characterScenes.map(scene => (
                    <div
                      key={scene.id}
                      onClick={(e) => {
                        // Only select if not clicking on edit/delete buttons or in delete confirmation mode
                        const target = e.target as HTMLElement;
                        const isButton = target.closest('button') || target.tagName === 'BUTTON';
                        if (sceneToDelete !== scene.id && !isButton) {
                          handleSceneSelect(scene);
                        }
                      }}
                      className={`
                        text-xs text-gray-300 p-3 rounded border cursor-pointer transition-colors relative
                        ${selectedScene?.id === scene.id
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                          : 'border-gray-600 hover:bg-gray-800/50 hover:border-gray-500'
                        }
                        ${sceneToDelete === scene.id ? 'border-red-500/50 bg-red-600/10' : ''}
                      `}
                    >
                      {/* Delete Confirmation for this Scene */}
                      {sceneToDelete === scene.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-red-400 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Delete this scenario?</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSceneCancel(); }}
                              variant="outline"
                              size="sm"
                              className="flex-1 h-7 text-xs border-gray-600"
                              disabled={isDeletingScene}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSceneConfirm(); }}
                              variant="destructive"
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              disabled={isDeletingScene}
                            >
                              {isDeletingScene ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Scene Name and Description with Delete Button */}
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium text-gray-200">
                                  {scene.scene_name || 'Unnamed Scene'}
                                </div>
                                {!scene.scene_name && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-600/50 text-yellow-400 bg-yellow-600/10">
                                    Unnamed
                                  </Badge>
                                )}
                                {scene.priority !== undefined && scene.priority > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-600/50 text-blue-400 bg-blue-600/10">
                                    Priority {scene.priority}
                                  </Badge>
                                )}
                                {scene.created_at && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-600/50 text-gray-400 bg-gray-800/50">
                                    {new Date(scene.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Badge>
                                )}
                              </div>
                              {scene.scene_description && (
                                <div className={`text-gray-400 mt-1 text-xs leading-relaxed ${expandedScenes.has(scene.id) ? '' : 'line-clamp-2'}`}>
                                  {scene.scene_description}
                                </div>
                              )}
                            </div>
                            {canManageScenes && (
                              <div className="flex gap-1">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSceneToEdit(scene);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-blue-400 hover:bg-blue-600/10 flex-shrink-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={(e) => handleDeleteSceneClick(scene.id, e)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-red-600/10 flex-shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Scene Prompt - Expandable */}
                          <div className="mb-2">
                            <div className={`text-gray-300 text-xs leading-tight ${expandedScenes.has(scene.id) ? '' : 'line-clamp-2'}`}>
                              {scene.scene_prompt}
                            </div>
                            {scene.scene_prompt.length > 100 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedScenes(prev => {
                                    const next = new Set(prev);
                                    if (next.has(scene.id)) {
                                      next.delete(scene.id);
                                    } else {
                                      next.add(scene.id);
                                    }
                                    return next;
                                  });
                                }}
                                className="text-blue-400 hover:text-blue-300 text-xs mt-1 flex items-center gap-1"
                              >
                                {expandedScenes.has(scene.id) ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    Show more
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Scene Rules */}
                          {scene.scene_rules && (
                            <div className="text-gray-400 text-xs mb-2 p-2 bg-gray-800/50 rounded">
                              <span className="font-medium">Rules:</span> {scene.scene_rules}
                            </div>
                          )}

                          {/* Scene Starters */}
                          {scene.scene_starters && scene.scene_starters.length > 0 && (
                            <div className="text-gray-400 text-xs">
                              <span className="font-medium">Starters:</span>
                              <div className="mt-1 space-y-1">
                                {scene.scene_starters.slice(0, 2).map((starter, index) => (
                                  <div key={index} className="italic">"{starter}"</div>
                                ))}
                                {scene.scene_starters.length > 2 && (
                                  <div className="text-gray-500">+{scene.scene_starters.length - 2} more</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Scene Image Indicator */}
                          {scene.image_url && (
                            <div className="flex items-center gap-1 mt-2 text-gray-400">
                              <Image className="w-2 h-2" />
                              <span className="text-xs">Has image</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {characterScenes.length === 0 && canManageScenes && (
                <div className="text-xs text-gray-500 p-3 border border-gray-700 rounded text-center">
                  No scenes yet. Create one to get started!
                </div>
              )}
            </div>

            {/* Loading Scenes Indicator */}
            {isLoadingScenes && (
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 border border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                Loading scenes...
              </div>
            )}

            {/* Appearance Tags */}
            {character.appearance_tags && character.appearance_tags.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Appearance</h4>
                <div className="flex flex-wrap gap-1">
                  {character.appearance_tags.slice(0, 6).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-1">
                      {tag}
                    </Badge>
                  ))}
                  {character.appearance_tags.length > 6 && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      +{character.appearance_tags.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Personality Traits */}
            {character.traits && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Personality</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {character.traits}
                </p>
              </div>
            )}

            {/* Persona */}
            {character.persona && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Character</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {character.persona}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-4 pt-2 border-t border-border flex-shrink-0 bg-card">
          {/* Delete Confirmation UI */}
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Delete "{character.name}"? This cannot be undone.</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteCancel}
                  variant="outline"
                  size="lg"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleStartChat}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {selectedScene ? 'Start Scene' : 'Start Chat'}
              </Button>

              {(onEditCharacter || (isOwner || !!isAdmin)) && (
                <Button
                  onClick={onEditCharacter || (() => setShowCharacterEditModal(true))}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}

              {canDelete && onDelete && (
                <Button
                  onClick={handleDeleteClick}
                  variant="outline"
                  size="lg"
                  className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Scene Edit Modal */}
      <SceneEditModal
        isOpen={!!sceneToEdit}
        onClose={() => setSceneToEdit(null)}
        scene={sceneToEdit}
        onSceneUpdated={(updatedScene) => {
          // Update local state
          setCharacterScenes(prev => prev.map(s => s.id === updatedScene.id ? updatedScene : s));
          // Update selected scene if it was the edited one
          if (selectedScene?.id === updatedScene.id) {
            setSelectedScene(updatedScene);
          }
          setSceneToEdit(null);
        }}
      />

      {/* Scene Generation Modal */}
      <SceneGenerationModal
        isOpen={showSceneGenerationModal}
        onClose={() => setShowSceneGenerationModal(false)}
        characterId={character?.id}
        character={character}
        onSceneCreated={handleSceneCreated}
      />

      {/* Character Edit Modal */}
      <CharacterEditModal
        isOpen={showCharacterEditModal}
        onClose={() => setShowCharacterEditModal(false)}
        character={character}
        onCharacterUpdated={(updatedCharacter) => {
          // Character was updated - parent component should refresh
          if (onEditCharacter) {
            // If parent provided handler, use it
            onEditCharacter();
          }
          setShowCharacterEditModal(false);
          toast({
            title: "Character Updated",
            description: `${updatedCharacter.name || character?.name} has been updated.`,
          });
        }}
      />
    </Dialog>
  );
};
