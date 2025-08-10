import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useImageRegeneration } from '@/hooks/useImageRegeneration';
import { MediaTile } from '@/types/workspace';

// Test component to validate image regeneration with exact copy mode
export const ImageRegenerationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // Mock media tile for testing
  const mockMediaTile: MediaTile = {
    id: 'test-image-123',
    originalAssetId: 'test-asset-456',
    type: 'image',
    url: 'https://example.com/test-image.jpg',
    prompt: 'original test prompt',
    timestamp: new Date(),
    quality: 'high'
  };

  const {
    state,
    updatePrompts,
    regenerateImage,
    isGenerating,
    canRegenerate
  } = useImageRegeneration(mockMediaTile, {
    seed: 12345,
    negativePrompt: 'bad quality',
    originalPrompt: 'original test prompt'
  });

  const testScenarios = [
    {
      name: 'Empty Prompt (Exact Copy)',
      prompt: '',
      description: 'Should preserve subject exactly'
    },
    {
      name: 'Outfit Change',
      prompt: 'change outfit to bikini',
      description: 'Should keep same person, change only outfit'
    },
    {
      name: 'Background Change',
      prompt: 'in a forest setting',
      description: 'Should keep same person, change background'
    },
    {
      name: 'Hairstyle Change',
      prompt: 'different hairstyle',
      description: 'Should keep same person, change hair'
    }
  ];

  const runTest = (scenario: typeof testScenarios[0]) => {
    updatePrompts({ positivePrompt: scenario.prompt });
    setTestResults(prev => [
      ...prev,
      `Testing: ${scenario.name} - "${scenario.prompt}"`
    ]);
    
    // Log the state for debugging
    console.log('🧪 Test Scenario:', {
      name: scenario.name,
      prompt: scenario.prompt,
      state: state,
      canRegenerate: canRegenerate
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Image Regeneration Test Suite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {testScenarios.map((scenario) => (
            <Button
              key={scenario.name}
              onClick={() => runTest(scenario)}
              variant="outline"
              className="h-auto p-3 text-left"
            >
              <div>
                <div className="font-medium text-sm">{scenario.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {scenario.description}
                </div>
              </div>
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current State:</h3>
          <div className="text-xs space-y-1 bg-muted p-2 rounded">
            <div>Prompt: "{state.positivePrompt}"</div>
            <div>Keep Seed: {state.keepSeed ? 'Yes' : 'No'}</div>
            <div>Reference Strength: {state.referenceStrength}</div>
            <div>Is Modified: {state.isModified ? 'Yes' : 'No'}</div>
            <div>Can Regenerate: {canRegenerate ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <Button
          onClick={regenerateImage}
          disabled={!canRegenerate || isGenerating}
          className="w-full"
        >
          {isGenerating ? 'Regenerating...' : 'Test Regeneration'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Test Log:</h3>
            <div className="text-xs space-y-1 bg-muted p-2 rounded max-h-32 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};