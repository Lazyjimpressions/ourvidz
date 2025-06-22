
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageGenerator } from "@/components/ImageGenerator";
import { GeneratedImage } from "@/pages/ImageCreation";
import { Image, Settings, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const AdminImageTester = () => {
  const [testPrompt, setTestPrompt] = useState("A beautiful landscape with mountains and a lake at sunset");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [mode, setMode] = useState<"character" | "general">("general");
  const [batchSize, setBatchSize] = useState("4");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [testResults, setTestResults] = useState({
    totalGenerated: 0,
    successRate: 0,
    avgTime: 0
  });

  const handleImagesGenerated = (images: GeneratedImage[]) => {
    setGeneratedImages(prev => [...images, ...prev]);
    
    // Update test metrics
    setTestResults(prev => ({
      totalGenerated: prev.totalGenerated + images.length,
      successRate: Math.round(((prev.totalGenerated + images.length) / (prev.totalGenerated + parseInt(batchSize))) * 100),
      avgTime: prev.avgTime // Would calculate real average in production
    }));

    toast({
      title: "Test Complete",
      description: `Generated ${images.length} images successfully`,
    });
  };

  const downloadAllImages = () => {
    generatedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `test-image-${index + 1}.png`;
      link.click();
    });
    
    toast({
      title: "Download Started",
      description: `Downloading ${generatedImages.length} test images`,
    });
  };

  const clearResults = () => {
    setGeneratedImages([]);
    setTestResults({ totalGenerated: 0, successRate: 0, avgTime: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Image Generation Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-prompt">Test Prompt</Label>
            <Input
              id="test-prompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter test prompt..."
            />
          </div>
          
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
            <Select value={batchSize} onValueChange={setBatchSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Image</SelectItem>
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
            <div className="text-2xl font-bold">{testResults.totalGenerated}</div>
            <p className="text-xs text-muted-foreground">Images Generated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{testResults.successRate}%</div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{testResults.avgTime}s</div>
            <p className="text-xs text-muted-foreground">Avg Generation Time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Button variant="outline" size="sm" onClick={downloadAllImages} disabled={generatedImages.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Download All
            </Button>
            <Button variant="outline" size="sm" onClick={clearResults}>
              Clear Results
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImageGenerator
          prompt={testPrompt}
          enhancedPrompt={enhancedPrompt}
          mode={mode}
          onImagesGenerated={handleImagesGenerated}
        />

        {/* Generated Images Gallery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Test Results Gallery
              <Badge variant="secondary">{generatedImages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedImages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No images generated yet. Start a test to see results.
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
