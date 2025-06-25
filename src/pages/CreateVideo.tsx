
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FastVideoGenerator } from "@/components/generation/FastVideoGenerator";
import { HighVideoGenerator } from "@/components/generation/HighVideoGenerator";

export const CreateVideo = () => {
  const [activeGenerator, setActiveGenerator] = useState<'fast' | 'high'>('fast');
  const [generatedVideos, setGeneratedVideos] = useState<any[]>([]);

  const handleVideoGenerated = (video: any) => {
    setGeneratedVideos(prev => [video, ...prev]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Video</h1>
        <p className="text-gray-600">
          Generate videos using AI with different quality options
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

        {/* Generated Videos Display */}
        {generatedVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Videos ({generatedVideos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {generatedVideos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4">
                    <video
                      src={video.url}
                      controls
                      className="w-full h-40 object-cover rounded-lg mb-2"
                    />
                    <p className="text-sm text-gray-600">{video.prompt}</p>
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
