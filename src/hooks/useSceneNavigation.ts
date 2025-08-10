import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSceneNavigation = () => {
  const navigate = useNavigate();

  const startSceneChat = useCallback((sceneId: string, participants: any[]) => {
    // Navigate to roleplay chat with scene context
    const params = new URLSearchParams({
      scene: sceneId,
      participants: participants.map(p => p.id).join(',')
    });
    
    navigate(`/roleplay/chat?${params.toString()}`);
  }, [navigate]);

  const startMultiCharacterChat = useCallback((participants: any[]) => {
    // Navigate to roleplay chat with multiple characters
    const params = new URLSearchParams({
      characters: participants.map(p => p.id).join(','),
      mode: 'multi'
    });
    
    navigate(`/roleplay/chat?${params.toString()}`);
  }, [navigate]);

  return {
    startSceneChat,
    startMultiCharacterChat
  };
};