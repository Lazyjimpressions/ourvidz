import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Download, RefreshCw, Play, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeneration } from "@/hooks/useGeneration";
import { GenerationFormat } from "@/types/generation";

interface PromptTest {
  id: string;
  prompt: string;
  modelType: 'SDXL' | 'WAN';
  quality: number;
  notes: string;
  status: 'pending' | 'testing' | 'completed' | 'failed';
  createdAt: Date;
  jobId?: string;
}

export const PromptTestingTab = () => {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<string[]>(["", "", "", "", ""]);
  const [selectedModel, setSelectedModel] = useState<'SDXL' | 'WAN'>('SDXL');
  const [testResults, setTestResults] = useState<PromptTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTests, setActiveTests] = useState<Set<string>>(new Set());
  
  // Use the real generation system
  const { generateContent, isGenerating, currentJob } = useGeneration();

  useEffect(() => {
    loadTestResults();
  }, []);

  // Listen for generation completion events
  useEffect(() => {
    const handleGenerationComplete = async (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail || {};
      
      console.log('🎯 Admin prompt testing - generation completed:', { 
        assetId, 
        type, 
        jobId 
      });
      
      if (jobId && assetId) {
        try {
          // Update the prompt test result with the generated asset ID
          const { error: updateError } = await supabase
            .from('prompt_test_results')
            .update({ 
              image_id: type === 'image' ? assetId : null,
              success: true,
              generation_time_ms: Date.now() // This should be calculated from start time
            })
            .eq('job_id', jobId);

          if (updateError) {
            console.error('❌ Failed to update test result with asset ID:', updateError);
          } else {
            console.log('✅ Test result updated with asset ID:', { jobId, assetId, type });
          }
        } catch (error) {
          console.error('❌ Error updating test result:', error);
        }
      }
      
      // Find and update the corresponding test
      setTestResults(prev => 
        prev.map(test => 
          test.jobId === jobId 
            ? { ...test, status: 'completed' as const }
            : test
        )
      );
      
      // Remove from active tests
      setActiveTests(prev => {
        const newSet = new Set(prev);
        // Find the test with matching jobId and remove it
        const testToRemove = testResults.find(t => t.jobId === jobId);
        if (testToRemove) {
          newSet.delete(testToRemove.id);
        }
        return newSet;
      });
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, []);

  const loadTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setTestResults(data?.map(result => ({
        id: result.id,
        prompt: result.prompt_text,
        modelType: result.model_type as 'SDXL' | 'WAN',
        quality: result.quality_rating || 0,
        notes: result.notes || '',
        status: result.success ? 'completed' : 'failed',
        createdAt: new Date(result.created_at),
        jobId: (result as any).job_id || result.id // Use job_id if available, fallback to id
      })) || []);
    } catch (error) {
      console.error('Error loading test results:', error);
      toast({
        title: "Error",
        description: "Failed to load test results",
        variant: "destructive"
      });
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const addPrompt = () => {
    if (prompts.length < 10) {
      setPrompts([...prompts, ""]);
    }
  };

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      const newPrompts = prompts.filter((_, i) => i !== index);
      setPrompts(newPrompts);
    }
  };

  const clearPrompts = () => {
    setPrompts(["", "", "", "", ""]);
  };

  const submitBatch = async () => {
    const validPrompts = prompts.filter(p => p.trim());
    if (validPrompts.length === 0) {
      toast({
        title: "No Prompts",
        description: "Please enter at least one prompt to test",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const newTests: PromptTest[] = [];

    try {
      for (const prompt of validPrompts) {
        const testId = crypto.randomUUID();
        
        // Create test record in database first
        const { data: testRecord, error: dbError } = await supabase
          .from('prompt_test_results')
          .insert({
            id: testId,
            prompt_text: prompt.trim(),
            model_type: selectedModel,
            success: false,
            tested_by: user?.id
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ Failed to create test record:', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        const test: PromptTest = {
          id: testId,
          prompt: prompt.trim(),
          modelType: selectedModel,
          quality: 0,
          notes: "",
          status: 'pending',
          createdAt: new Date()
        };

        newTests.push(test);
        setActiveTests(prev => new Set([...prev, testId]));

        // Determine generation format based on model selection
        const generationFormat: GenerationFormat = selectedModel === 'SDXL' 
          ? 'sdxl_image_fast' 
          : 'image_fast';

        try {
          console.log(`🎬 Submitting prompt for ${selectedModel} testing:`, prompt.trim());
          
          await generateContent({
            format: generationFormat,
            prompt: prompt.trim(),
            metadata: {
              source: 'admin_prompt_testing',
              test_id: testId,
              model_type: selectedModel.toLowerCase(),
              admin_test: true
            }
          });

          // Update test with job ID if available
          if (currentJob?.id) {
            // Update database record with job ID
            await supabase
              .from('prompt_test_results')
              .update({ 
                job_id: currentJob.id,
                success: true 
              })
              .eq('id', testId);

            setTestResults(prev => 
              prev.map(t => 
                t.id === testId 
                  ? { ...t, jobId: currentJob.id, status: 'testing' as const }
                  : t
              )
            );
          }

          console.log(`✅ Prompt submitted for ${selectedModel} testing`);
        } catch (error) {
          console.error(`❌ Failed to submit prompt for ${selectedModel} testing:`, error);
          
          // Update database record with error
          await supabase
            .from('prompt_test_results')
            .update({ 
              success: false,
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', testId);
          
          // Update test status to failed
          setTestResults(prev => 
            prev.map(t => 
              t.id === testId 
                ? { ...t, status: 'failed' as const }
                : t
            )
          );
          
          setActiveTests(prev => {
            const newSet = new Set(prev);
            newSet.delete(testId);
            return newSet;
          });
        }
      }

      setTestResults(prev => [...newTests, ...prev]);
      clearPrompts();

      toast({
        title: "Batch Submitted",
        description: `${validPrompts.length} prompts submitted for ${selectedModel} testing`,
      });
    } catch (error) {
      console.error('Error submitting batch:', error);
      toast({
        title: "Error",
        description: "Failed to submit prompts for testing",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateQualityRating = async (testId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('prompt_test_results')
        .update({ quality_rating: rating })
        .eq('id', testId);

      if (error) throw error;

      setTestResults(prev => 
        prev.map(test => 
          test.id === testId 
            ? { ...test, quality: rating }
            : test
        )
      );

      toast({
        title: "Rating Updated",
        description: `Quality rating updated to ${rating}/5`,
      });
    } catch (error) {
      console.error('Error updating rating:', error);
      toast({
        title: "Error",
        description: "Failed to update rating",
        variant: "destructive"
      });
    }
  };

  const updateNotes = async (testId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('prompt_test_results')
        .update({ notes })
        .eq('id', testId);

      if (error) throw error;

      setTestResults(prev => 
        prev.map(test => 
          test.id === testId 
            ? { ...test, notes }
            : test
        )
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const exportResults = () => {
    const csvContent = [
      ['Prompt', 'Model', 'Quality Rating', 'Notes', 'Status', 'Created'],
      ...testResults.map(test => [
        test.prompt,
        test.modelType,
        test.quality.toString(),
        test.notes,
        test.status,
        test.createdAt.toISOString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Test results exported to CSV",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      testing: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const renderStars = (testId: string, currentRating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => updateQualityRating(testId, star)}
            className={`p-1 rounded transition-colors ${
              star <= currentRating 
                ? 'text-yellow-400 hover:text-yellow-300' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Star className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Batch Submission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Batch Prompt Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Model:</Label>
              <Select value={selectedModel} onValueChange={(value: 'SDXL' | 'WAN') => setSelectedModel(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDXL">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      SDXL
                    </div>
                  </SelectItem>
                  <SelectItem value="WAN">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      WAN
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">
              {prompts.filter(p => p.trim()).length}/10 prompts
            </Badge>
          </div>

          {/* Prompt Inputs */}
          <div className="space-y-3">
            {prompts.map((prompt, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Textarea
                    value={prompt}
                    onChange={(e) => handlePromptChange(index, e.target.value)}
                    placeholder={`Prompt ${index + 1}...`}
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                {prompts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrompt(index)}
                    disabled={isLoading}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={submitBatch}
              disabled={isLoading || prompts.filter(p => p.trim()).length === 0}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Submit Batch
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={addPrompt}
              disabled={isLoading || prompts.length >= 10}
            >
              Add Prompt
            </Button>
            <Button
              variant="outline"
              onClick={clearPrompts}
              disabled={isLoading}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Test Results ({testResults.length})
            </CardTitle>
            <Button
              variant="outline"
              onClick={exportResults}
              disabled={testResults.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testResults.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={test.prompt}>
                        {test.prompt}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {test.modelType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {test.status === 'completed' ? (
                        renderStars(test.id, test.quality)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(test.status)}
                      {activeTests.has(test.id) && (
                        <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={test.notes}
                        onChange={(e) => updateNotes(test.id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-32 h-16 text-xs"
                        disabled={test.status !== 'completed'}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {test.createdAt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 