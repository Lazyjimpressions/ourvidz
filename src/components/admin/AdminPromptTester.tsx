
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Copy, Wand2, Clock, CheckCircle, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  responseTime: number;
  timestamp: Date;
  status: 'success' | 'failed';
  error?: string;
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
    setEnhancedPrompt("");
    setResponseTime(null);
    const startTime = Date.now();
    
    try {
      // Simulate prompt enhancement for admin testing
      // In a real implementation, this would call the actual enhancement service
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Generate a mock enhanced prompt
      const enhanced = `Enhanced: ${prompt} - with cinematic lighting, professional photography, high detail, 8K resolution, masterpiece quality`;
      
      setEnhancedPrompt(enhanced);
      setResponseTime(duration);
      setIsEnhancing(false);
      
      const testResult: TestResult = {
        id: Date.now().toString(),
        originalPrompt: prompt,
        enhancedPrompt: enhanced,
        responseTime: duration,
        timestamp: new Date(),
        status: 'success'
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      
      toast.success(`Prompt enhanced in ${Math.round(duration / 1000)}s (Mock Enhancement)`);
      
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setIsEnhancing(false);
      
      const testResult: TestResult = {
        id: Date.now().toString(),
        originalPrompt: prompt,
        enhancedPrompt: '',
        responseTime: duration,
        timestamp: new Date(),
        status: 'failed',
        error: error.message
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      
      toast.error("Enhancement failed");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const cancelEnhancement = () => {
    setIsEnhancing(false);
    toast.success("Enhancement cancelled");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input & Enhancement */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Enhancement Testing</CardTitle>
          <p className="text-sm text-gray-600">
            Test prompt enhancement (Mock implementation for admin testing)
          </p>
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
              disabled={isEnhancing}
            />
            <div className="text-sm text-gray-500">
              {prompt.length}/1000 characters
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleEnhancePrompt}
              disabled={!prompt.trim() || isEnhancing}
              className="flex-1"
            >
              {isEnhancing ? (
                <>
                  <LoadingSpinner className="mr-2" size="sm" />
                  Enhancing (Mock)...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Enhance Prompt
                </>
              )}
            </Button>
            
            {isEnhancing && (
              <Button
                onClick={cancelEnhancement}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            )}
          </div>

          {responseTime !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              Response time: {Math.round(responseTime / 1000)}s
            </div>
          )}

          {enhancedPrompt && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Enhanced Result (Mock)</Label>
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
          <p className="text-sm text-gray-600">
            Mock enhancement results for testing
          </p>
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
                      {Math.round(result.responseTime / 1000)}s
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

                  {result.error && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-red-700">Error:</div>
                      <div className="text-xs text-red-600 line-clamp-2">
                        {result.error}
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
