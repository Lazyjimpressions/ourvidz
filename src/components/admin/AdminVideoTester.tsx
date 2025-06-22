
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EnhancedVideoGeneration } from "@/components/EnhancedVideoGeneration";
import { Play, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoTest {
  id: string;
  prompt: string;
  duration: number;
  resolution: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  videoUrl?: string;
}

export const AdminVideoTester = () => {
  const [testPrompt, setTestPrompt] = useState("A person walking on a beach at sunset");
  const [testMode, setTestMode] = useState("quick");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [videoTests, setVideoTests] = useState<VideoTest[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const createTestProject = async () => {
    setIsCreatingProject(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: `Video Test - ${new Date().toISOString()}`,
          original_prompt: testPrompt,
          media_type: 'video'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentProjectId(project.id);
      
      toast({
        title: "Test Project Created",
        description: "Ready to start video generation testing",
      });

    } catch (error) {
      console.error('Error creating test project:', error);
      toast({
        title: "Error",
        description: "Failed to create test project",
        variant: "destructive"
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleVideoComplete = (videoUrl: string) => {
    if (videoTests.length > 0) {
      setVideoTests(prev => prev.map(test => 
        test.status === 'processing' 
          ? { ...test, status: 'completed', endTime: new Date(), videoUrl }
          : test
      ));
    }

    toast({
      title: "Video Test Completed",
      description: "Test video generation finished successfully",
    });
  };

  const startNewTest = () => {
    const newTest: VideoTest = {
      id: Date.now().toString(),
      prompt: testPrompt,
      duration: testMode === "quick" ? 5 : 15,
      resolution: testMode === "quick" ? "720p" : "1080p",
      status: 'processing',
      startTime: new Date()
    };

    setVideoTests(prev => [newTest, ...prev.slice(0, 4)]);
  };

  const getStatusIcon = (status: VideoTest['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTestDuration = (test: VideoTest) => {
    if (!test.endTime) return 'In progress...';
    const duration = Math.round((test.endTime.getTime() - test.startTime.getTime()) / 1000);
    return `${duration}s`;
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Video Generation Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video-test-prompt">Test Prompt</Label>
              <Input
                id="video-test-prompt"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter video test prompt..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Test Mode</Label>
              <Select value={testMode} onValueChange={setTestMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick Test (5s, 720p)</SelectItem>
                  <SelectItem value="full">Full Test (15s, 1080p)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={createTestProject}
              disabled={!testPrompt.trim() || isCreatingProject}
              variant="outline"
            >
              {isCreatingProject ? "Creating..." : "Create Test Project"}
            </Button>
            
            {currentProjectId && (
              <Badge variant="secondary">
                Project Ready: {currentProjectId.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Generation Interface */}
      {currentProjectId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div onClick={startNewTest}>
            <EnhancedVideoGeneration
              projectId={currentProjectId}
              onComplete={handleVideoComplete}
            />
          </div>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {videoTests.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No video tests run yet. Start a test to see results.
                  </div>
                ) : (
                  videoTests.map((test) => (
                    <div
                      key={test.id}
                      className="border rounded-lg p-3 space-y-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(test.status)}
                          <span className="text-sm font-medium capitalize">
                            {test.status}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {test.duration}s • {test.resolution}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 truncate">
                        {test.prompt}
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{test.startTime.toLocaleTimeString()}</span>
                        <span>Duration: {getTestDuration(test)}</span>
                      </div>
                      
                      {test.videoUrl && (
                        <div className="pt-2">
                          <video
                            src={test.videoUrl}
                            controls
                            className="w-full h-24 rounded object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
