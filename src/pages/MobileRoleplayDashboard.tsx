
import React, { useState, useEffect } from 'react';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CharacterGrid } from '@/components/roleplay/CharacterGrid';
import { QuickStartSection } from '@/components/roleplay/QuickStartSection';
import { SearchAndFilters } from '@/components/roleplay/SearchAndFilters';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';

const MobileRoleplayDashboard = () => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // ✅ REAL DATA: Use database characters instead of mock data
  const { characters, isLoading, error, loadPublicCharacters } = usePublicCharacters();

  // Transform database characters to display format with all required fields
  const displayCharacters = characters.map(char => ({
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
    navigate('/roleplay/create');
  };

  const filteredCharacters = displayCharacters.filter((character: any) => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || character.category === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Roleplay</h1>
            <p className="text-gray-400 mt-1">Loading characters...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-square bg-card border border-border rounded-lg animate-pulse" />
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
        {/* Header Section */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Roleplay</h1>
          <p className="text-gray-400 mt-1">Chat with AI characters</p>
        </div>
        
        {/* Quick Start Section */}
        <QuickStartSection onCharacterSelect={handleCharacterSelect} />
        
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

        {/* Create Character Button */}
        <div className="mt-6 text-center">
          <Button 
            onClick={handleCreateCharacter}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Character
          </Button>
        </div>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayDashboard;
