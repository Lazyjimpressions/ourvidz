import React, { useState, useEffect } from 'react';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CharacterGrid } from '@/components/roleplay/CharacterGrid';
import { QuickStartSection } from '@/components/roleplay/QuickStartSection';
import { SearchAndFilters } from '@/components/roleplay/SearchAndFilters';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MobileRoleplayDashboard = () => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock data for demonstration - replace with actual data fetching
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual data fetching
    // fetchCharacters();
    setLoading(false);
  }, []);

  const handleCharacterSelect = (characterId: string) => {
    navigate(`/roleplay/chat/${characterId}`);
  };

  const handleCharacterPreview = (characterId: string) => {
    // TODO: Implement character preview modal
    console.log('Preview character:', characterId);
  };

  const handleCreateCharacter = () => {
    navigate('/roleplay/create');
  };

  const filteredCharacters = characters.filter((character: any) => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || character.category === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <OurVidzDashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading characters...</div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Roleplay</h1>
              <p className="text-gray-400 mt-2">Chat with AI characters and generate scenes</p>
            </div>
            <Button 
              onClick={handleCreateCharacter}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isMobile ? "Create" : "Create Character"}
            </Button>
          </div>
        </div>
        
        {/* Quick Start Section */}
        <QuickStartSection onCharacterSelect={handleCharacterSelect} />
        
        {/* Search and Filters */}
        <SearchAndFilters 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />
        
        {/* Character Grid */}
        <CharacterGrid 
          characters={filteredCharacters}
          onCharacterSelect={handleCharacterSelect}
          onCharacterPreview={handleCharacterPreview}
        />

        {/* Empty State */}
        {filteredCharacters.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">
              {searchQuery ? 'No characters found matching your search.' : 'No characters available.'}
            </div>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
                className="text-white border-gray-600 hover:bg-gray-800"
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileRoleplayDashboard;
