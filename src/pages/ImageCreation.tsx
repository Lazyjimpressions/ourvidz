
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";
import { FastImageGenerator } from "@/components/generation/FastImageGenerator";
import { HighImageGenerator } from "@/components/generation/HighImageGenerator";

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt: string;
  timestamp: Date;
  isCharacter?: boolean;
}

export const ImageCreation = () => {
  const [activeGenerator, setActiveGenerator] = useState<'fast' | 'high'>('fast');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handleImagesGenerated = (images: GeneratedImage[]) => {
    setGeneratedImages(prev => [...images, ...prev]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Images</h1>
        <p className="text-gray-600">
          Generate images using AI with different quality options
        </p>
      </div>

      <div className="space-y-6">
        {/* Generator Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Generation Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={activeGenerator === 'fast' ? 'default' : 'outline'}
                onClick={() => setActiveGenerator('fast')}
                className="flex-1"
              >
                Fast Generation
                <Badge variant="secondary" className="ml-2">1 credit</Badge>
              </Button>
              <Button
                variant={activeGenerator === 'high' ? 'default' : 'outline'}
                onClick={() => setActiveGenerator('high')}
                className="flex-1"
              >
                High Quality
                <Badge variant="secondary" className="ml-2">2 credits</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Generator */}
        {activeGenerator === 'fast' ? (
          <FastImageGenerator
            onImagesGenerated={handleImagesGenerated}
            buttonText="Generate Fast Image"
          />
        ) : (
          <HighImageGenerator
            onImagesGenerated={handleImagesGenerated}
            buttonText="Generate High Quality Image"
          />
        )}

        {/* Generated Images Display */}
        {generatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Generated Images ({generatedImages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {generatedImages.map((image) => (
                  <div key={image.id} className="border rounded-lg p-2">
                    <img
                      src={image.url}
                      alt="Generated image"
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {image.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
