import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSceneManagement } from '@/hooks/useSceneManagement';

// Mock scene data for testing
const mockScene = {
  id: 'test-scene-1',
  scene_prompt: 'A cozy coffee shop on a rainy afternoon',
  image_url: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Coffee+Shop',
  generation_metadata: {}
};

export const SceneManagementTest: React.FC = () => {
  const {
    sceneState,
    setCurrentScene,
    startScene,
    pauseScene,
    resetScene,
    toggleSceneVisibility,
    clearScene
  } = useSceneManagement({
    conversationId: 'test-conversation',
    characterName: 'Test Character',
    userCharacterId: undefined,
    contentMode: 'sfw'
  });

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scene Management Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scene State Display */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Scene State</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={sceneState.isActive ? "default" : "secondary"}>
                    {sceneState.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-sm">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sceneState.isPaused ? "destructive" : "secondary"}>
                    {sceneState.isPaused ? "Paused" : "Running"}
                  </Badge>
                  <span className="text-sm">Paused</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sceneState.isGenerating ? "default" : "secondary"}>
                    {sceneState.isGenerating ? "Generating" : "Ready"}
                  </Badge>
                  <span className="text-sm">Generating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sceneState.isVisible ? "default" : "secondary"}>
                    {sceneState.isVisible ? "Visible" : "Hidden"}
                  </Badge>
                  <span className="text-sm">Visible</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Current Scene</h4>
              {sceneState.currentScene ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{sceneState.currentScene.scene_prompt}</p>
                  {sceneState.currentScene.image_url && (
                    <img 
                      src={sceneState.currentScene.image_url} 
                      alt={sceneState.currentScene.scene_prompt}
                      className="w-full h-20 object-cover rounded"
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scene selected</p>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => setCurrentScene(mockScene)}
              disabled={sceneState.isGenerating}
            >
              Set Test Scene
            </Button>
            
            <Button 
              onClick={() => startScene(mockScene)}
              disabled={sceneState.isGenerating || !sceneState.currentScene}
            >
              Start Scene
            </Button>
            
            <Button 
              onClick={pauseScene}
              disabled={sceneState.isGenerating || !sceneState.isActive}
              variant="outline"
            >
              {sceneState.isPaused ? "Resume" : "Pause"}
            </Button>
            
            <Button 
              onClick={resetScene}
              disabled={sceneState.isGenerating || !sceneState.currentScene}
              variant="outline"
            >
              Reset Scene
            </Button>
            
            <Button 
              onClick={toggleSceneVisibility}
              disabled={sceneState.isGenerating}
              variant="outline"
            >
              {sceneState.isVisible ? "Hide" : "Show"} Scene
            </Button>
            
            <Button 
              onClick={clearScene}
              disabled={sceneState.isGenerating}
              variant="destructive"
            >
              Clear Scene
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
