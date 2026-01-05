
import React, { useState, useMemo, useEffect } from 'react';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CharacterGrid } from '@/components/roleplay/CharacterGrid';
import { QuickStartSection } from '@/components/roleplay/QuickStartSection';
import { SearchAndFilters } from '@/components/roleplay/SearchAndFilters';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Settings, Sparkles, User, Globe, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useCharacterSessions } from '@/hooks/useCharacterSessions';
import { MobileCharacterCard } from '@/components/roleplay/MobileCharacterCard';
import { AddCharacterModal } from '@/components/roleplay/AddCharacterModal';
import { DashboardSettings } from '@/components/roleplay/DashboardSettings';
import { ScenarioSetupWizard } from '@/components/roleplay/ScenarioSetupWizard';
import type { ScenarioSessionPayload, SceneStyle } from '@/types/roleplay';
import { useCharacterImageUpdates } from '@/hooks/useCharacterImageUpdates';
import { supabase } from '@/integrations/supabase/client';

const MobileRoleplayDashboard = () => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScenarioWizard, setShowScenarioWizard] = useState(false);

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
  const { sessions: ongoingSessions, isLoading: sessionsLoading } = useCharacterSessions();

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

  // Combined list for lookups (e.g., recent chats)
  const allCharacters = useMemo(() => {
    return [...myCharacters, ...publicFromOthers];
  }, [myCharacters, publicFromOthers]);

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
        
        {/* Ongoing Conversations Section - Clean cards without message count badge */}
        {ongoingSessions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-green-400" />
              <h2 className="text-base font-medium text-white">Recent Chats</h2>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {ongoingSessions.slice(0, 6).map((session) => {
                // Look up character in combined list (user + public)
                const character = allCharacters.find(c => c.id === session.character_id);
                if (!character) return null;

                return (
                  <MobileCharacterCard
                    key={session.character_id}
                    character={{
                      id: character.id,
                      name: character.name,
                      description: character.description,
                      image_url: character.image_url,
                      preview_image_url: character.reference_image_url || character.image_url,
                      quick_start: false,
                      category: character.content_rating === 'nsfw' ? 'nsfw' : 'sfw',
                      consistency_method: (character as any).consistency_method || 'i2i_reference',
                      interaction_count: character.interaction_count,
                      likes_count: character.likes_count,
                      appearance_tags: character.appearance_tags,
                      traits: character.traits,
                      persona: character.persona,
                      gender: character.gender,
                      reference_image_url: character.reference_image_url,
                      seed_locked: (character as any).seed_locked,
                      user_id: character.user_id
                    }}
                    onSelect={() => navigate(`/roleplay/chat/${session.character_id}`)}
                    onPreview={() => console.log('Preview:', session.character_id)}
                    onDelete={handleDeleteCharacter}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        {/* Quick Start Section */}
        <QuickStartSection onCharacterSelect={handleCharacterSelect} />

        {/* Scenario Quick-Start Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-medium text-white">Start a Scenario</h2>
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
            Create a custom roleplay scenario with your favorite character.
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
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayDashboard;
