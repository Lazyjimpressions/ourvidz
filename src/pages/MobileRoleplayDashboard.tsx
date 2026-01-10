
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CharacterGrid } from '@/components/roleplay/CharacterGrid';
import { SearchAndFilters } from '@/components/roleplay/SearchAndFilters';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Sparkles, User, Globe, Shield, RefreshCw, PlayCircle, ImageIcon, Trash2, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { MobileCharacterCard } from '@/components/roleplay/MobileCharacterCard';
import { AddCharacterModal } from '@/components/roleplay/AddCharacterModal';
import { DashboardSettings } from '@/components/roleplay/DashboardSettings';
import { ScenarioSetupWizard } from '@/components/roleplay/ScenarioSetupWizard';
import { SceneGallery } from '@/components/roleplay/SceneGallery';
import { SceneCreationModal } from '@/components/roleplay/SceneCreationModal';
import { SceneSetupSheet, SceneSetupConfig } from '@/components/roleplay/SceneSetupSheet';
import type { ScenarioSessionPayload, SceneStyle, SceneTemplate } from '@/types/roleplay';
import { useCharacterImageUpdates } from '@/hooks/useCharacterImageUpdates';
import { useUserConversations } from '@/hooks/useUserConversations';
import { useSceneGallery } from '@/hooks/useSceneGallery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MobileRoleplayDashboard = () => {
  const { user } = useAuth();
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScenarioWizard, setShowScenarioWizard] = useState(false);
  const [selectedScene, setSelectedScene] = useState<SceneTemplate | null>(null);
  const [showSceneSetup, setShowSceneSetup] = useState(false);
  const [showSceneGallery, setShowSceneGallery] = useState(false);
  const [showSceneCreation, setShowSceneCreation] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneTemplate | null>(null);
  const [sceneConfig, setSceneConfig] = useState<SceneSetupConfig | null>(null);
  // Track scene images that failed to load to prevent infinite re-render loops
  const [erroredSceneImages, setErroredSceneImages] = useState<Set<string>>(new Set());

  // Settings state - persisted to localStorage
  const [selectedImageModel, setSelectedImageModel] = useState(() =>
    localStorage.getItem('roleplay_image_model') || ''
  );
  const [selectedChatModel, setSelectedChatModel] = useState(() =>
    localStorage.getItem('roleplay_chat_model') || ''
  );
  const [contentFilter, setContentFilter] = useState<'all' | 'nsfw' | 'sfw'>(() =>
    (localStorage.getItem('roleplay_content_filter') as 'all' | 'nsfw' | 'sfw') || 'all'
  );
  const [memoryTier, setMemoryTier] = useState<'conversation' | 'character' | 'profile'>(() =>
    (localStorage.getItem('roleplay_memory_tier') as 'conversation' | 'character' | 'profile') || 'conversation'
  );
  const [sceneStyle, setSceneStyle] = useState<SceneStyle>(() =>
    (localStorage.getItem('roleplay_scene_style') as SceneStyle) || 'character_only'
  );

  // Persist settings to localStorage
  useEffect(() => {
    if (selectedImageModel) localStorage.setItem('roleplay_image_model', selectedImageModel);
  }, [selectedImageModel]);

  useEffect(() => {
    if (selectedChatModel) localStorage.setItem('roleplay_chat_model', selectedChatModel);
  }, [selectedChatModel]);

  useEffect(() => {
    localStorage.setItem('roleplay_content_filter', contentFilter);
  }, [contentFilter]);

  useEffect(() => {
    localStorage.setItem('roleplay_memory_tier', memoryTier);
  }, [memoryTier]);

  useEffect(() => {
    localStorage.setItem('roleplay_scene_style', sceneStyle);
  }, [sceneStyle]);

  // Load both public characters AND user's own characters
  const { characters: publicCharacters, isLoading: publicLoading, error: publicError, loadPublicCharacters } = usePublicCharacters();
  const {
    characters: userCharacters,
    aiCompanions,  // Characters to chat WITH (excludes user personas like "Jon")
    userPersonas,  // User's own personas (for settings)
    isLoading: userLoading,
    loadUserCharacters,
    deleteUserCharacter
  } = useUserCharacters();
  const {
    conversations: userConversations,
    isLoading: conversationsLoading,
    deleteConversation,
    dismissConversation
  } = useUserConversations(10, true);
  const { scenes: sceneTemplates, incrementUsage: incrementSceneUsage, loadScenes: loadSceneGallery } = useSceneGallery('all', 6);

  // Handle scene selection from gallery
  const handleSceneSelect = useCallback((scene: SceneTemplate) => {
    setSelectedScene(scene);
    setShowSceneSetup(true);
  }, []);

  // Handle new scene created
  const handleSceneCreated = useCallback((scene: SceneTemplate) => {
    console.log('🎬 New scene created:', scene.name);
    loadSceneGallery();
    setShowSceneCreation(false);
    setEditingScene(null);
  }, [loadSceneGallery]);

  // Handle scene edit
  const handleSceneEdit = useCallback((scene: SceneTemplate) => {
    console.log('📝 Editing scene:', scene.name);
    setEditingScene(scene);
    setShowSceneCreation(true);
  }, []);

  // Handle starting roleplay from scene setup
  const handleSceneStart = useCallback((config: SceneSetupConfig) => {
    setSceneConfig(config);
    setShowSceneSetup(false);
    // Track usage
    incrementSceneUsage(config.scene.id);
    // Navigate to chat with scene config
    navigate(`/roleplay/chat/${config.primaryCharacterId}`, {
      state: {
        sceneConfig: config,
        userCharacterId: config.userCharacterId,
        scenarioPayload: {
          type: config.scene.scenario_type || 'stranger',
          setting: { location: config.scene.setting || 'custom' },
          atmosphere: config.scene.atmosphere,
          characters: {
            partnerRole: { id: config.primaryCharacterId },
            ...(config.secondaryCharacterId && {
              extras: [{ id: config.secondaryCharacterId }]
            })
          },
          relationshipContext: config.userRole,
          hook: {
            customText: config.scene.scene_starters?.[0]
          },
          contentTier: config.scene.content_rating,
          aiCharacterId: config.primaryCharacterId
        } as ScenarioSessionPayload
      }
    });
  }, [navigate, incrementSceneUsage]);

  // Subscribe to character image updates
  useCharacterImageUpdates();

  // Subscribe to character table updates for image_url changes
  // This ensures character cards update when images are generated
  useEffect(() => {
    const channel = supabase
      .channel(`character-image-updates-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'characters'
        },
        (payload) => {
          const character = payload.new as any;
          // Refresh if image_url is present (indicates image was added/updated)
          if (character.image_url) {
            console.log('🖼️ Character updated, refreshing lists:', character.id);
            // Debounce rapid updates
            setTimeout(() => {
              loadPublicCharacters();
              loadUserCharacters();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPublicCharacters, loadUserCharacters]);

  // Handle character deletion
  const handleDeleteCharacter = async (characterId: string) => {
    await deleteUserCharacter(characterId);
    // Refresh both lists after deletion
    loadPublicCharacters();
    loadUserCharacters();
  };

  // Use AI companions for "My Characters" (excludes user personas like Jon)
  const myCharacters = useMemo(() => aiCompanions, [aiCompanions]);

  const publicFromOthers = useMemo(() => {
    const userIds = new Set(userCharacters.map(c => c.id));
    return publicCharacters.filter(c => !userIds.has(c.id));
  }, [userCharacters, publicCharacters]);

  const isLoading = publicLoading || userLoading;
  const error = publicError;

  // Transform character to display format with all required fields
  const toDisplayFormat = (char: typeof userCharacters[0]) => ({
    id: char.id,
    name: char.name,
    description: char.description,
    image_url: char.image_url,
    preview_image_url: char.reference_image_url || char.image_url,
    quick_start: char.interaction_count > 50,
    category: char.content_rating === 'nsfw' ? 'nsfw' : 'sfw',
    consistency_method: (char as any).consistency_method || 'i2i_reference',
    interaction_count: char.interaction_count,
    likes_count: char.likes_count,
    content_rating: char.content_rating,
    gender: char.gender,
    role: char.role,
    appearance_tags: char.appearance_tags,
    traits: char.traits,
    persona: char.persona,
    reference_image_url: char.reference_image_url,
    seed_locked: (char as any).seed_locked,
    voice_examples: char.voice_examples || [],
    forbidden_phrases: char.forbidden_phrases || [],
    scene_behavior_rules: char.scene_behavior_rules || {},
    user_id: char.user_id,
    is_public: char.is_public
  });

  // Separate display arrays
  const myDisplayCharacters = myCharacters.map(toDisplayFormat);
  const publicDisplayCharacters = publicFromOthers.map(toDisplayFormat);

  const handleCharacterSelect = (characterId: string) => {
    navigate(`/roleplay/chat/${characterId}`);
  };

  const handleCharacterPreview = (characterId: string) => {
    // Preview functionality is now handled within the CharacterPreviewModal
    // This function is kept for compatibility but not actively used
    console.log('Preview character:', characterId);
  };

  const handleCreateCharacter = () => {
    setShowAddCharacterModal(true);
  };

  const handleCharacterAdded = (character: any) => {
    // Refresh both character lists after adding a new one
    loadPublicCharacters();
    loadUserCharacters();
  };

  const handleScenarioComplete = (payload: ScenarioSessionPayload) => {
    setShowScenarioWizard(false);
    // Navigate to chat with scenario context
    if (payload.aiCharacterId) {
      navigate(`/roleplay/chat/${payload.aiCharacterId}`, {
        state: { scenarioPayload: payload }
      });
    }
  };

  // Filter function for both sections
  const filterCharacters = (characters: typeof myDisplayCharacters) => {
    return characters.filter((character: any) => {
      const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           character.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesContentFilter = contentFilter === 'all' || character.category === contentFilter;
      const matchesSearchFilter = selectedFilter === 'all' || character.category === selectedFilter;
      return matchesSearch && matchesContentFilter && matchesSearchFilter;
    });
  };

  const filteredMyCharacters = filterCharacters(myDisplayCharacters);
  const filteredPublicCharacters = filterCharacters(publicDisplayCharacters);

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Roleplay</h1>
            <p className="text-gray-400 mt-1">Loading characters...</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Roleplay</h1>
            <p className="text-red-400 mt-1">Error loading characters: {error}</p>
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section - Compact with Settings */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Roleplay</h1>
            <p className="text-sm text-muted-foreground">Chat with AI characters</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadPublicCharacters();
                loadUserCharacters();
              }}
              className="h-8 w-8 p-0"
              title="Refresh characters"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCharacter}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" /> Character
            </Button>
          </div>
        </div>
        
        {/* Continue Conversations Section - Shows conversations with scene images */}
        {userConversations.filter(c => c.last_scene_image).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-medium text-white">Continue Where You Left Off</h2>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {userConversations
                .filter(conv => conv.last_scene_image)
                .slice(0, 6)
                .map((conversation) => {
                  // Determine image source - use character avatar if scene image errored
                  const sceneImageErrored = erroredSceneImages.has(conversation.id);
                  const displayImage = sceneImageErrored
                    ? conversation.character?.image_url
                    : conversation.last_scene_image;

                  return (
                    <div
                      key={conversation.id}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => navigate(`/roleplay/chat/${conversation.character_id}?conversation=${conversation.id}`)}
                    >
                      {/* Scene thumbnail as background */}
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={conversation.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={() => {
                            // Mark this conversation's scene image as errored
                            if (!sceneImageErrored) {
                              setErroredSceneImages(prev => new Set(prev).add(conversation.id));
                            }
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-gray-900" />
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Character avatar overlay - only show if using scene image (not errored) */}
                      {!sceneImageErrored && conversation.character?.image_url && (
                        <div className="absolute top-2 left-2 w-8 h-8 rounded-full overflow-hidden border-2 border-white/50">
                          <img
                            src={conversation.character.image_url}
                            alt={conversation.character.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {/* Hover action icons - top right */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissConversation(conversation.id);
                          }}
                          className="p-1 bg-black/60 hover:bg-black/80 rounded-full"
                          title="Hide from list"
                        >
                          <X className="w-3.5 h-3.5 text-white/80" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          className="p-1 bg-black/60 hover:bg-red-600/80 rounded-full"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white/80" />
                        </button>
                      </div>
                      {/* Character name */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-sm font-medium truncate">
                          {conversation.character?.name || 'Unknown'}
                        </p>
                        <p className="text-white/60 text-xs truncate">{conversation.title}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}


        {/* Scene Gallery Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-400" />
              <h2 className="text-base font-medium text-white">Scene Gallery</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setEditingScene(null);
                  setShowSceneCreation(true);
                }}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Create
              </Button>
              {sceneTemplates.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSceneGallery(true)}
                  className="h-7 text-xs"
                >
                  View All
                </Button>
              )}
            </div>
          </div>
          {sceneTemplates.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {sceneTemplates.slice(0, 6).map((scene) => (
                <div
                  key={scene.id}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group bg-gradient-to-br from-pink-900/50 to-purple-900/50"
                  onClick={() => handleSceneSelect(scene)}
                >
                  {scene.preview_image_url ? (
                    <img
                      src={scene.preview_image_url}
                      alt={scene.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-800/30 to-purple-900/50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Top badges row */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      scene.content_rating === 'nsfw' ? 'bg-red-500/80' : 'bg-green-500/80'
                    } text-white`}>
                      {scene.content_rating.toUpperCase()}
                    </span>
                    {/* Edit button - only shows for scenes the user owns */}
                    {scene.creator_id === user?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('📝 Edit button clicked for scene:', scene.id, scene.name);
                          setEditingScene(scene);
                          setShowSceneCreation(true);
                        }}
                        className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        title="Edit scene"
                      >
                        <Pencil className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                  {/* Scenario type badge (if available) */}
                  {scene.scenario_type && (
                    <div className="absolute top-9 left-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/70 text-white capitalize">
                        {scene.scenario_type.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate">{scene.name}</p>
                    <p className="text-white/60 text-xs truncate">{scene.description?.substring(0, 50) || scene.setting}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No scene templates yet</p>
              <p className="text-xs mt-1">Create your first scene to get started</p>
            </div>
          )}
        </div>

        {/* Scenario Quick-Start Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-medium text-white">Custom Scenario</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScenarioWizard(true)}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Build your own roleplay scenario from scratch.
          </p>
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
        />

        {/* My Characters Section */}
        {filteredMyCharacters.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-medium text-white">My Characters</h2>
              <span className="text-xs text-muted-foreground">({filteredMyCharacters.length})</span>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredMyCharacters.map((character) => (
                <div key={character.id} className="relative">
                  <MobileCharacterCard
                    character={character}
                    onSelect={() => handleCharacterSelect(character.id)}
                    onPreview={() => handleCharacterPreview(character.id)}
                    onDelete={handleDeleteCharacter}
                  />
                  {/* Private/Public indicator */}
                  {!character.is_public && (
                    <div className="absolute top-2 right-8 z-10">
                      <Shield className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore Public Characters Section */}
        {filteredPublicCharacters.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-green-400" />
              <h2 className="text-base font-medium text-white">Explore Public</h2>
              <span className="text-xs text-muted-foreground">({filteredPublicCharacters.length})</span>
            </div>
            <CharacterGrid
              characters={filteredPublicCharacters}
              onCharacterSelect={handleCharacterSelect}
              onCharacterPreview={handleCharacterPreview}
              onCharacterDelete={handleDeleteCharacter}
            />
          </div>
        )}

        {/* Empty State */}
        {filteredMyCharacters.length === 0 && filteredPublicCharacters.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No characters found matching your criteria.</p>
          </div>
        )}

        {/* Add Character Modal */}
        <AddCharacterModal
          isOpen={showAddCharacterModal}
          onClose={() => setShowAddCharacterModal(false)}
          onCharacterAdded={handleCharacterAdded}
        />

        {/* Dashboard Settings Sheet */}
        <DashboardSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          selectedImageModel={selectedImageModel}
          onImageModelChange={setSelectedImageModel}
          selectedChatModel={selectedChatModel}
          onChatModelChange={setSelectedChatModel}
          contentFilter={contentFilter}
          onContentFilterChange={setContentFilter}
          memoryTier={memoryTier}
          onMemoryTierChange={setMemoryTier}
          sceneStyle={sceneStyle}
          onSceneStyleChange={setSceneStyle}
        />

        {/* Scenario Setup Wizard */}
        <ScenarioSetupWizard
          isOpen={showScenarioWizard}
          onClose={() => setShowScenarioWizard(false)}
          onComplete={handleScenarioComplete}
        />

        {/* Scene Setup Sheet */}
        <SceneSetupSheet
          scene={selectedScene}
          isOpen={showSceneSetup}
          onClose={() => {
            setShowSceneSetup(false);
            setSelectedScene(null);
          }}
          onStart={handleSceneStart}
        />

        {/* Scene Creation Modal */}
        <SceneCreationModal
          isOpen={showSceneCreation}
          onClose={() => {
            setShowSceneCreation(false);
            setEditingScene(null);
          }}
          onSceneCreated={handleSceneCreated}
          editScene={editingScene}
        />

        {/* Full Scene Gallery Modal */}
        {showSceneGallery && (
          <div className="fixed inset-0 z-50 bg-background">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-lg font-semibold">Scene Gallery</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSceneGallery(false)}
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <SceneGallery
                  onSceneSelect={(scene) => {
                    setShowSceneGallery(false);
                    handleSceneSelect(scene);
                  }}
                  onSceneEdit={(scene) => {
                    setShowSceneGallery(false);
                    handleSceneEdit(scene);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayDashboard;
