import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  id: string;
  prompt_text: string;
  test_tier: 'artistic' | 'explicit' | 'unrestricted';
  test_series: string;
  model_type: 'SDXL' | 'WAN' | 'LORA';
  overall_quality: number;
  technical_quality: number;
  content_quality: number;
  consistency: number;
  notes: string;
  created_at: string;
  image_id?: string;
  image_url?: string;
  video_id?: string;
  video_url?: string;
  job_id?: string;
  generation_time_ms?: number;
  file_size_bytes?: number;
  success: boolean;
}

interface TestSeries {
  id: string;
  name: string;
  description: string;
  model_type: 'SDXL' | 'WAN';
  prompts: {
    artistic: string;
    explicit: string;
    unrestricted: string;
  };
}

// SDXL Test Series
const SDXL_TEST_SERIES: TestSeries[] = [
  {
    id: 'couples-intimacy',
    name: 'Couples Intimacy Progression',
    description: 'Basic couple scenes progressing through tiers',
    model_type: 'SDXL',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  },
  {
    id: 'shower-bath',
    name: 'Shower/Bath Scenes',
    description: 'Wet scenes with steamy atmosphere',
    model_type: 'SDXL',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate couple shower scene, steamy atmosphere, soft lighting, artistic composition, tasteful nudity, emotional connection, natural skin tones, professional camera, shallow depth of field, warm lighting, romantic atmosphere, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple shower scene, steamy atmosphere, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult shower scene, steamy atmosphere, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  },
  {
    id: 'bedroom-intimacy',
    name: 'Bedroom Intimacy',
    description: 'Classic bedroom scenes',
    model_type: 'SDXL',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate couple bedroom scene, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple bedroom scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult bedroom scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  },
  {
    id: 'multi-person',
    name: 'Multi-Person Scenes',
    description: 'Group scenes and complex interactions',
    model_type: 'SDXL',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate group scene, soft natural lighting, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate group scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult group scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  }
];

// WAN Test Series
const WAN_TEST_SERIES: TestSeries[] = [
  {
    id: 'couples-motion',
    name: 'Couples Motion Intimacy',
    description: 'Smooth romantic motion sequences',
    model_type: 'WAN',
    prompts: {
      artistic: 'attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment',
      explicit: 'unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism',
      unrestricted: 'unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism'
    }
  },
  {
    id: 'shower-motion',
    name: 'Shower/Bath Motion Scenes',
    description: 'Wet motion scenes with steamy atmosphere',
    model_type: 'WAN',
    prompts: {
      artistic: 'attractive couple in steamy shower, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection',
      explicit: 'unrestricted nsfw, attractive couple, passionate shower scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism',
      unrestricted: 'unrestricted nsfw, explicit adult shower scene, passionate couple intimate moment, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism'
    }
  },
  {
    id: 'bedroom-motion',
    name: 'Bedroom Motion Intimacy',
    description: 'Intimate motion sequences',
    model_type: 'WAN',
    prompts: {
      artistic: 'attractive couple in intimate bedroom scene, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection',
      explicit: 'unrestricted nsfw, attractive couple, passionate bedroom scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism',
      unrestricted: 'unrestricted nsfw, explicit adult bedroom scene, passionate couple intimate moment, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism'
    }
  },
  {
    id: 'group-motion',
    name: 'Multi-Person Motion Scenes',
    description: 'Multi-person motion interactions',
    model_type: 'WAN',
    prompts: {
      artistic: 'attractive group in intimate scene, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection',
      explicit: 'unrestricted nsfw, attractive group, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism',
      unrestricted: 'unrestricted nsfw, explicit adult group scene, passionate intimate moment, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism'
    }
  }
];

interface BatchTestConfig {
  model_type: 'SDXL' | 'WAN';
  series: string[];
  tiers: ('artistic' | 'explicit' | 'unrestricted')[];
  job_type: string;
  variations_per_prompt: number;
}

export function PromptTestingTab() {
  const [selectedModel, setSelectedModel] = useState<'SDXL' | 'WAN'>('SDXL');
  const [selectedSeries, setSelectedSeries] = useState<string>('couples-intimacy');
  const [selectedTier, setSelectedTier] = useState<'artistic' | 'explicit' | 'unrestricted'>('artistic');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [batchConfig, setBatchConfig] = useState<BatchTestConfig>({
    model_type: 'SDXL',
    series: [],
    tiers: ['artistic'],
    job_type: 'sdxl_image_fast',
    variations_per_prompt: 3
  });
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const { toast } = useToast();

  // Accurate token estimation using tiktoken
  const estimateTokens = useCallback((text: string) => {
    try {
      // Use tiktoken for accurate token counting
      const { encode } = require('@dqbd/tiktoken/encoders/cl100k_base');
      return encode(text).length;
    } catch (error) {
      console.warn('Tiktoken unavailable, using fallback estimation:', error);
      // Fallback: More accurate estimation based on GPT tokenization patterns
      return Math.ceil(text.length / 3.5); // Average 3.5 chars per token for English
    }
  }, []);

  // Get current test series based on selected model
  const getCurrentTestSeries = () => {
    return selectedModel === 'SDXL' ? SDXL_TEST_SERIES : WAN_TEST_SERIES;
  };

  // Load test results on component mount
  useEffect(() => {
    loadTestResults();
  }, []);

  // Add realtime subscription for test results
  useEffect(() => {
    const channel = supabase
      .channel('model-test-results-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'model_test_results'
        },
        (payload) => {
          console.log('Real-time test result update:', payload);
          loadTestResults(); // Refresh results on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update current prompt when series or tier changes
  useEffect(() => {
    const series = getCurrentTestSeries().find(s => s.id === selectedSeries);
    if (series) {
      setCurrentPrompt(series.prompts[selectedTier]);
    }
  }, [selectedSeries, selectedTier, selectedModel]);

  // Update batch config when model changes
  useEffect(() => {
    setBatchConfig(prev => ({
      ...prev,
      model_type: selectedModel,
      job_type: selectedModel === 'SDXL' ? 'sdxl_image_fast' : 'video_fast',
      series: []
    }));
  }, [selectedModel]);

  const loadTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('model_test_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestResults((data || []).map(item => ({
        ...item,
        test_tier: item.test_tier as 'artistic' | 'explicit' | 'unrestricted',
        model_type: item.model_type as 'SDXL' | 'WAN' | 'LORA'
      })));
    } catch (error) {
      console.error('Error loading test results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test results',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateContent = async (prompt: string, jobType: string, metadata: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType,
          metadata: {
            prompt,
            ...metadata
          }
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  };

  const saveTestResult = async (
    jobId: string,
    prompt: string,
    modelType: string,
    series: string,
    tier: string
  ) => {
    try {
      console.log('Saving test result:', { jobId, prompt, modelType, series, tier });
      
      const { error } = await supabase
        .from('model_test_results')
        .insert({
          job_id: jobId,
          prompt_text: prompt,
          model_type: modelType,
          test_series: series,
          test_tier: tier,
          success: true, // Will be updated by job callback
          test_metadata: {
            prompt_length: prompt.length,
            token_count: estimateTokens(prompt),
            created_from: 'admin_prompt_testing',
            timestamp: new Date().toISOString(),
            job_status: 'queued',
            generation_initiated: true
          }
        });

      if (error) {
        console.error('Error saving test result:', error);
        toast({
          title: 'Error',
          description: `Failed to save test result: ${error.message}`,
          variant: 'destructive'
        });
      } else {
        console.log('Test result saved successfully');
        toast({
          title: 'Success',
          description: 'Test generation started - result will update when complete',
        });
        loadTestResults();
      }
    } catch (error) {
      console.error('Error saving test result:', error);
      toast({
        title: 'Error',
        description: 'Failed to save test result',
        variant: 'destructive'
      });
    }
  };

  const generateSingle = async () => {
    if (!currentPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const jobType = selectedModel === 'SDXL' ? 'sdxl_image_fast' : 'video_fast';
      
      // Generate a unique job ID for test tracking
      const testJobId = crypto.randomUUID();
      
      const result = await generateContent(currentPrompt, jobType, {
        prompt: currentPrompt,
        test_series: selectedSeries,
        test_tier: selectedTier,
        created_from: 'admin_prompt_testing',
        prompt_test_metadata: {
          model_type: selectedModel,
          test_category: 'prompt_testing',
          generation_source: 'admin_panel'
        },
        prompt_test_id: testJobId,
        queue: selectedModel === 'SDXL' ? 'sdxl_queue' : 'wan_queue'
      });

      // Save test result with job tracking
      await saveTestResult(
        result.job?.id || testJobId,
        currentPrompt,
        selectedModel,
        selectedSeries,
        selectedTier
      );

      toast({
        title: 'Success',
        description: `${selectedModel} content generated successfully`,
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate content',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const runBatchTest = async () => {
    if (batchConfig.series.length === 0 || batchConfig.tiers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one series and tier for batch testing',
        variant: 'destructive'
      });
      return;
    }

    setIsBatchRunning(true);
    const totalTests = batchConfig.series.length * batchConfig.tiers.length * batchConfig.variations_per_prompt;
    setBatchTotal(totalTests);
    setBatchProgress(0);

    try {
      const jobType = batchConfig.model_type === 'SDXL' ? 'sdxl_image_fast' : 'video_fast';
      let completedTests = 0;

      for (const seriesId of batchConfig.series) {
        const series = getCurrentTestSeries().find(s => s.id === seriesId);
        if (!series) continue;

        for (const tier of batchConfig.tiers) {
          const prompt = series.prompts[tier];
          
          for (let i = 0; i < batchConfig.variations_per_prompt; i++) {
              try {
                const testJobId = crypto.randomUUID();
                
                const result = await generateContent(prompt, jobType, {
                  prompt: prompt,
                  test_series: seriesId,
                  test_tier: tier,
                  created_from: 'admin_prompt_testing',
                  prompt_test_metadata: {
                    model_type: batchConfig.model_type,
                    test_category: 'batch_testing',
                    generation_source: 'admin_panel',
                    batch_variation: i + 1
                  },
                  prompt_test_id: testJobId,
                  queue: batchConfig.model_type === 'SDXL' ? 'sdxl_queue' : 'wan_queue',
                  batch_variation: i + 1
                });

                await saveTestResult(
                  result.job?.id || testJobId,
                  prompt,
                  batchConfig.model_type,
                  seriesId,
                  tier
                );

              completedTests++;
              setBatchProgress(completedTests);

              // Small delay between generations to avoid overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
              console.error(`Batch test error for ${seriesId} ${tier} variation ${i + 1}:`, error);
              completedTests++;
              setBatchProgress(completedTests);
            }
          }
        }
      }

      toast({
        title: 'Batch Test Complete',
        description: `Completed ${completedTests} tests successfully`,
      });

    } catch (error) {
      console.error('Batch test error:', error);
      toast({
        title: 'Error',
        description: 'Batch test failed',
        variant: 'destructive'
      });
    } finally {
      setIsBatchRunning(false);
      setBatchProgress(0);
      setBatchTotal(0);
    }
  };

  const updateTestResult = async (id: string, updates: Partial<TestResult>) => {
    try {
      const { data, error } = await supabase
        .from('model_test_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestResults(prev => prev.map(r => r.id === id ? data as TestResult : r));
      toast({
        title: 'Success',
        description: 'Test result updated',
      });
    } catch (error) {
      console.error('Error updating test result:', error);
      toast({
        title: 'Error',
        description: 'Failed to update test result',
        variant: 'destructive'
      });
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'artistic': return 'bg-blue-100 text-blue-800';
      case 'explicit': return 'bg-yellow-100 text-yellow-800';
      case 'unrestricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getModelColor = (model: string) => {
    switch (model) {
      case 'SDXL': return 'bg-purple-100 text-purple-800';
      case 'WAN': return 'bg-green-100 text-green-800';
      case 'LORA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Model Testing Framework</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {testResults.length} Tests Completed
          </Badge>
          <Badge className={getModelColor(selectedModel)}>
            {selectedModel}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList>
          <TabsTrigger value="generator">Single Test</TabsTrigger>
          <TabsTrigger value="batch">Batch Testing</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Model Type</label>
                  <Select value={selectedModel} onValueChange={(value: 'SDXL' | 'WAN') => setSelectedModel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SDXL">SDXL LUSTIFY (Images)</SelectItem>
                      <SelectItem value="WAN">WAN 2.1 (Videos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Test Series</label>
                  <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCurrentTestSeries().map(series => (
                        <SelectItem key={series.id} value={series.id}>
                          {series.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Content Tier</label>
                  <Select value={selectedTier} onValueChange={(value: 'artistic' | 'explicit' | 'unrestricted') => setSelectedTier(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artistic">Artistic (Tasteful)</SelectItem>
                      <SelectItem value="explicit">Explicit (Direct)</SelectItem>
                      <SelectItem value="unrestricted">Unrestricted (Maximum)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Series Description</label>
                <p className="text-sm text-gray-600 mt-1">
                  {getCurrentTestSeries().find(s => s.id === selectedSeries)?.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Generated Prompt</label>
                <Textarea
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder="Enter or modify the prompt..."
                  className="min-h-[100px] font-mono text-sm"
                />
                 <div className="flex items-center justify-between mt-2">
                   <span className="text-xs text-gray-500">
                     {estimateTokens(currentPrompt)} tokens (max {selectedModel === 'SDXL' ? '150' : '200'})
                   </span>
                   <Badge 
                     variant={estimateTokens(currentPrompt) > (selectedModel === 'SDXL' ? 150 : 200) ? 'destructive' : 'secondary'}
                   >
                     {estimateTokens(currentPrompt) > (selectedModel === 'SDXL' ? 150 : 200) ? 'Token Limit Exceeded' : 'Within Limits'}
                   </Badge>
                 </div>
              </div>

              <div className="flex gap-2">
                 <Button 
                   onClick={generateSingle}
                   disabled={isGenerating || estimateTokens(currentPrompt) > (selectedModel === 'SDXL' ? 150 : 200)}
                   className="flex-1"
                 >
                  {isGenerating ? 'Generating...' : `Generate ${selectedModel === 'SDXL' ? 'Image' : 'Video'}`}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(currentPrompt)}
                >
                  Copy Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Model Type</label>
                  <Select value={batchConfig.model_type} onValueChange={(value: 'SDXL' | 'WAN') => setBatchConfig(prev => ({ ...prev, model_type: value, job_type: value === 'SDXL' ? 'sdxl_image_fast' : 'video_fast' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SDXL">SDXL LUSTIFY (Images)</SelectItem>
                      <SelectItem value="WAN">WAN 2.1 (Videos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Variations per Prompt</label>
                  <Select value={batchConfig.variations_per_prompt.toString()} onValueChange={(value) => setBatchConfig(prev => ({ ...prev, variations_per_prompt: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 variation</SelectItem>
                      <SelectItem value="3">3 variations</SelectItem>
                      <SelectItem value="5">5 variations</SelectItem>
                      <SelectItem value="10">10 variations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Test Series</label>
                <div className="grid grid-cols-2 gap-2">
                  {getCurrentTestSeries().map(series => (
                    <div key={series.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={series.id}
                        checked={batchConfig.series.includes(series.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBatchConfig(prev => ({ ...prev, series: [...prev.series, series.id] }));
                          } else {
                            setBatchConfig(prev => ({ ...prev, series: prev.series.filter(s => s !== series.id) }));
                          }
                        }}
                      />
                      <label htmlFor={series.id} className="text-sm">{series.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Content Tiers</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['artistic', 'explicit', 'unrestricted'] as const).map(tier => (
                    <div key={tier} className="flex items-center space-x-2">
                      <Checkbox
                        id={tier}
                        checked={batchConfig.tiers.includes(tier)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBatchConfig(prev => ({ ...prev, tiers: [...prev.tiers, tier] }));
                          } else {
                            setBatchConfig(prev => ({ ...prev, tiers: prev.tiers.filter(t => t !== tier) }));
                          }
                        }}
                      />
                      <label htmlFor={tier} className="text-sm capitalize">{tier}</label>
                    </div>
                  ))}
                </div>
              </div>

              {batchConfig.series.length > 0 && batchConfig.tiers.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>Batch Test Summary:</strong> {batchConfig.series.length} series × {batchConfig.tiers.length} tiers × {batchConfig.variations_per_prompt} variations = {batchConfig.series.length * batchConfig.tiers.length * batchConfig.variations_per_prompt} total tests
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={runBatchTest}
                disabled={isBatchRunning || batchConfig.series.length === 0 || batchConfig.tiers.length === 0}
                className="w-full"
              >
                {isBatchRunning ? 'Running Batch Test...' : 'Start Batch Test'}
              </Button>

              {isBatchRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{batchProgress} / {batchTotal}</span>
                  </div>
                  <Progress value={(batchProgress / batchTotal) * 100} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTierColor(result.test_tier)}>
                            {result.test_tier}
                          </Badge>
                          <Badge className={getModelColor(result.model_type)}>
                            {result.model_type}
                          </Badge>
                          <Badge variant="outline">
                            {getCurrentTestSeries().find(s => s.id === result.test_series)?.name || result.test_series}
                          </Badge>
                        </div>
                        <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                          {result.prompt_text}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-medium">Overall Quality</label>
                        <Select 
                          value={result.overall_quality.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { overall_quality: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Technical Quality</label>
                        <Select 
                          value={result.technical_quality.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { technical_quality: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Content Quality</label>
                        <Select 
                          value={result.content_quality.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { content_quality: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Consistency</label>
                        <Select 
                          value={result.consistency.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { consistency: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium">Notes</label>
                      <Textarea
                        value={result.notes || ''}
                        onChange={(e) => updateTestResult(result.id, { notes: e.target.value })}
                        placeholder="Add notes about this test result..."
                        className="min-h-[60px] text-sm"
                      />
                    </div>

                    {(result.image_url || result.video_url) && (
                      <div>
                        <label className="text-xs font-medium">Generated Content</label>
                        {result.image_url && (
                          <img 
                            src={result.image_url} 
                            alt="Generated test image"
                            className="max-w-xs rounded border"
                          />
                        )}
                        {result.video_url && (
                          <video 
                            src={result.video_url} 
                            controls
                            className="max-w-xs rounded border"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testing Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Quality by Tier</h3>
                  <div className="space-y-2">
                    {['artistic', 'explicit', 'unrestricted'].map(tier => {
                      const tierResults = testResults.filter(r => r.test_tier === tier);
                      const avgQuality = tierResults.length > 0 
                        ? tierResults.reduce((sum, r) => sum + r.overall_quality, 0) / tierResults.length 
                        : 0;
                      return (
                        <div key={tier} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{tier}</span>
                          <span className={`text-sm font-medium ${getQualityColor(Math.round(avgQuality))}`}>
                            {avgQuality.toFixed(1)}/10
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Model Performance</h3>
                  <div className="space-y-2">
                    {['SDXL', 'WAN'].map(model => {
                      const modelResults = testResults.filter(r => r.model_type === model);
                      const avgQuality = modelResults.length > 0 
                        ? modelResults.reduce((sum, r) => sum + r.overall_quality, 0) / modelResults.length 
                        : 0;
                      return (
                        <div key={model} className="flex items-center justify-between">
                          <span className="text-sm">{model}</span>
                          <span className={`text-sm font-medium ${getQualityColor(Math.round(avgQuality))}`}>
                            {avgQuality.toFixed(1)}/10
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Series Progress</h3>
                  <div className="space-y-2">
                    {getCurrentTestSeries().map(series => {
                      const seriesResults = testResults.filter(r => r.test_series === series.id);
                      const completed = seriesResults.length;
                      const total = 3; // 3 tiers per series
                      const percentage = (completed / total) * 100;
                      return (
                        <div key={series.id}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{series.name}</span>
                            <span>{completed}/{total}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 