import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Heart, 
  MessageSquare, 
  Volume2, 
  History, 
  Palette, 
  User, 
  Sparkles,
  Image as ImageIcon,
  Play,
  Edit,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { useSceneNavigation } from '@/hooks/useSceneNavigation';
import { useGeneration } from '@/hooks/useGeneration';
import { useToast } from '@/hooks/use-toast';
import { SceneCard } from './SceneCard';
import { MultiCharacterSceneCard } from './MultiCharacterSceneCard';
import { SceneGenerationModal } from './SceneGenerationModal';
import { CharacterEditModal } from './CharacterEditModal';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';
import { uploadGeneratedImageToAvatars } from '@/utils/avatarUtils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CharacterDetailPaneProps {
  characterId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartConversation?: () => void;
  className?: string;
}

export const CharacterDetailPane: React.FC<CharacterDetailPaneProps> = ({
  characterId,
  isOpen,
  onClose,
  onStartConversation,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'scenes' | 'voice' | 'history'>('details');
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const { character, isLoading, likeCharacter, loadCharacter } = useCharacterData(characterId);
  const { scenes, isLoading: scenesLoading, createScene } = useCharacterScenes(characterId);
  const { startSceneChat } = useSceneNavigation();
  const { generateContent, isGenerating, cancelGeneration } = useGeneration();
  const { toast } = useToast();
  const { user } = useAuth();

  // Don't return null - let the parent handle conditional rendering

  const tabs = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'scenes', label: 'Scenes', icon: ImageIcon },
    { id: 'voice', label: 'Voice', icon: Volume2 },
    { id: 'history', label: 'History', icon: History },
  ] as const;

  const handleSceneClick = (sceneId: string, participants?: any[]) => {
    if (participants && participants.length > 0) {
      startSceneChat(sceneId, participants, characterId);
    } else {
      // Single character scene
      startSceneChat(sceneId, [{ id: characterId, name: character?.name }], characterId);
    }
  };

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleStartConversation = () => {
    if (onStartConversation) {
      onStartConversation();
    }
  };

  const handleLikeCharacter = () => {
    if (character) {
      likeCharacter(character.id);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!character || !user) return;
    
    setIsGeneratingAvatar(true);
    setAvatarPreview(null);
    
    try {
      const prompt = buildCharacterPortraitPrompt({
        name: character.name,
        description: character.description,
        persona: character.persona,
        traits: character.traits,
        appearance_tags: character.appearance_tags || []
      });

      const onComplete = async (e: any) => {
        const detail = e?.detail || {};
        if (detail.type !== 'image') return;
        
        let imageUrl = detail.imageUrl;
        
        // If no imageUrl, fetch from workspace_assets using assetId
        if (!imageUrl && detail.assetId) {
          try {
            const { data: asset } = await supabase
              .from('workspace_assets')
              .select('temp_storage_path')
              .eq('id', detail.assetId)
              .single();
            
            if (asset?.temp_storage_path) {
              imageUrl = asset.temp_storage_path;
            }
          } catch (error) {
            console.error('Failed to fetch asset URL:', error);
            toast({ title: 'Error', description: 'Could not load generated image', variant: 'destructive' });
            setIsGeneratingAvatar(false);
            window.removeEventListener('generation-completed', onComplete as any);
            return;
          }
        }
        
        if (imageUrl) {
          setAvatarPreview(imageUrl);
        }
        setIsGeneratingAvatar(false);
        window.removeEventListener('generation-completed', onComplete as any);
      };

      window.addEventListener('generation-completed', onComplete as any);
      
      // Add timeout to clear generating state
      setTimeout(() => {
        if (isGeneratingAvatar) {
          setIsGeneratingAvatar(false);
          window.removeEventListener('generation-completed', onComplete as any);
        }
      }, 300000); // 5 minutes timeout

      await generateContent({
        format: 'sdxl_image_high',
        prompt,
        metadata: { 
          model_variant: 'lustify_sdxl',
          character_name: character.name
        }
      });
    } catch (err) {
      console.error('Avatar generation failed', err);
      toast({ title: 'Generation failed', description: 'Could not generate avatar', variant: 'destructive' });
      setIsGeneratingAvatar(false);
    }
  };

  const handleUseAvatar = async () => {
    if (!avatarPreview || !character || !user) return;
    
    try {
      // Fetch the image and upload to avatars bucket
      const response = await fetch(avatarPreview);
      const imageBlob = await response.blob();
      
      const avatarUrl = await uploadGeneratedImageToAvatars(
        imageBlob,
        user.id,
        character.name,
        'character'
      );
      
      // Update character image_url in database
      const { error } = await supabase
        .from('characters')
        .update({ image_url: avatarUrl })
        .eq('id', character.id);
      
      if (error) throw error;
      
      // Reload character data to show new avatar
      loadCharacter(character.id);
      setAvatarPreview(null);
      toast({ title: 'Avatar updated', description: 'Character avatar has been updated' });
    } catch (error) {
      console.error('Failed to update avatar:', error);
      toast({ title: 'Error', description: 'Failed to update character avatar', variant: 'destructive' });
    }
  };

  const handleRejectAvatar = () => {
    setAvatarPreview(null);
  };

  return (
    <div className={cn(
      "fixed right-0 top-0 w-80 h-full bg-background border-l border-border flex flex-col z-40 transform transition-transform duration-300",
      isOpen ? "translate-x-0" : "translate-x-full",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-foreground text-sm">Character</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Close character panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Character Preview */}
        {character && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <img
                src={character.reference_image_url || character.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${character.name}`}
                alt={character.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate text-sm">{character.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {character.interaction_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {character.likes_count}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeCharacter}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                title="Like character"
              >
                <Heart className="w-3 h-3" />
              </Button>
            </div>

            {/* Avatar Preview */}
            {avatarPreview && (
              <div className="bg-muted rounded-lg p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">New Avatar Preview</span>
                </div>
                <img
                  src={avatarPreview}
                  alt="Generated avatar preview"
                  className="w-full aspect-square rounded-md object-cover"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUseAvatar}
                    className="flex-1 h-6 text-xs"
                  >
                    Use Avatar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRejectAvatar}
                    className="flex-1 h-6 text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-3 py-1.5 border-b border-border flex-shrink-0">
        <div className="flex space-x-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-7 text-xs px-2 rounded-md",
                  activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3 h-3 mr-1" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content - Properly constrained scrollable area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3">
            {activeTab === 'details' && character && (
              <div className="space-y-3">
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-foreground text-sm">Description</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection('description')}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Sparkles className="w-3 h-3" />
                    </Button>
                  </div>
                  {!collapsedSections.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {character.description}
                    </p>
                  )}
                </div>

                {/* Personality */}
                {character.persona && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground text-sm">Personality</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('personality')}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Button>
                    </div>
                    {!collapsedSections.personality && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {character.persona}
                      </p>
                    )}
                  </div>
                )}

                {/* Traits */}
                {character.traits && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground text-sm">Traits</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('traits')}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Button>
                    </div>
                    {!collapsedSections.traits && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {character.traits}
                      </p>
                    )}
                  </div>
                )}

                {/* Tags */}
                {character.appearance_tags && character.appearance_tags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground text-sm">Tags</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('tags')}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Button>
                    </div>
                    {!collapsedSections.tags && (
                      <div className="flex flex-wrap gap-1">
                        {character.appearance_tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Tone */}
                {character.voice_tone && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground text-sm">Voice Tone</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('voice_tone')}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Button>
                    </div>
                    {!collapsedSections.voice_tone && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {character.voice_tone}
                      </p>
                    )}
                  </div>
                )}

                {/* Mood */}
                {character.mood && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground text-sm">Mood</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('mood')}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Button>
                    </div>
                    {!collapsedSections.mood && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {character.mood}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scenes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground text-sm">Scenes</h4>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-xs"
                    onClick={() => setShowSceneModal(true)}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                </div>

                {scenesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-lg aspect-[4/3] animate-pulse" />
                    ))}
                  </div>
                 ) : scenes.length > 0 ? (
                   <div className="space-y-2">
                     {scenes.map((scene) => {
                       const sceneMetadata = scene.generation_metadata || {};
                       const isMultiCharacter = sceneMetadata.sceneType === 'multi' && sceneMetadata.participants?.length > 1;
                       
                       return (
                         <div key={scene.id} className="w-full">
                           {isMultiCharacter ? (
                             <MultiCharacterSceneCard
                               id={scene.id}
                               title={scene.scene_prompt || 'Untitled Scene'}
                               participants={sceneMetadata.participants || []}
                               backgroundImage={scene.image_url}
                               onClick={() => handleSceneClick(scene.id, sceneMetadata.participants)}
                               onStartChat={() => handleSceneClick(scene.id, sceneMetadata.participants)}
                               className="w-full"
                             />
                           ) : (
                             <SceneCard
                               id={scene.id}
                               title={scene.scene_prompt || 'Untitled Scene'}
                               characterNames={[character?.name || 'Character']}
                               backgroundImage={scene.image_url}
                               gradient="bg-gradient-to-br from-primary/20 to-primary/10"
                               onClick={() => handleSceneClick(scene.id)}
                               className="w-full"
                             />
                           )}
                         </div>
                       );
                     })}
                   </div>
                 ) : (
                   <div className="text-center py-6">
                     <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                     <p className="text-xs text-muted-foreground">No scenes yet</p>
                     <p className="text-xs text-muted-foreground/70 mt-0.5">
                       Generate scenes for this character
                     </p>
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-3">
                <h4 className="font-medium text-foreground text-sm">Voice Settings</h4>
                <div className="space-y-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Default Voice</span>
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Natural, conversational tone
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                <h4 className="font-medium text-foreground text-sm">Chat History</h4>
                <div className="text-center py-6">
                  <History className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No chat history</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Start a conversation to see history
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
        <Button 
          onClick={handleStartConversation}
          className="w-full h-8 text-sm"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Start Conversation
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs"
            onClick={() => setShowSceneModal(true)}
          >
            <Palette className="w-3 h-3 mr-1" />
            Scene
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs"
            onClick={handleGenerateAvatar}
            disabled={isGeneratingAvatar}
          >
            <Wand2 className="w-3 h-3 mr-1" />
            {isGeneratingAvatar ? 'Generating…' : 'Avatar'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs"
            onClick={() => setShowEditModal(true)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Modals */}
      <SceneGenerationModal
        isOpen={showSceneModal}
        onClose={() => setShowSceneModal(false)}
        characterId={characterId}
        character={character}
      />
      
      <CharacterEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        character={character}
        onCharacterUpdated={(updatedCharacter) => {
          console.log('Character updated:', updatedCharacter);
        }}
      />
    </div>
  );
};