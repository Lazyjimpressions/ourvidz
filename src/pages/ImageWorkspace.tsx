
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FastImageGenerator } from "@/components/generation/FastImageGenerator";
import { HighImageGenerator } from "@/components/generation/HighImageGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

export const ImageWorkspace = () => {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [activeGenerator, setActiveGenerator] = useState<'fast' | 'high'>('fast');

  const handleImagesGenerated = (newImages: GeneratedImage[]) => {
    setGeneratedImages(prev => [...newImages, ...prev]);
    toast.success(`Generated ${newImages.length} image${newImages.length > 1 ? 's' : ''}!`);
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `generated-image-${image.id}.png`;
    link.click();
    toast.success('Download started');
  };

  const clearImages = () => {
    setGeneratedImages([]);
    toast.success('Images cleared');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image Generation Workspace</h1>
        <p className="text-gray-600">
          Create images using fast or high-quality generation models
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generation Panel */}
        <div className="space-y-6">
          {/* Generator Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Generation Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
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
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Generated Images
                  <Badge variant="secondary">{generatedImages.length}</Badge>
                </div>
                {generatedImages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearImages}>
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedImages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images generated yet</p>
                  <p className="text-sm">Use the generator on the left to create images</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
                  {generatedImages.map((image) => (
                    <div
                      key={image.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={image.url}
                          alt="Generated image"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={image.quality === 'high' ? 'default' : 'secondary'}>
                              {image.quality} quality
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {image.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {image.prompt}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadImage(image)}
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
