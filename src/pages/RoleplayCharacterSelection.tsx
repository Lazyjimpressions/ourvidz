import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { CharacterBrowser } from '@/components/roleplay/CharacterBrowser';
import { UserCharacterSetup } from '@/components/roleplay/ARCHIVED/UserCharacterSetup';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useToast } from '@/hooks/use-toast';

const RoleplayCharacterSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [showUserSetup, setShowUserSetup] = useState(false);
  const { character } = useCharacterData(selectedCharacterId);
  const { toast } = useToast();

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setShowUserSetup(true);
  };

  const handleSetupComplete = (userCharacterId: string, contentMode: 'sfw' | 'nsfw') => {
    // Navigate to roleplay chat with both character IDs and content mode
    const params = new URLSearchParams({
      character: selectedCharacterId,
      userCharacter: userCharacterId,
      mode: contentMode
    });
    
    navigate(`/roleplay/chat?${params.toString()}`);
    
    toast({
      title: "Chat Started",
      description: `Starting roleplay with ${character?.name || 'character'}`,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <RoleplayHeader title="Select Character" />
      
      <main className="pt-12 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Choose Your Roleplay Partner</h1>
            <p className="text-gray-400 text-lg">
              Select an AI character to begin your interactive roleplay session
            </p>
          </div>

          <CharacterBrowser onCharacterSelect={handleCharacterSelect} />
        </div>
      </main>

      <UserCharacterSetup
        isOpen={showUserSetup}
        onClose={() => setShowUserSetup(false)}
        onSetupComplete={handleSetupComplete}
        aiCharacterName={character?.name}
      />
    </div>
  );
};

export default RoleplayCharacterSelection;