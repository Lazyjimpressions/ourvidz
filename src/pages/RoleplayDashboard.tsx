import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { Play, Search, Star, Users, MessageSquare, Plus, Sparkles } from 'lucide-react';
import { useCharacterDatabase } from '@/hooks/useCharacterDatabase';

// Mock featured characters for now
const featuredCharacters = [
  {
    id: '1',
    name: 'Elena Voss',
    creator: '@twilights_',
    description: 'Mysterious vampire who runs an upscale nightclub in modern times.',
    tags: ['vampire', 'mystery', 'modern', 'supernatural'],
    interactions: '2.0m',
    rating: 4.8,
    avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face',
    isOfficial: true
  },
  {
    id: '2', 
    name: 'Captain Torres',
    creator: '@seafarer',
    description: 'Swashbuckling pirate captain seeking treasure and adventure.',
    tags: ['pirate', 'adventure', 'historical', 'action'],
    interactions: '1.5m',
    rating: 4.6,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isOfficial: false
  },
  {
    id: '3',
    name: 'Dr. Aria Chen',
    creator: '@scifi_stories',
    description: 'Brilliant scientist researching alien artifacts in 2087.',
    tags: ['sci-fi', 'scientist', 'future', 'mystery'],
    interactions: '980k',
    rating: 4.7,
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616c4e2e8b2?w=150&h=150&fit=crop&crop=face',
    isOfficial: true
  }
];

const RoleplayDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { getUserCharacters, isLoading } = useCharacterDatabase();

  const handleStartChat = (characterId: string) => {
    navigate(`/roleplay/chat?character=${characterId}`);
  };

  const handleCreateCharacter = () => {
    // Navigate to character creation - could be a modal or separate page
    navigate('/roleplay/create');
  };

  const filteredCharacters = featuredCharacters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'official') return matchesSearch && char.isOfficial;
    if (selectedFilter === 'community') return matchesSearch && !char.isOfficial;
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <RoleplayHeader title="Roleplay Characters" showBackButton={false} />
      
      <main className="pt-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-b border-gray-800">
          <div className="absolute inset-0 opacity-50"></div>
          
          <div className="relative px-4 py-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Immersive AI Roleplay
            </h1>
            <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Chat with intelligent characters in rich, interactive storylines. Create your own characters or explore our featured collection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Button 
                onClick={handleCreateCharacter}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Character
              </Button>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Sparkles className="w-4 h-4 mr-2" />
                Browse Featured
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-4 py-6 border-b border-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search characters, stories, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={selectedFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('all')}
                  className="h-10"
                >
                  All
                </Button>
                <Button
                  variant={selectedFilter === 'official' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('official')}
                  className="h-10"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Button>
                <Button
                  variant={selectedFilter === 'community' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('community')}
                  className="h-10"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Community
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Character Grid */}
        <div className="px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden hover:border-purple-500 transition-colors group"
                >
                  {/* Character Avatar */}
                  <div className="relative">
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {character.isOfficial && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                          Featured
                        </span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-bold text-lg text-white mb-1">{character.name}</h3>
                      <p className="text-gray-300 text-xs">by {character.creator}</p>
                    </div>
                  </div>

                  {/* Character Info */}
                  <div className="p-4">
                    <p className="text-gray-300 text-sm mb-3 overflow-hidden text-ellipsis" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                      {character.description}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {character.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {character.tags.length > 3 && (
                        <span className="text-gray-400 text-xs px-2 py-1">
                          +{character.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {character.interactions}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {character.rating}
                      </span>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleStartChat(character.id)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                    >
                      <Play className="w-3 h-3 mr-2" />
                      Start Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredCharacters.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-medium mb-2">No characters found</h3>
                  <p className="text-gray-400 mb-4">
                    Try adjusting your search or create a new character.
                  </p>
                  <Button onClick={handleCreateCharacter} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Character
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoleplayDashboard;