import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { RoleplayLeftSidebar } from '@/components/roleplay/RoleplayLeftSidebar';
import { SectionHeader } from '@/components/roleplay/SectionHeader';
import { HorizontalScroll } from '@/components/roleplay/HorizontalScroll';
import { MinimalCharacterCard } from '@/components/roleplay/MinimalCharacterCard';
import { SceneCard } from '@/components/roleplay/SceneCard';
import { PillFilter } from '@/components/ui/pill-filter';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { Search, Plus } from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';


const RoleplayDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { characters, isLoading, likeCharacter, incrementInteraction } = usePublicCharacters();
  const { scenes } = useCharacterScenes();

  const handleStartChat = (characterId: string) => {
    incrementInteraction(characterId);
    navigate(`/roleplay/chat?character=${characterId}`);
  };

  const handleCreateCharacter = () => {
    // Navigate to character creation - could be a modal or separate page
    navigate('/roleplay/create');
  };

  // Transform database characters to display format
  const displayCharacters = useMemo(() => {
    return characters.map(char => {
      // Create tags from appearance_tags and traits
      const tags = [
        ...(char.appearance_tags || []),
        ...(char.traits ? char.traits.split(',').map(t => t.trim()) : [])
      ].filter(Boolean).slice(0, 5);

      // Format interaction count
      const formatCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}m`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toString();
      };

      return {
        id: char.id,
        name: char.name,
        creator: `Character #${char.id.slice(0, 8)}`, // Fallback creator display
        description: char.description,
        tags,
        interactions: formatCount(char.interaction_count),
        rating: Math.min(5, Math.max(3.5, 4.5 + (char.likes_count / 100))), // Synthetic rating based on likes
        avatar: char.reference_image_url || char.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${char.name}`,
        isOfficial: char.likes_count > 50, // Featured characters have more likes
        likesCount: char.likes_count,
        rawData: char
      };
    });
  }, [characters]);

  const filteredCharacters = displayCharacters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'official') return matchesSearch && char.isOfficial;
    if (selectedFilter === 'community') return matchesSearch && !char.isOfficial;
    
    return matchesSearch;
  });

  // Transform scenes data for display
  const displayScenes = useMemo(() => {
    return scenes.map(scene => ({
      id: scene.id,
      title: scene.scene_prompt || 'Untitled Scene',
      characterNames: [], // We'll need to fetch character names based on character_id
      backgroundImage: scene.image_url,
      gradient: 'bg-gradient-to-br from-primary/20 to-primary/10'
    }));
  }, [scenes]);

  // Group characters by category
  const categorizedCharacters = useMemo(() => {
    const forYou = filteredCharacters.slice(0, 8);
    const featured = filteredCharacters.filter(char => char.isOfficial).slice(0, 8);
    const popular = [...filteredCharacters]
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, 8);
    const trending = [...filteredCharacters]
      .sort((a, b) => parseInt(b.interactions.replace(/[^\d]/g, '')) - parseInt(a.interactions.replace(/[^\d]/g, '')))
      .slice(0, 8);

    return { forYou, featured, popular, trending };
  }, [filteredCharacters]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <RoleplayHeader 
        title="Discover Characters"
        subtitle="Chat with AI characters or create your own"
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <RoleplayLeftSidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">

        {/* Filters */}
        <div className="border-b border-border/60">
          <div className="px-6 py-4">
            <div className="flex gap-2">
              <PillFilter
                active={selectedFilter === 'all'}
                onClick={() => setSelectedFilter('all')}
              >
                All
              </PillFilter>
              <PillFilter
                active={selectedFilter === 'official'}
                onClick={() => setSelectedFilter('official')}
              >
                Featured
              </PillFilter>
              <PillFilter
                active={selectedFilter === 'community'}
                onClick={() => setSelectedFilter('community')}
              >
                Community
              </PillFilter>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="px-6 py-6 space-y-8">
          {/* Scenes Section */}
          {displayScenes.length > 0 && (
            <section>
              <SectionHeader title="Scenes" count={displayScenes.length} className="mb-4" />
              <HorizontalScroll>
                {displayScenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    id={scene.id}
                    title={scene.title}
                    characterNames={scene.characterNames}
                    backgroundImage={scene.backgroundImage}
                    gradient={scene.gradient}
                    onClick={() => console.log('Scene clicked:', scene.id)}
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}

          {/* For You Section */}
          {!isLoading && categorizedCharacters.forYou.length > 0 && (
            <section>
              <SectionHeader title="For You" count={categorizedCharacters.forYou.length} className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categorizedCharacters.forYou.map((character) => (
                  <MinimalCharacterCard
                    key={character.id}
                    id={character.id}
                    name={character.name}
                    creator={character.creator}
                    description={character.description}
                    tags={character.tags}
                    interactions={character.interactions}
                    avatar={character.avatar}
                    likesCount={character.likesCount}
                    isOfficial={character.isOfficial}
                    onClick={() => handleStartChat(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Featured Section */}
          {!isLoading && categorizedCharacters.featured.length > 0 && (
            <section>
              <SectionHeader title="Featured" count={categorizedCharacters.featured.length} className="mb-4" />
              <HorizontalScroll>
                {categorizedCharacters.featured.map((character) => (
                  <MinimalCharacterCard
                    key={character.id}
                    id={character.id}
                    name={character.name}
                    creator={character.creator}
                    description={character.description}
                    tags={character.tags}
                    interactions={character.interactions}
                    avatar={character.avatar}
                    likesCount={character.likesCount}
                    isOfficial={character.isOfficial}
                    onClick={() => handleStartChat(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    className="w-64"
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}

          {/* Popular Section */}
          {!isLoading && categorizedCharacters.popular.length > 0 && (
            <section>
              <SectionHeader title="Popular" count={categorizedCharacters.popular.length} className="mb-4" />
              <HorizontalScroll>
                {categorizedCharacters.popular.map((character) => (
                  <MinimalCharacterCard
                    key={character.id}
                    id={character.id}
                    name={character.name}
                    creator={character.creator}
                    description={character.description}
                    tags={character.tags}
                    interactions={character.interactions}
                    avatar={character.avatar}
                    likesCount={character.likesCount}
                    isOfficial={character.isOfficial}
                    onClick={() => handleStartChat(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    className="w-64"
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}

          {/* Trending Section */}
          {!isLoading && categorizedCharacters.trending.length > 0 && (
            <section>
              <SectionHeader title="Trending" count={categorizedCharacters.trending.length} className="mb-4" />
              <HorizontalScroll>
                {categorizedCharacters.trending.map((character) => (
                  <MinimalCharacterCard
                    key={character.id}
                    id={character.id}
                    name={character.name}
                    creator={character.creator}
                    description={character.description}
                    tags={character.tags}
                    interactions={character.interactions}
                    avatar={character.avatar}
                    likesCount={character.likesCount}
                    isOfficial={character.isOfficial}
                    onClick={() => handleStartChat(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    className="w-64"
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg border border-border/60 overflow-hidden animate-pulse">
                  <div className="p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-24" />
                        <div className="h-2 bg-muted rounded w-16" />
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="h-2 bg-muted rounded" />
                      <div className="h-2 bg-muted rounded w-3/4" />
                    </div>
                    <div className="h-6 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredCharacters.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-card rounded-lg border border-border/60 p-8 max-w-md mx-auto">
                <h3 className="text-lg font-medium mb-2">No characters found</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Try adjusting your search or create a new character.
                </p>
                <button 
                  onClick={handleCreateCharacter}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Create Character
                </button>
              </div>
            </div>
          )}
        </div>
        </main>
      </div>
    </div>
  );
};

export default RoleplayDashboard;