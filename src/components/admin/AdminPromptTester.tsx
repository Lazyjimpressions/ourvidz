
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Copy, Wand2, Clock, CheckCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TestResult {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  responseTime: number;
  timestamp: Date;
  status: 'success' | 'failed';
}

export const AdminPromptTester = () => {
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    
    setIsEnhancing(true);
    const startTime = Date.now();
    
    try {
      // Simulate prompt enhancement for testing
      // In a real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockEnhanced = `Enhanced: ${prompt} with cinematic lighting, ultra-high resolution, professional photography, dramatic composition, vibrant colors, masterpiece quality, detailed textures, perfect focus`;
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setEnhancedPrompt(mockEnhanced);
      setResponseTime(duration);
      
      const result: TestResult = {
        id: Date.now().toString(),
        originalPrompt: prompt,
        enhancedPrompt: mockEnhanced,
        responseTime: duration,
        timestamp: new Date(),
        status: 'success'
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 9)]);
      
      toast({
        title: "Prompt Enhanced",
        description: `Enhancement completed in ${duration}ms`,
      });

    } catch (error) {
      console.error('Error enhancing prompt:', error);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result: TestResult = {
        id: Date.now().toString(),
        originalPrompt: prompt,
        enhancedPrompt: '',
        responseTime: duration,
        timestamp: new Date(),
        status: 'failed'
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 9)]);
      
      toast({
        title: "Enhancement Failed",
        description: "Failed to enhance prompt. Check system status.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard.",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input & Enhancement */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Enhancement Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-prompt">Test Prompt</Label>
            <Textarea
              id="test-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to test enhancement..."
              className="min-h-[120px] resize-none"
            />
            <div className="text-sm text-gray-500">
              {prompt.length}/1000 characters
            </div>
          </div>

          <Button
            onClick={handleEnhancePrompt}
            disabled={!prompt.trim() || isEnhancing}
            className="w-full"
          >
            {isEnhancing ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Enhance Prompt
              </>
            )}
          </Button>

          {responseTime !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              Response time: {responseTime}ms
            </div>
          )}

          {enhancedPrompt && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Enhanced Result</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(enhancedPrompt)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  {enhancedPrompt}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Test Results History */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No test results yet. Run some enhancement tests to see results.
              </div>
            ) : (
              testResults.map((result) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={result.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {result.status === 'success' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {result.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {result.responseTime}ms
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700">Original:</div>
                    <div className="text-xs text-gray-600 truncate">
                      {result.originalPrompt}
                    </div>
                  </div>
                  
                  {result.enhancedPrompt && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-700">Enhanced:</div>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {result.enhancedPrompt}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400">
                    {result.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
