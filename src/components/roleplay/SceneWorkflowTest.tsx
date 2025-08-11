import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

// Mock data for testing
const mockCharacter = {
  id: 'test-character-1',
  name: 'Mei Chen',
  description: 'A friendly AI assistant',
  image_url: 'https://via.placeholder.com/150x150/4F46E5/FFFFFF?text=Mei+Chen'
};

const mockScene = {
  id: 'test-scene-1',
  scene_prompt: 'A cozy coffee shop on a rainy afternoon',
  image_url: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Coffee+Shop'
};

export const SceneWorkflowTest: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testCharacterSelection = () => {
    addResult('Testing character selection...');
    // Simulate clicking on a character card
    navigate(`/roleplay/chat?character=${mockCharacter.id}`);
  };

  const testSceneSelection = () => {
    addResult('Testing scene selection...');
    // Simulate selecting a scene
    navigate(`/roleplay/chat?character=${mockCharacter.id}&scene=${mockScene.id}`);
  };

  const testSceneWithUserCharacter = () => {
    addResult('Testing scene with user character...');
    // Simulate selecting a scene with user character
    navigate(`/roleplay/chat?character=${mockCharacter.id}&scene=${mockScene.id}&userCharacter=user-char-1`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scene Workflow Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={testCharacterSelection} className="w-full">
              Test Character Selection
            </Button>
            <Button onClick={testSceneSelection} className="w-full">
              Test Scene Selection
            </Button>
            <Button onClick={testSceneWithUserCharacter} className="w-full">
              Test Scene + User Character
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Test Results</h4>
              <Button onClick={clearResults} size="sm" variant="outline">
                Clear
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No test results yet</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Test Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium mb-2">Character</h5>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div><strong>ID:</strong> {mockCharacter.id}</div>
                  <div><strong>Name:</strong> {mockCharacter.name}</div>
                  <div><strong>Description:</strong> {mockCharacter.description}</div>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium mb-2">Scene</h5>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div><strong>ID:</strong> {mockScene.id}</div>
                  <div><strong>Prompt:</strong> {mockScene.scene_prompt}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Instructions</h4>
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <ol className="list-decimal list-inside space-y-1">
                <li>Click "Test Character Selection" to test basic character chat</li>
                <li>Click "Test Scene Selection" to test scene initialization</li>
                <li>Click "Test Scene + User Character" to test with user character</li>
                <li>Check browser console for detailed logs</li>
                <li>Verify that scenes start properly with narration</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
