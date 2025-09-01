import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { RoleplayLeftSidebar } from '@/components/roleplay/ARCHIVED/RoleplayLeftSidebar';
import { SectionHeader } from '@/components/roleplay/ARCHIVED/SectionHeader';
import { HorizontalScroll } from '@/components/roleplay/HorizontalScroll';
import { MinimalCharacterCard } from '@/components/roleplay/MinimalCharacterCard';
import { SceneCard } from '@/components/roleplay/SceneCard';
import { PillFilter } from '@/components/ui/pill-filter';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { CharacterPreviewModal } from '@/components/roleplay/CharacterPreviewModal';
import { Search, Plus } from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useRecentScenes } from '@/hooks/useRecentScenes';
import { useSceneNavigation } from '@/hooks/useSceneNavigation';
import { useCharacterData } from '@/hooks/useCharacterData';
import { Button } from '@/components/ui/button';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';

const RoleplayDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<string | null>(null);
  
  const { characters, isLoading, likeCharacter, incrementInteraction } = usePublicCharacters();
  const { scenes: recentScenes, isLoading: scenesLoading, reload: reloadScenes } = useRecentScenes(12);
  const { startSceneChat } = useSceneNavigation();
  const { generateSceneImage, isGenerating } = useSceneGeneration();

  // Get selected character data for modal
  const { character: selectedCharacterData } = useCharacterData(selectedCharacter || undefined);

  const handleCharacterClick = (characterId: string) => {
    setSelectedCharacter(characterId);
    setShowPreviewModal(true);
  };

  const handleStartChat = (userCharacterId?: string, selectedScene?: any) => {
    if (!selectedCharacter) return;
    
    incrementInteraction(selectedCharacter);
    const params = new URLSearchParams({ character: selectedCharacter });
    if (userCharacterId) params.set('userCharacter', userCharacterId);
    if (selectedScene) params.set('scene', selectedScene.id);
    navigate(`/roleplay/chat?${params.toString()}`);
    setShowPreviewModal(false);
  };

  const handleSelectScene = (sceneId: string, userCharacterId?: string) => {
    if (!selectedCharacter) return;
    
    incrementInteraction(selectedCharacter);
    const params = new URLSearchParams({ 
      character: selectedCharacter,
      scene: sceneId
    });
    if (userCharacterId) params.set('userCharacter', userCharacterId);
    navigate(`/roleplay/chat?${params.toString()}`);
    setShowPreviewModal(false);
  };

  const handleCreateCharacter = () => {
    // Navigate to character creation - could be a modal or separate page
    navigate('/roleplay/create');
  };

  const handleRegenerateScene = async (scene: { id: string; scenePrompt: string }) => {
    try {
      setRegeneratingSceneId(scene.id);
      await generateSceneImage(scene.scenePrompt, null, { quality: 'fast', sceneId: scene.id });
      // Give the callback a moment to persist the new image, then refresh
      setTimeout(() => {
        reloadScenes();
      }, 2500);
    } finally {
      setRegeneratingSceneId(null);
    }
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
        <div className="p-6 space-y-8">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Latest Scenes */}
          <section>
            <SectionHeader title="Latest Scenes" count={recentScenes.length} className="mb-4" />
            {scenesLoading ? (
              <div className="text-muted-foreground text-sm px-1">Loading scenes...</div>
            ) : recentScenes.length > 0 ? (
              <HorizontalScroll>
                {recentScenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    id={scene.id}
                    title={scene.title}
                    characterNames={scene.characterNames}
                    backgroundImage={scene.backgroundImage}
                    gradient="bg-gradient-to-br from-primary/20 to-primary/10"
                    onClick={() => {
                      if (scene.characterId) incrementInteraction(scene.characterId);
                      startSceneChat(
                        scene.id,
                        scene.characterId ? [{ id: scene.characterId }] : [],
                        scene.characterId
                      );
                    }}
                    onRegenerate={() => handleRegenerateScene(scene)}
                    isRegenerating={regeneratingSceneId === scene.id || isGenerating}
                    className="w-64"
                  />
                ))}
              </HorizontalScroll>
            ) : (
              <div className="text-muted-foreground text-sm px-1">No scenes yet.</div>
            )}
          </section>

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
                    onClick={() => handleCharacterClick(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    onStartChat={(e) => {
                      e.stopPropagation();
                      handleStartChat();
                    }}
                    onViewScenes={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
                    }}
                    onViewDetails={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
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
                    onClick={() => handleCharacterClick(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    onStartChat={(e) => {
                      e.stopPropagation();
                      handleStartChat();
                    }}
                    onViewScenes={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
                    }}
                    onViewDetails={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
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
                    onClick={() => handleCharacterClick(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    onStartChat={(e) => {
                      e.stopPropagation();
                      handleStartChat();
                    }}
                    onViewScenes={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
                    }}
                    onViewDetails={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
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
                    onClick={() => handleCharacterClick(character.id)}
                    onLike={(e) => {
                      e.stopPropagation();
                      likeCharacter(character.id);
                    }}
                    onStartChat={(e) => {
                      e.stopPropagation();
                      handleStartChat();
                    }}
                    onViewScenes={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
                    }}
                    onViewDetails={(e) => {
                      e.stopPropagation();
                      handleCharacterClick(character.id);
                    }}
                    className="w-64"
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading characters...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredCharacters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No characters found</p>
              <Button onClick={handleCreateCharacter}>
                <Plus className="w-4 h-4 mr-2" />
                Create Character
              </Button>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Character Preview Modal */}
      <CharacterPreviewModal
        character={selectedCharacterData}
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedCharacter(null);
        }}
        onStartChat={handleStartChat}
      />
    </div>
  );
};

export default RoleplayDashboard;