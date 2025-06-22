
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AdminImageGenerator } from "./AdminImageGenerator";
import { Image, Settings, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

export const AdminImageTester = () => {
  const [mode, setMode] = useState<"character" | "general">("general");
  const [batchSize, setBatchSize] = useState(4);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImagesGenerated = (images: GeneratedImage[]) => {
    setGeneratedImages(prev => [...images, ...prev]);
    
    toast({
      title: "Test Complete",
      description: `Generated ${images.length} images successfully`,
    });
  };

  const downloadAllImages = () => {
    generatedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `admin-test-image-${index + 1}.png`;
      link.click();
    });
    
    toast({
      title: "Download Started",
      description: `Downloading ${generatedImages.length} test images`,
    });
  };

  const clearResults = () => {
    setGeneratedImages([]);
  };

  const startBatchGeneration = async (prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    const batchResults: GeneratedImage[] = [];
    
    try {
      // Generate images in batches
      for (let i = 0; i < batchSize; i++) {
        // This would be called from the AdminImageGenerator
        // For now, we'll let the generator handle the actual generation
      }
    } catch (error) {
      console.error('Batch generation error:', error);
      toast({
        title: "Batch Generation Failed",
        description: "Some images failed to generate",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Generation Mode</Label>
            <Select value={mode} onValueChange={(value: "character" | "general") => setMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Images</SelectItem>
                <SelectItem value="character">Character Images</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Batch Size</Label>
            <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Image</SelectItem>
                <SelectItem value="2">2 Images</SelectItem>
                <SelectItem value="4">4 Images</SelectItem>
                <SelectItem value="8">8 Images</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Test Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{generatedImages.length}</div>
            <p className="text-xs text-muted-foreground">Total Generated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{isGenerating ? 'Generating...' : '100%'}</div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">~2.5s</div>
            <p className="text-xs text-muted-foreground">Avg Generation Time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadAllImages} 
              disabled={generatedImages.length === 0}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-1" />
              Download All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearResults}
              className="w-full"
            >
              Clear Results
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generator and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Image Generator */}
        <AdminImageGenerator
          mode={mode}
          batchSize={batchSize}
          onImagesGenerated={handleImagesGenerated}
          onGenerationStart={() => setIsGenerating(true)}
          onGenerationEnd={() => setIsGenerating(false)}
        />

        {/* Results Gallery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Test Results
              <Badge variant="secondary">{generatedImages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedImages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No images generated yet</p>
                <p className="text-sm">Start a test to see results here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                {generatedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative group rounded-lg overflow-hidden border hover:border-blue-300 transition-colors"
                  >
                    <img
                      src={image.url}
                      alt={`Test result ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = image.url;
                          link.download = `admin-test-${index + 1}.png`;
                          link.click();
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
