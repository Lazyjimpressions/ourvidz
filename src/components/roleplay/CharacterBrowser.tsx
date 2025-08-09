import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Star, Users, MessageSquare, Heart, Shield, ShieldOff } from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';

interface CharacterBrowserProps {
  onCharacterSelect: (characterId: string) => void;
}

export const CharacterBrowser: React.FC<CharacterBrowserProps> = ({ 
  onCharacterSelect 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showNSFW, setShowNSFW] = useState(false);
  const { characters, isLoading, likeCharacter } = usePublicCharacters();

  // Transform database characters to display format with content filtering
  const displayCharacters = useMemo(() => {
    return characters
      .filter(char => {
        // Filter by content rating
        if (!showNSFW && char.content_rating === 'nsfw') return false;
        return true;
      })
      .map(char => {
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
          creator: char.user_id ? 'Community' : 'Official',
          description: char.description,
          tags,
          interactions: formatCount(char.interaction_count),
          rating: Math.min(5, Math.max(3.5, 4.5 + (char.likes_count / 100))),
          avatar: char.reference_image_url || char.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${char.name}`,
          isOfficial: !char.user_id,
          likesCount: char.likes_count,
          contentRating: char.content_rating || 'sfw',
          rawData: char
        };
      });
  }, [characters, showNSFW]);

  const filteredCharacters = displayCharacters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'official') return matchesSearch && char.isOfficial;
    if (selectedFilter === 'community') return matchesSearch && !char.isOfficial;
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Content Filter Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center space-x-3">
          {showNSFW ? (
            <ShieldOff className="w-5 h-5 text-red-400" />
          ) : (
            <Shield className="w-5 h-5 text-green-400" />
          )}
          <div>
            <Label htmlFor="nsfw-toggle" className="text-sm font-medium">
              Adult Content
            </Label>
            <p className="text-xs text-gray-400">
              {showNSFW ? 'NSFW content enabled' : 'Family-friendly mode'}
            </p>
          </div>
        </div>
        <Switch
          id="nsfw-toggle"
          checked={showNSFW}
          onCheckedChange={setShowNSFW}
        />
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
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
          >
            All
          </Button>
          <Button
            variant={selectedFilter === 'official' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('official')}
          >
            <Star className="w-3 h-3 mr-1" />
            Official
          </Button>
          <Button
            variant={selectedFilter === 'community' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('community')}
          >
            <Users className="w-3 h-3 mr-1" />
            Community
          </Button>
        </div>
      </div>

      {/* Character Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-800" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
                <div className="h-16 bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map((character) => (
            <div
              key={character.id}
              className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden hover:border-purple-500 transition-colors group cursor-pointer"
              onClick={() => onCharacterSelect(character.id)}
            >
              {/* Character Avatar */}
              <div className="relative">
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                <div className="absolute top-3 left-3 right-3 flex justify-between">
                  {character.isOfficial && (
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      Official
                    </Badge>
                  )}
                  {character.contentRating === 'nsfw' && (
                    <Badge variant="destructive" className="bg-red-600 text-white">
                      18+
                    </Badge>
                  )}
                </div>
                
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-bold text-lg text-white mb-1">{character.name}</h3>
                  <p className="text-gray-300 text-xs">by {character.creator}</p>
                </div>
              </div>

              {/* Character Info */}
              <div className="p-4">
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                  {character.description}
                </p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {character.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs border-gray-600 text-gray-300"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {character.tags.length > 3 && (
                    <span className="text-gray-400 text-xs px-2 py-1">
                      +{character.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {character.interactions}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        likeCharacter(character.id);
                      }}
                      className="flex items-center gap-1 hover:text-red-400 transition-colors"
                    >
                      <Heart className="w-3 h-3" />
                      {character.likesCount}
                    </button>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {character.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredCharacters.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 max-w-md mx-auto">
            <h3 className="text-lg font-medium mb-2">No characters found</h3>
            <p className="text-gray-400 mb-4">
              Try adjusting your search or content filters.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};