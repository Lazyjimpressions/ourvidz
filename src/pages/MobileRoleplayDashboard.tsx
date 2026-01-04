
import React, { useState, useMemo, useEffect } from 'react';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CharacterGrid } from '@/components/roleplay/CharacterGrid';
import { QuickStartSection } from '@/components/roleplay/QuickStartSection';
import { SearchAndFilters } from '@/components/roleplay/SearchAndFilters';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useCharacterSessions } from '@/hooks/useCharacterSessions';
import { MobileCharacterCard } from '@/components/roleplay/MobileCharacterCard';
import { AddCharacterModal } from '@/components/roleplay/AddCharacterModal';
import { DashboardSettings } from '@/components/roleplay/DashboardSettings';
import { ScenarioSetupWizard } from '@/components/roleplay/ScenarioSetupWizard';
import type { ScenarioSessionPayload } from '@/types/roleplay';

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

  // Load both public characters AND user's own characters
  const { characters: publicCharacters, isLoading: publicLoading, error: publicError, loadPublicCharacters } = usePublicCharacters();
  const { characters: userCharacters, isLoading: userLoading, loadUserCharacters } = useUserCharacters();
  const { sessions: ongoingSessions, isLoading: sessionsLoading } = useCharacterSessions();

  // Combine user characters (first) with public characters (deduplicated)
  const allCharacters = useMemo(() => {
    const userIds = new Set(userCharacters.map(c => c.id));
    return [
      ...userCharacters, // User's characters first (including private ones)
      ...publicCharacters.filter(c => !userIds.has(c.id)) // Then public ones not created by user
    ];
  }, [userCharacters, publicCharacters]);

  const isLoading = publicLoading || userLoading;
  const error = publicError;

  // Transform combined characters to display format with all required fields
  const displayCharacters = allCharacters.map(char => ({
    id: char.id,
    name: char.name,
    description: char.description,
    image_url: char.image_url,
    preview_image_url: char.reference_image_url || char.image_url, // Use reference_image_url as preview
    quick_start: char.interaction_count > 50, // Popular characters as quick start
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
    // New voice-related fields
    voice_examples: char.voice_examples || [],
    forbidden_phrases: char.forbidden_phrases || [],
    scene_behavior_rules: char.scene_behavior_rules || {}
  }));

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

  const filteredCharacters = displayCharacters.filter((character: any) => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.description.toLowerCase().includes(searchQuery.toLowerCase());
    // Use contentFilter from settings for content type filtering
    const matchesContentFilter = contentFilter === 'all' || character.category === contentFilter;
    // Also support the SearchAndFilters component filter
    const matchesSearchFilter = selectedFilter === 'all' || character.category === selectedFilter;
    return matchesSearch && matchesContentFilter && matchesSearchFilter;
  });

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
                      seed_locked: (character as any).seed_locked
                    }}
                    onSelect={() => navigate(`/roleplay/chat/${session.character_id}`)}
                    onPreview={() => console.log('Preview:', session.character_id)}
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
        
        {/* Character Grid */}
        <CharacterGrid
          characters={filteredCharacters}
          onCharacterSelect={handleCharacterSelect}
          onCharacterPreview={handleCharacterPreview}
        />

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
