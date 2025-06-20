
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/PortalLayout";
import { CharacterManager } from "@/components/CharacterManager";
import { Character } from "@/components/CharacterManager";

const Characters = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);

  const handleCharactersCreated = (newCharacters: Character[]) => {
    setCharacters(newCharacters);
  };

  return (
    <PortalLayout title="Character Library">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">Character Library</h1>
              <p className="text-gray-600 mt-1">
                Create and manage characters for your stories and videos
              </p>
            </div>
          </div>

          <CharacterManager onCharactersSelected={handleCharactersCreated} />
        </div>
      </div>
    </PortalLayout>
  );
};

export default Characters;
