
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeneration } from "@/hooks/useGeneration";
import { toast } from "sonner";
import { Camera, Play, Sparkles, Upload, Brush } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

export const Workspace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'image';
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success(`${mode === 'image' ? 'Image' : 'Video'} generation started!`);
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, mode as 'image' | 'video');

  // Check if generation is complete
  if (generationData?.status === 'completed') {
    const contentData = generationData as any;
    if (mode === 'image' && contentData.image_urls && contentData.image_urls.length > 0) {
      const images = contentData.image_urls.map((url: string, index: number) => ({
        id: `${generatedId}-${index}`,
        url,
        prompt,
        timestamp: new Date(),
        quality: 'fast' as const
      }));
      setGeneratedContent(prev => [...images, ...prev]);
      setGeneratedId(null);
    } else if (mode === 'video' && contentData.video_url) {
      const video: GeneratedContent = {
        id: generatedId!,
        url: contentData.video_url,
        prompt,
        timestamp: new Date(),
        quality: 'fast' as const
      };
      setGeneratedContent(prev => [video, ...prev]);
      setGeneratedId(null);
    }
  }

  const handleModeChange = (newMode: 'image' | 'video') => {
    setSearchParams({ mode: newMode });
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    generate({
      format: mode as 'image' | 'video',
      quality: 'fast',
      prompt: prompt.trim(),
      metadata: {
        source: 'workspace'
      }
    });
  };

  const handleReferenceImageUpload = () => {
    // TODO: Implement reference image upload functionality
    toast.info("Reference image upload coming soon!");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-4xl">
          <h1 className="text-4xl font-light mb-4">
            Let's start with some{' '}
            <span className="inline-flex items-center gap-2">
              {mode === 'image' ? 'image storming' : 'video creation'}
              <div className="flex gap-1 ml-2">
                <img 
                  src="https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=32&h=32&fit=crop&crop=center" 
                  alt="" 
                  className="w-8 h-8 rounded object-cover"
                />
                <img 
                  src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=32&h=32&fit=crop&crop=center" 
                  alt="" 
                  className="w-8 h-8 rounded object-cover"
                />
                <img 
                  src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=32&h=32&fit=crop&crop=center" 
                  alt="" 
                  className="w-8 h-8 rounded object-cover"
                />
              </div>
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            Type your prompt, set your style, and generate your image
          </p>
        </div>
      </div>

      {/* Free-Floating Two-Row Input Container */}
      <div className="pb-8 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
            {/* Row 1: IMAGE, Reference Upload, Text Input, Generate Button */}
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant={mode === 'image' ? 'default' : 'ghost'}
                onClick={() => handleModeChange('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  mode === 'image' 
                    ? 'bg-white text-black hover:bg-gray-100' 
                    : 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                IMAGE
              </Button>

              {/* Reference Image Upload */}
              <Button
                variant="ghost"
                onClick={handleReferenceImageUpload}
                className="w-12 h-12 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
              >
                <Upload className="w-5 h-5 text-gray-400" />
              </Button>

              {/* Main Text Input */}
              <div className="flex-1">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A close-up of a woman talking on the phone..."
                  className="bg-transparent border-none text-white placeholder:text-gray-400 text-lg py-3 px-4 focus:outline-none focus:ring-0 h-12"
                  disabled={isGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 rounded-full"
              >
                <Sparkles className="w-5 h-5" />
              </Button>
            </div>

            {/* Row 2: VIDEO and Advanced Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant={mode === 'video' ? 'default' : 'ghost'}
                onClick={() => handleModeChange('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  mode === 'video' 
                    ? 'bg-white text-black hover:bg-gray-100' 
                    : 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                VIDEO
              </Button>

              {/* Spacer to align with reference upload button position */}
              <div className="w-12"></div>

              {/* Advanced Controls */}
              <div className="flex items-center gap-3 flex-1">
                {/* Aspect Ratio */}
                <Select defaultValue="16:9">
                  <SelectTrigger className="w-20 bg-gray-800 border-gray-700 text-white text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 z-50">
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                  </SelectContent>
                </Select>

                {/* Shot Type */}
                <Select>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white text-sm h-10">
                    <SelectValue placeholder="Shot Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 z-50">
                    <SelectItem value="close-up">Close-up</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="wide">Wide</SelectItem>
                  </SelectContent>
                </Select>

                {/* Angle */}
                <Select>
                  <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white text-sm h-10">
                    <SelectValue placeholder="Angle" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 z-50">
                    <SelectItem value="front">Front</SelectItem>
                    <SelectItem value="side">Side</SelectItem>
                    <SelectItem value="back">Back</SelectItem>
                  </SelectContent>
                </Select>

                {/* Style */}
                <Select>
                  <SelectTrigger className="w-28 bg-gray-800 border-gray-700 text-white text-sm h-10">
                    <div className="flex items-center gap-2">
                      <Brush className="w-4 h-4" />
                      <SelectValue placeholder="Style" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 z-50">
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                  </SelectContent>
                </Select>

                {/* Style Ref */}
                <Button
                  variant="ghost"
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm h-10"
                >
                  Style ref
                </Button>
              </div>

              {/* Spacer to align with generate button */}
              <div className="w-12"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Content Display */}
      {generatedContent.length > 0 && (
        <div className="border-t border-gray-800 p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-medium mb-4">Generated {mode === 'image' ? 'Images' : 'Videos'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generatedContent.map((item) => (
                <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden">
                  {mode === 'image' ? (
                    <img
                      src={item.url}
                      alt="Generated content"
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-32 object-cover"
                      controls
                    />
                  )}
                  <div className="p-2">
                    <p className="text-xs text-gray-400 truncate">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
