
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FastVideoGenerator } from "@/components/generation/FastVideoGenerator";
import { HighVideoGenerator } from "@/components/generation/HighVideoGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Play } from "lucide-react";
import { toast } from "sonner";

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

export const VideoWorkspace = () => {
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [activeGenerator, setActiveGenerator] = useState<'fast' | 'high'>('fast');

  const handleVideoGenerated = (newVideo: GeneratedVideo) => {
    setGeneratedVideos(prev => [newVideo, ...prev]);
    toast.success('Video generated successfully!');
  };

  const downloadVideo = (video: GeneratedVideo) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `generated-video-${video.id}.mp4`;
    link.click();
    toast.success('Download started');
  };

  const clearVideos = () => {
    setGeneratedVideos([]);
    toast.success('Videos cleared');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Generation Workspace</h1>
        <p className="text-gray-600">
          Create videos using fast or high-quality generation models
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
                  <Badge variant="secondary" className="ml-2">3 credits</Badge>
                </Button>
                <Button
                  variant={activeGenerator === 'high' ? 'default' : 'outline'}
                  onClick={() => setActiveGenerator('high')}
                  className="flex-1"
                >
                  High Quality
                  <Badge variant="secondary" className="ml-2">5 credits</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Generator */}
          {activeGenerator === 'fast' ? (
            <FastVideoGenerator
              onVideoGenerated={handleVideoGenerated}
              buttonText="Generate Fast Video"
            />
          ) : (
            <HighVideoGenerator
              onVideoGenerated={handleVideoGenerated}
              buttonText="Generate High Quality Video"
            />
          )}
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Generated Videos
                  <Badge variant="secondary">{generatedVideos.length}</Badge>
                </div>
                {generatedVideos.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearVideos}>
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedVideos.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No videos generated yet</p>
                  <p className="text-sm">Use the generator on the left to create videos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
                  {generatedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="space-y-4">
                        <video
                          src={video.url}
                          controls
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={video.quality === 'high' ? 'default' : 'secondary'}>
                              {video.quality} quality
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {video.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {video.prompt}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadVideo(video)}
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
